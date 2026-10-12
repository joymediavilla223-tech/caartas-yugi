import { CARD_BY_ID, EXTRA_CARDS, STARTER_MAIN_DECK, validateDeck } from './cards';
import type { ActionResult, CardDef, CardInstance, EffectDef, GameState, PlayerState, SetTrap, ShinobiUnit, TargetRef, TrapTrigger } from './types';
import { MAX_BACKROW, MAX_COPIES, MAX_FIELD, MAX_LIFE, MAX_CHAKRA } from './types';

let uidCounter = 0;
function uid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${uidCounter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
const clone = (state: GameState): GameState => structuredClone(state);
const capLog = (state: GameState, message: string) => { state.log.push(message); if (state.log.length > 60) state.log.splice(0, state.log.length - 60); };
const other = (playerIndex: 0 | 1): 0 | 1 => playerIndex === 0 ? 1 : 0;
const cardOf = (unit: ShinobiUnit): CardDef => CARD_BY_ID[unit.form?.cardId ?? unit.cardId];
const instance = (cardId: string): CardInstance => ({ uid: uid('card'), cardId });
function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function makePlayer(id: 0 | 1, name: string, isAI: boolean, deckIds: string[], extraIds: string[] = EXTRA_CARDS.map((c) => c.id), shouldShuffle = true): PlayerState {
  const sourceDeck = deckIds.map(instance);
  const sourceExtra = extraIds.map(instance);
  const deck = shouldShuffle ? shuffle(sourceDeck) : sourceDeck;
  const hand = deck.splice(0, 5);
  return { id, name, isAI, life: MAX_LIFE, chakra: 0, maxChakra: 0, deck, hand, field: [], backrow: [null, null, null], graveyard: [], extraDeck: sourceExtra, extraGraveyard: [] };
}

export function createGame(playerDeck: string[] = STARTER_MAIN_DECK, aiDeck: string[] = STARTER_MAIN_DECK, tutorialMode = false, shouldShuffle = true, playerExtraDeck?: string[], aiExtraDeck?: string[]): GameState {
  const playerExtras = playerExtraDeck ?? EXTRA_CARDS.map((c) => c.id);
  const aiExtras = aiExtraDeck ?? EXTRA_CARDS.map((c) => c.id);
  const validation = validateDeck(playerDeck, playerExtras);
  if (validation.length) throw new Error(validation.join(' '));
  const aiValidation = validateDeck(aiDeck, aiExtras);
  if (aiValidation.length) throw new Error(aiValidation.join(' '));
  const state: GameState = {
    players: [makePlayer(0, 'Tú', false, playerDeck, playerExtras, shouldShuffle), makePlayer(1, 'Rival shinobi', true, aiDeck, aiExtras, shouldShuffle)],
    activePlayer: 0, turnNumber: 1, phase: 'main', firstTurnNoDraw: true, winner: null,
    log: ['¡El duelo comienza! Ambos jugadores roban 5 cartas. El primer jugador no roba en su primer turno.'],
    actionSerial: 0, tutorialMode,
  };
  beginTurn(state, 0, true);
  capLog(state, `Turno 1: ${state.players[0].name} dispone de ${state.players[0].chakra} chakra.`);
  return state;
}

function beginTurn(state: GameState, playerIndex: 0 | 1, first = false): void {
  const p = state.players[playerIndex];
  p.maxChakra = Math.min(MAX_CHAKRA, p.maxChakra + 1);
  p.chakra = p.maxChakra;
  p.field.forEach((u) => { u.hasAttacked = false; });
  if (!first && !(state.firstTurnNoDraw && state.turnNumber === 1)) drawCardsMutable(state, playerIndex, 1);
  state.activePlayer = playerIndex;
  state.phase = 'main';
}

function endGameIfNeeded(state: GameState): void {
  const a = state.players[0], b = state.players[1];
  if (a.life <= 0 && b.life <= 0) { state.winner = 'draw'; state.phase = 'ended'; capLog(state, 'Los dos combatientes llegan a 0 Puntos de Voluntad: empate.'); }
  else if (a.life <= 0) { a.life = 0; state.winner = 1; state.phase = 'ended'; capLog(state, `${b.name} gana el duelo.`); }
  else if (b.life <= 0) { b.life = 0; state.winner = 0; state.phase = 'ended'; capLog(state, `${a.name} gana el duelo.`); }
}

function drawCardsMutable(state: GameState, playerIndex: 0 | 1, count: number): void {
  const p = state.players[playerIndex];
  for (let i = 0; i < count; i++) {
    if (!p.deck.length) {
      p.life = 0;
      capLog(state, `${p.name} intenta robar sin cartas en el mazo y pierde por agotamiento.`);
      endGameIfNeeded(state);
      return;
    }
    p.hand.push(p.deck.shift()!);
  }
  if (count > 0) capLog(state, `${p.name} roba ${count} carta${count === 1 ? '' : 's'}.`);
}

export function drawCards(state: GameState, playerIndex: 0 | 1, count: number): ActionResult {
  const next = clone(state);
  if (!Number.isInteger(count) || count < 1 || count > 5) return { state, error: 'El robo debe ser de entre 1 y 5 cartas.' };
  if (next.winner !== null) return { state, error: 'La partida ya ha terminado.' };
  drawCardsMutable(next, playerIndex, count);
  endGameIfNeeded(next);
  return { state: next };
}

function currentTarget(state: GameState, owner: 0 | 1, rule: EffectDef['target'], explicit?: TargetRef, sourceUid?: string): TargetRef | undefined {
  const own = state.players[owner], enemyIndex = other(owner), enemy = state.players[enemyIndex];
  if (rule === 'ownPlayer') return undefined;
  if (rule === 'opponentPlayer') return undefined;
  if (rule === 'none') return undefined;
  if (rule === 'self' && sourceUid) return { playerIndex: owner, uid: sourceUid };
  if (explicit && state.players[explicit.playerIndex].field.some((u) => u.uid === explicit.uid)) {
    const belongs = explicit.playerIndex === owner;
    if (rule === 'enemy' && !belongs) return explicit;
    if (rule === 'ally' && belongs) return explicit;
    if (rule === 'selected') return explicit;
  }
  if (rule === 'self' && sourceUid) return { playerIndex: owner, uid: sourceUid };
  if (rule === 'ally') {
    const candidates = [...own.field].sort((a, b) => getEffectiveStats(state, owner, a).atk - getEffectiveStats(state, owner, b).atk);
    return candidates[0] ? { playerIndex: owner, uid: candidates[0].uid } : undefined;
  }
  if (rule === 'enemy' || rule === 'selected') {
    const candidates = [...enemy.field].sort((a, b) => getEffectiveStats(state, enemyIndex, b).atk - getEffectiveStats(state, enemyIndex, a).atk);
    if (candidates[0]) return { playerIndex: enemyIndex, uid: candidates[0].uid };
    return undefined;
  }
  return undefined;
}

export function getEffectiveStats(state: GameState, playerIndex: 0 | 1, unit: ShinobiUnit): { atk: number; def: number } {
  const card = cardOf(unit);
  const baseAtk = card.atk ?? 0, baseDef = card.def ?? 0;
  let atk = baseAtk + unit.attackBonus;
  let def = baseDef + unit.defenseBonus;
  for (const status of unit.statuses) {
    if (status.kind === 'buff') { atk += status.value; def += status.defense; }
    if (status.kind === 'debuff' || status.kind === 'weaken') { atk -= status.value; def -= status.defense; }
  }
  for (const status of unit.statuses) if (status.kind === 'shield') { /* los escudos absorben daño, no alteran DEF */ }
  const own = state.players[playerIndex];
  if (card.synergy) {
    const { by, minimum = 1, atk: plusAtk = 0, def: plusDef = 0 } = card.synergy;
    const value = by === 'team' ? card.team : by === 'clan' ? card.clan : card.village;
    if (value) {
      const allies = own.field.filter((otherUnit) => otherUnit.uid !== unit.uid && (() => {
        const otherCard = cardOf(otherUnit);
        const otherValue = by === 'team' ? otherCard.team : by === 'clan' ? otherCard.clan : otherCard.village;
        return otherValue === value;
      })()).length;
      if (allies >= minimum) { atk += plusAtk; def += plusDef; }
    }
  }
  if (state.activeField) {
    const field = CARD_BY_ID[state.activeField.cardId]?.fieldBonus;
    if (field) {
      const pass = (!field.team || card.team === field.team) && (!field.clan || field.clan.includes(card.clan ?? '')) && (!field.village || card.village === field.village) && (field.maxCost === undefined || card.cost <= field.maxCost);
      if (pass) { atk += field.atk ?? 0; def += field.def ?? 0; }
    }
  }
  return { atk: Math.max(0, atk), def: Math.max(1, def) };
}

function findUnit(state: GameState, ref: TargetRef): ShinobiUnit | undefined {
  return state.players[ref.playerIndex].field.find((u) => u.uid === ref.uid);
}
function setFx(state: GameState, kind: GameState['fx'] extends infer T ? T extends {kind: infer K} ? K : never : never, targetUid?: string): void {
  state.actionSerial += 1;
  state.fx = { kind: kind as GameState['fx'] extends infer T ? T extends {kind: infer K} ? K : never : never, targetUid, serial: state.actionSerial };
}

function moveUnitToGrave(state: GameState, playerIndex: 0 | 1, unit: ShinobiUnit, reason: string): void {
  const p = state.players[playerIndex];
  p.field = p.field.filter((u) => u.uid !== unit.uid);
  if (CARD_BY_ID[unit.cardId]?.type === 'extra') p.extraGraveyard.push({ uid: unit.uid, cardId: unit.cardId });
  else p.graveyard.push({ uid: unit.uid, cardId: unit.cardId });
  if (unit.form) p.extraGraveyard.push({ uid: unit.form.uid, cardId: unit.form.cardId });
  capLog(state, `${CARD_BY_ID[unit.cardId]?.name ?? unit.cardId} va al cementerio${reason ? ` (${reason})` : ''}.`);
  setFx(state, 'destroy', unit.uid);
}

function dealDamageToUnit(state: GameState, target: TargetRef, amount: number, overflowToPlayer = false): void {
  const unit = findUnit(state, target);
  if (!unit || amount <= 0) return;
  const p = state.players[target.playerIndex];
  let remaining = Math.floor(amount);
  const shield = unit.statuses.find((s) => s.kind === 'shield' && s.value > 0);
  if (shield) {
    const absorbed = Math.min(remaining, shield.value);
    shield.value -= absorbed;
    remaining -= absorbed;
    if (shield.value <= 0) unit.statuses = unit.statuses.filter((s) => s !== shield);
    if (absorbed) capLog(state, `${CARD_BY_ID[unit.cardId]?.name} absorbe ${absorbed} daño con su escudo.`);
  }
  if (remaining <= 0) return;
  unit.damageTaken += remaining;
  const durability = getEffectiveStats(state, target.playerIndex, unit).def;
  capLog(state, `${CARD_BY_ID[unit.cardId]?.name ?? 'Shinobi'} recibe ${remaining} daño (${Math.min(unit.damageTaken, durability)}/${durability} de resistencia).`);
  if (unit.damageTaken >= durability) {
    const excess = unit.damageTaken - durability;
    moveUnitToGrave(state, target.playerIndex, unit, 'destruido por daño');
    if (overflowToPlayer && excess > 0) {
      p.life -= excess;
      capLog(state, `El daño excedente inflige ${excess} Puntos de Voluntad.`);
    }
  }
  setFx(state, 'damage', target.uid);
  endGameIfNeeded(state);
}

function resolveEffect(state: GameState, owner: 0 | 1, effect: EffectDef, explicit?: TargetRef, sourceUid?: string, cardElement?: CardDef['jutsuElement']): void {
  const own = state.players[owner], enemyIndex = other(owner), enemy = state.players[enemyIndex];
  const chosen = currentTarget(state, owner, effect.target, explicit, sourceUid);
  const value = effect.value ?? 0;
  switch (effect.kind) {
    case 'damage': {
      if (effect.target === 'opponentPlayer') { enemy.life -= value; capLog(state, `${enemy.name} pierde ${value} Puntos de Voluntad.`); break; }
      if (effect.target === 'ownPlayer') { own.life -= value; capLog(state, `${own.name} pierde ${value} Puntos de Voluntad.`); break; }
      if (!chosen && effect.target === 'enemy') { enemy.life -= value; capLog(state, `Sin shinobi enemigo, ${effect.text.replace(/^Inflige /, 'el efecto inflige ')}`); break; }
      if (chosen) {
        let damage = value;
        if (cardElement) {
          const targetCard = cardOf(findUnit(state, chosen)!);
          const defendingElement = targetCard.natures?.[0];
          const beats: Record<string, string> = { Fire: 'Wind', Wind: 'Lightning', Lightning: 'Earth', Earth: 'Water', Water: 'Fire' };
          if (defendingElement && beats[cardElement] === defendingElement) { damage += 2; capLog(state, `Ventaja elemental: ${cardElement} supera a ${defendingElement} (+2 daño).`); }
          else if (defendingElement && beats[defendingElement] === cardElement) { damage = Math.max(0, damage - 2); capLog(state, `Desventaja elemental: ${defendingElement} supera a ${cardElement} (−2 daño).`); }
        }
        dealDamageToUnit(state, chosen, damage, false);
      }
      break;
    }
    case 'heal': {
      const p = effect.target === 'opponentPlayer' ? enemy : own;
      const actual = Math.min(value, MAX_LIFE - p.life);
      p.life += actual;
      capLog(state, `${p.name} recupera ${actual} Puntos de Voluntad.`);
      break;
    }
    case 'buff': case 'debuff': case 'weaken': {
      if (!chosen) break;
      const unit = findUnit(state, chosen)!;
      unit.statuses.push({ kind: effect.kind === 'buff' ? 'buff' : effect.kind === 'debuff' ? 'debuff' : 'weaken', value, defense: effect.defense ?? 0, turns: effect.turns ?? 1 });
      capLog(state, `${CARD_BY_ID[unit.cardId]?.name} ${effect.kind === 'buff' ? 'recibe una mejora' : 'queda debilitado'} durante ${effect.turns ?? 1} turno(s).`);
      break;
    }
    case 'stun': {
      if (!chosen) break;
      const unit = findUnit(state, chosen)!;
      unit.statuses.push({ kind: 'stun', value: 1, defense: 0, turns: effect.turns ?? 1 });
      capLog(state, `${CARD_BY_ID[unit.cardId]?.name} queda inmovilizado.`);
      break;
    }
    case 'shield': {
      if (!chosen) break;
      const unit = findUnit(state, chosen)!;
      const current = unit.statuses.find((s) => s.kind === 'shield');
      if (current) current.value += value;
      else unit.statuses.push({ kind: 'shield', value, defense: 0, turns: effect.turns ?? 3 });
      capLog(state, `${CARD_BY_ID[unit.cardId]?.name} obtiene un escudo de ${value}.`);
      break;
    }
    case 'draw': drawCardsMutable(state, effect.target === 'opponentPlayer' ? enemyIndex : owner, value || effect.count || 1); break;
    case 'chakra': {
      const p = effect.target === 'opponentPlayer' ? enemy : own;
      if (effect.target === 'opponentPlayer') {
        const lost = Math.min(p.chakra, value);
        p.chakra -= lost;
        capLog(state, `${p.name} pierde ${lost} chakra disponible.`);
      } else {
        const recovered = Math.min(value, p.maxChakra - p.chakra);
        p.chakra += recovered;
        capLog(state, `${p.name} recupera ${recovered} chakra.`);
      }
      break;
    }
    case 'destroy': {
      if (chosen) { const targetUnit = findUnit(state, chosen); if (targetUnit) moveUnitToGrave(state, chosen.playerIndex, targetUnit, 'efecto'); }
      break;
    }
  }
  endGameIfNeeded(state);
}

function resolveEffects(state: GameState, owner: 0 | 1, card: CardDef, explicit?: TargetRef, sourceUid?: string): void {
  for (const effect of card.effects ?? []) {
    resolveEffect(state, owner, effect, explicit, sourceUid, card.jutsuElement);
    if (state.winner !== null) break;
  }
}

interface TriggerContext { trigger: TrapTrigger; actor: 0 | 1; actorUnitUid?: string; targetUid?: string; }
function triggerTraps(state: GameState, context: TriggerContext): boolean {
  let canceled = false;
  // Cada trampa compatible se resuelve una sola vez, de la casilla izquierda a la derecha.
  for (const trapOwner of [other(context.actor)] as (0 | 1)[]) {
    const p = state.players[trapOwner];
    for (let i = 0; i < p.backrow.length; i++) {
      const trap = p.backrow[i];
      if (!trap) continue;
      const card = CARD_BY_ID[trap.cardId];
      if (card.type !== 'trap' || card.trigger !== context.trigger) continue;
      p.backrow[i] = null;
      p.graveyard.push({ uid: trap.uid, cardId: trap.cardId });
      capLog(state, `Se activa la trampa ${card.name}.`);
      if (card.counterAction) canceled = true;
      const explicit: TargetRef | undefined = context.actorUnitUid ? { playerIndex: context.actor, uid: context.actorUnitUid } : undefined;
      resolveEffects(state, trapOwner, card, explicit);
      if (state.winner !== null) return true;
    }
  }
  return canceled;
}

function error(state: GameState, message: string): ActionResult { return { state, error: message }; }
function checkActor(state: GameState, playerIndex: 0 | 1): string | undefined {
  if (state.winner !== null || state.phase === 'ended') return 'La partida ya ha terminado.';
  if (state.activePlayer !== playerIndex) return 'No es el turno de este jugador.';
  return undefined;
}

export function playCard(state: GameState, playerIndex: 0 | 1, handUid: string, target?: TargetRef, tributeUids: string[] = []): ActionResult {
  const problem = checkActor(state, playerIndex); if (problem) return error(state, problem);
  const next = clone(state), player = next.players[playerIndex];
  const handIndex = player.hand.findIndex((c) => c.uid === handUid);
  if (handIndex < 0) return error(state, 'Esa carta ya no está en tu mano.');
  const card = CARD_BY_ID[player.hand[handIndex].cardId];
  if (!card) return error(state, 'La carta no existe en la colección.');
  if (card.cost > player.chakra) return error(state, `Necesitas ${card.cost} chakra; solo tienes ${player.chakra}.`);

  if (card.type === 'shinobi') {
    const tributesRequired = card.cost >= 7 ? 2 : card.cost >= 5 ? 1 : 0;
    const chosenTributes = [...new Set(tributeUids)];
    if (chosenTributes.length !== tributesRequired) return error(state, tributesRequired ? `Esta invocación requiere exactamente ${tributesRequired} tributo(s). Selecciónalos en tu campo.` : 'Esta carta no requiere tributos.');
    if (chosenTributes.some((id) => !player.field.some((u) => u.uid === id))) return error(state, 'Los tributos deben ser shinobi de tu propio campo.');
    if (player.field.length - chosenTributes.length >= MAX_FIELD) return error(state, 'Tu zona de shinobi seguiría llena después de los tributos (máximo 5).');
    if (next.phase !== 'main') return error(state, 'Las invocaciones normales solo pueden hacerse en la fase principal.');
    if (triggerTraps(next, { trigger: 'summon', actor: playerIndex })) {
      capLog(next, `${card.name} no se invoca por una trampa; la carta y el chakra se conservan.`);
      return { state: next };
    }
    for (const tributeUid of chosenTributes) {
      const unit = player.field.find((u) => u.uid === tributeUid)!;
      moveUnitToGrave(next, playerIndex, unit, 'tributo');
    }
    player.chakra -= card.cost;
    const played = player.hand.splice(handIndex, 1)[0];
    const unit: ShinobiUnit = { uid: uid('unit'), cardId: card.id, attackBonus: 0, defenseBonus: 0, statuses: [], hasAttacked: false, damageTaken: 0 };
    player.field.push(unit);
    capLog(next, `${player.name} invoca a ${card.name} (${card.cost} chakra).`);
    setFx(next, 'summon', unit.uid);
    resolveEffects(next, playerIndex, card, target, unit.uid);
    if (next.winner === null) player.graveyard; // mantiene explícito que la carta permanece en campo como unidad.
    void played;
    return { state: next };
  }

  if (card.type === 'jutsu') {
    if (triggerTraps(next, { trigger: 'jutsu', actor: playerIndex })) {
      capLog(next, `${card.name} queda cancelado; se conserva en la mano y no consume chakra.`);
      return { state: next };
    }
    player.chakra -= card.cost;
    const used = player.hand.splice(handIndex, 1)[0];
    capLog(next, `${player.name} utiliza ${card.name} (${card.cost} chakra).`);
    setFx(next, 'jutsu', target?.uid);
    resolveEffects(next, playerIndex, card, target);
    player.graveyard.push(used);
    return { state: next };
  }

  if (card.type === 'trap') {
    if (next.phase !== 'main') return error(state, 'Solo puedes colocar trampas en la fase principal.');
    const slot = player.backrow.findIndex((x) => x === null);
    if (slot < 0) return error(state, 'La zona de sellos y trampas está llena (máximo 3).');
    player.chakra -= card.cost;
    const used = player.hand.splice(handIndex, 1)[0];
    player.backrow[slot] = { uid: used.uid, cardId: used.cardId, placedTurn: next.turnNumber };
    capLog(next, `${player.name} coloca una trampa boca abajo.`);
    return { state: next };
  }

  if (card.type === 'field') {
    if (next.phase !== 'main') return error(state, 'Solo puedes cambiar el campo en la fase principal.');
    player.chakra -= card.cost;
    const used = player.hand.splice(handIndex, 1)[0];
    if (next.activeField) {
      next.players[next.activeField.owner].graveyard.push({ uid: next.activeField.uid, cardId: next.activeField.cardId });
      capLog(next, `${CARD_BY_ID[next.activeField.cardId].name} sale del campo y va al cementerio.`);
    }
    next.activeField = { cardId: card.id, owner: playerIndex, uid: used.uid };
    capLog(next, `${player.name} activa el campo ${card.name}.`);
    return { state: next };
  }
  return error(state, 'Esta carta pertenece al Extra Deck y no puede jugarse desde la mano.');
}

export function activateExtra(state: GameState, playerIndex: 0 | 1, extraUid: string, hostUid?: string): ActionResult {
  const problem = checkActor(state, playerIndex); if (problem) return error(state, problem);
  if (state.phase !== 'main') return error(state, 'Las cartas del Extra Deck solo pueden activarse en la fase principal.');
  const next = clone(state), p = next.players[playerIndex];
  const index = p.extraDeck.findIndex((c) => c.uid === extraUid);
  if (index < 0) return error(state, 'Esa carta no está disponible en el Extra Deck.');
  const inst = p.extraDeck[index], card = CARD_BY_ID[inst.cardId];
  if (card.type !== 'extra') return error(state, 'Carta inválida para el Extra Deck.');
  if (card.cost > p.chakra) return error(state, `Necesitas ${card.cost} chakra; solo tienes ${p.chakra}.`);
  let host = hostUid ? p.field.find((u) => u.uid === hostUid) : undefined;
  if (!host) host = p.field.find((u) => card.requiredHostIds?.includes(u.cardId));
  if (!host || !card.requiredHostIds?.includes(host.cardId)) return error(state, `${card.name} requiere tener en el campo: ${(card.requiredHostIds ?? []).map((id) => CARD_BY_ID[id]?.name ?? id).join(' o ')}.`);
  if (card.extraKind === 'summon' && p.field.length >= MAX_FIELD) return error(state, 'No hay espacio libre para la invocación especial.');
  if (card.extraKind === 'transform' && host.form) return error(state, 'Ese shinobi ya está transformado.');
  if (triggerTraps(next, { trigger: 'summon', actor: playerIndex })) {
    capLog(next, `${card.name} queda cancelado por una trampa; no se consume chakra ni sale del Extra Deck.`);
    return { state: next };
  }
  p.chakra -= card.cost;
  p.extraDeck.splice(index, 1);
  if (card.extraKind === 'transform') {
    host.form = { cardId: card.id, uid: inst.uid, turnsRemaining: card.duration ?? 2, expiresDestroysHost: card.expiresDestroysHost };
    capLog(next, `${CARD_BY_ID[host.cardId].name} adopta ${card.name} durante ${host.form.turnsRemaining} turno(s).`);
    setFx(next, 'transform', host.uid);
  } else {
    const unit: ShinobiUnit = { uid: uid('summon'), cardId: card.id, attackBonus: 0, defenseBonus: 0, statuses: [], hasAttacked: false, damageTaken: 0 };
    p.field.push(unit);
    capLog(next, `${card.name} entra en el campo como invocación especial.`);
    setFx(next, 'summon', unit.uid);
    resolveEffects(next, playerIndex, card, undefined, unit.uid);
  }
  return { state: next };
}

export function attack(state: GameState, playerIndex: 0 | 1, attackerUid: string, targetUid?: string): ActionResult {
  const problem = checkActor(state, playerIndex); if (problem) return error(state, problem);
  const next = clone(state), player = next.players[playerIndex], enemyIndex = other(playerIndex), enemy = next.players[enemyIndex];
  if (next.phase !== 'battle') return error(state, 'Solo puedes atacar durante la fase de combate.');
  const attacker = player.field.find((u) => u.uid === attackerUid);
  if (!attacker) return error(state, 'El atacante ya no está en tu campo.');
  if (attacker.hasAttacked) return error(state, 'Este shinobi ya atacó durante tu turno.');
  if (attacker.statuses.some((s) => s.kind === 'stun' && s.turns > 0)) return error(state, 'Este shinobi está inmovilizado y no puede atacar.');
  let target: ShinobiUnit | undefined;
  if (targetUid) {
    target = enemy.field.find((u) => u.uid === targetUid);
    if (!target) return error(state, 'El objetivo no es un shinobi enemigo válido.');
  } else if (enemy.field.length) return error(state, 'Debes atacar a un shinobi mientras el rival controle alguno.');
  const stats = getEffectiveStats(next, playerIndex, attacker);
  attacker.hasAttacked = true; // un ataque negado también consume el ataque de ese shinobi.
  capLog(next, `${CARD_BY_ID[attacker.cardId]?.name ?? cardOf(attacker).name} declara un ataque.`);
  if (triggerTraps(next, { trigger: 'attack', actor: playerIndex, actorUnitUid: attacker.uid })) {
    capLog(next, 'El ataque queda cancelado.');
    return { state: next };
  }
  if (target) {
    dealDamageToUnit(next, { playerIndex: enemyIndex, uid: target.uid }, stats.atk, true);
    setFx(next, 'attack', target.uid);
  } else {
    enemy.life -= stats.atk;
    capLog(next, `Ataque directo: ${enemy.name} pierde ${stats.atk} Puntos de Voluntad.`);
    setFx(next, 'attack', attacker.uid);
    endGameIfNeeded(next);
  }
  return { state: next };
}

function expireStatusesAndForms(state: GameState, playerIndex: 0 | 1): void {
  const p = state.players[playerIndex];
  for (const unit of [...p.field]) {
    unit.statuses = unit.statuses.map((s) => ({ ...s, turns: s.turns - 1 })).filter((s) => s.turns > 0 && (s.kind !== 'shield' || s.value > 0));
    if (!unit.form) continue;
    unit.form.turnsRemaining -= 1;
    if (unit.form.turnsRemaining > 0) continue;
    const form = unit.form;
    if (form.expiresDestroysHost) {
      capLog(state, `${CARD_BY_ID[form.cardId].name} termina; el anfitrión queda exhausto y es destruido.`);
      moveUnitToGrave(state, playerIndex, unit, 'agotamiento de transformación');
    } else {
      p.extraDeck.push({ uid: form.uid, cardId: form.cardId });
      unit.form = undefined;
      capLog(state, `${CARD_BY_ID[form.cardId].name} termina; el shinobi recupera su forma base y la carta vuelve al Extra Deck.`);
    }
  }
}

export function endTurn(state: GameState, playerIndex: 0 | 1): ActionResult {
  const problem = checkActor(state, playerIndex); if (problem) return error(state, problem);
  const next = clone(state);
  expireStatusesAndForms(next, playerIndex);
  if (next.winner !== null) return { state: next };
  const nextPlayer = other(playerIndex);
  next.turnNumber += 1;
  next.firstTurnNoDraw = false;
  beginTurn(next, nextPlayer, false);
  capLog(next, `Comienza el turno ${next.turnNumber}: ${next.players[nextPlayer].name} dispone de ${next.players[nextPlayer].chakra} chakra.`);
  return { state: next };
}

export function setPhase(state: GameState, playerIndex: 0 | 1, phase: 'main' | 'battle'): ActionResult {
  const problem = checkActor(state, playerIndex); if (problem) return error(state, problem);
  const next = clone(state);
  if (phase === 'battle') {
    next.phase = 'battle';
    capLog(next, `${next.players[playerIndex].name} pasa a la fase de combate.`);
  } else {
    if (next.phase === 'battle') return error(state, 'No se puede volver a la fase principal desde combate.');
    next.phase = 'main';
  }
  return { state: next };
}

export function setTrapForTest(state: GameState, playerIndex: 0 | 1, cardId: string): GameState {
  const next = clone(state), slot = next.players[playerIndex].backrow.findIndex((x) => x === null);
  if (slot >= 0) next.players[playerIndex].backrow[slot] = { uid: uid('trap'), cardId, placedTurn: next.turnNumber } as SetTrap;
  return next;
}

export function getUnitName(unit: ShinobiUnit): string { return CARD_BY_ID[unit.form?.cardId ?? unit.cardId]?.name ?? unit.cardId; }
export function hasWon(state: GameState): boolean { return state.winner !== null; }
export function validateMainDeck(deck: string[]): string[] { return validateDeck(deck); }
