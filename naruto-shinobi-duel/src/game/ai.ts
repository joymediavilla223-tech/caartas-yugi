import { CARD_BY_ID } from './cards';
import { activateExtra, attack, endTurn, getEffectiveStats, playCard, setPhase } from './engine';
import type { GameState, TargetRef } from './types';

function defaultTarget(state: GameState, playerIndex: 0 | 1, cardId: string): TargetRef | undefined {
  const card = CARD_BY_ID[cardId];
  const effect = card.effects?.find((e) => ['enemy', 'ally', 'selected', 'self'].includes(e.target));
  if (!effect) return undefined;
  if (effect.target === 'self') return undefined;
  if (effect.target === 'ally') {
    const p = state.players[playerIndex];
    const unit = [...p.field].sort((a, b) => getEffectiveStats(state, playerIndex, a).atk - getEffectiveStats(state, playerIndex, b).atk)[0];
    return unit ? { playerIndex, uid: unit.uid } : undefined;
  }
  if (effect.target === 'enemy' || effect.target === 'selected') {
    const enemyIndex = playerIndex === 0 ? 1 : 0;
    const unit = [...state.players[enemyIndex].field].sort((a, b) => getEffectiveStats(state, enemyIndex, b).atk - getEffectiveStats(state, enemyIndex, a).atk)[0];
    return unit ? { playerIndex: enemyIndex, uid: unit.uid } : undefined;
  }
  return undefined;
}

function scorePlay(state: GameState, uid: string): number {
  const p = state.players[1];
  const item = p.hand.find((c) => c.uid === uid);
  if (!item) return -Infinity;
  const card = CARD_BY_ID[item.cardId];
  if (card.cost > p.chakra) return -Infinity;
  if (card.type === 'shinobi') {
    const needs = card.cost >= 7 ? 2 : card.cost >= 5 ? 1 : 0;
    if (p.field.length >= 5 || p.field.length < needs) return -Infinity;
    const effectValue = (card.effects ?? []).reduce((n, e) => n + (({ damage: 3, stun: 4, draw: 2.5, heal: 2, shield: 2, chakra: 1.5, buff: 1.6, debuff: 2, destroy: 4, weaken: 1 } as Record<string, number>)[e.kind] ?? 0), 0);
    return 14 + (card.atk ?? 0) * 1.5 + (card.def ?? 0) + effectValue - card.cost * 0.8 - needs * 3;
  }
  if (card.type === 'jutsu') {
    const e = card.effects?.[0];
    if (!e) return -Infinity;
    if ((e.target === 'enemy' || e.target === 'selected') && p.field.length === 0 && state.players[0].field.length === 0) return -Infinity;
    let score = 5 + (e.value ?? 1) * 1.8 - card.cost * 0.55;
    if (e.kind === 'stun' && state.players[0].field.length) score += 5;
    if (e.kind === 'damage' && state.players[0].field.length) score += 3;
    if (e.kind === 'heal') score += p.life < 5500 ? 6 : 0;
    if (e.kind === 'draw') score += p.hand.length < 3 ? 5 : 1;
    if (e.kind === 'shield') score += p.field.length ? 3 : -1;
    return score;
  }
  if (card.type === 'trap') {
    if (p.backrow.every(Boolean)) return -Infinity;
    const enemyThreat = state.players[0].field.length;
    if (card.trigger === 'attack' && enemyThreat === 0) return 2.5 - card.cost;
    if (card.trigger === 'jutsu' && state.players[0].hand.length < 3) return 2 - card.cost;
    return 6 + enemyThreat * 1.2 - card.cost;
  }
  if (card.type === 'field') {
    if (state.activeField?.cardId === card.id) return -Infinity;
    return 5 + (p.field.filter((u) => {
      const definition = CARD_BY_ID[u.form?.cardId ?? u.cardId];
      return (card.fieldBonus?.team && definition.team === card.fieldBonus.team) || (card.fieldBonus?.clan && card.fieldBonus.clan.includes(definition.clan ?? ''));
    }).length * 2) - card.cost;
  }
  return -Infinity;
}

/** IA reactiva: puntúa las acciones legales a partir de mano, chakra, campo y amenazas. */
export function runAiTurn(input: GameState): GameState {
  let state = structuredClone(input);
  if (state.winner !== null || state.activePlayer !== 1) return state;
  let actions = 0;
  while (state.winner === null && state.activePlayer === 1 && actions < 10) {
    const candidates = state.players[1].hand.map((c) => ({ uid: c.uid, score: scorePlay(state, c.uid) })).sort((a, b) => b.score - a.score);
    const best = candidates[0];
    if (!best || best.score < 4) break;
    const handItem = state.players[1].hand.find((c) => c.uid === best.uid)!;
    const card = CARD_BY_ID[handItem.cardId];
    const needs = card.type === 'shinobi' ? (card.cost >= 7 ? 2 : card.cost >= 5 ? 1 : 0) : 0;
    const tributes = needs ? [...state.players[1].field].sort((a, b) => (CARD_BY_ID[a.cardId].atk ?? 0) + (CARD_BY_ID[a.cardId].def ?? 0) - ((CARD_BY_ID[b.cardId].atk ?? 0) + (CARD_BY_ID[b.cardId].def ?? 0))).slice(0, needs).map((u) => u.uid) : [];
    const result = playCard(state, 1, best.uid, defaultTarget(state, 1, handItem.cardId), tributes);
    if (result.error) break;
    state = result.state;
    actions += 1;
    if (state.winner !== null) return state;
  }

  // Intenta una forma especial si aporta más valor que reservar el chakra.
  if (state.winner === null && state.activePlayer === 1) {
    const p = state.players[1];
    const extras = p.extraDeck.map((x) => ({ ...x, card: CARD_BY_ID[x.cardId] })).sort((a, b) => (b.card.atk ?? 0) + (b.card.def ?? 0) - ((a.card.atk ?? 0) + (a.card.def ?? 0)));
    for (const extra of extras) {
      if (extra.card.cost > p.chakra) continue;
      const host = p.field.find((u) => extra.card.requiredHostIds?.includes(u.cardId) && (extra.card.extraKind !== 'transform' || !u.form));
      if (!host) continue;
      if (extra.card.extraKind === 'summon' && p.field.length >= 5) continue;
      const result = activateExtra(state, 1, extra.uid, host.uid);
      if (!result.error) { state = result.state; break; }
    }
  }

  if (state.winner === null && state.activePlayer === 1) {
    const phase = setPhase(state, 1, 'battle');
    if (!phase.error) state = phase.state;
    // Los atacantes priorizan eliminar un objetivo que puedan destruir; si no, golpean al más frágil.
    for (const unit of [...state.players[1].field]) {
      if (state.winner !== null) break;
      const liveAttacker = state.players[1].field.find((u) => u.uid === unit.uid);
      if (!liveAttacker || liveAttacker.hasAttacked || liveAttacker.statuses.some((s) => s.kind === 'stun' && s.turns > 0)) continue;
      const enemy = state.players[0];
      let targetUid: string | undefined;
      if (enemy.field.length) {
        const attackerPower = getEffectiveStats(state, 1, liveAttacker).atk;
        const targets = [...enemy.field].sort((a, b) => {
          const remainA = getEffectiveStats(state, 0, a).def - a.damageTaken;
          const remainB = getEffectiveStats(state, 0, b).def - b.damageTaken;
          const killA = attackerPower >= remainA ? 0 : 1;
          const killB = attackerPower >= remainB ? 0 : 1;
          return killA - killB || remainA - remainB;
        });
        targetUid = targets[0]?.uid;
      }
      const result = attack(state, 1, liveAttacker.uid, targetUid);
      if (!result.error) state = result.state;
    }
  }
  if (state.winner === null && state.activePlayer === 1) {
    const result = endTurn(state, 1);
    if (!result.error) state = result.state;
  }
  return state;
}
