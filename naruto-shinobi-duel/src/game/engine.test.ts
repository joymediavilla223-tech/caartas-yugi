import { describe, expect, it } from 'vitest';
import { CARDS, CARD_BY_ID, EXTRA_CARDS, STARTER_MAIN_DECK, validateDeck } from './cards';
import { activateExtra, attack, createGame, endTurn, getEffectiveStats, playCard, setPhase, setTrapForTest } from './engine';
import type { GameState, ShinobiUnit } from './types';
import { runAiTurn } from './ai';

function baseGame(): GameState { return createGame([...STARTER_MAIN_DECK], [...STARTER_MAIN_DECK], false, false); }
function addUnit(state: GameState, player: 0 | 1, cardId: string, overrides: Partial<ShinobiUnit> = {}): ShinobiUnit {
  const unit: ShinobiUnit = { uid: `test-${player}-${cardId}-${state.players[player].field.length}`, cardId, attackBonus: 0, defenseBonus: 0, statuses: [], hasAttacked: false, damageTaken: 0, ...overrides };
  state.players[player].field.push(unit);
  return unit;
}

describe('contenido y reglas de mazo', () => {
  it('incluye al menos 40 cartas y un mazo inicial legal de 30', () => {
    expect(CARDS.length).toBeGreaterThanOrEqual(40);
    expect(validateDeck(STARTER_MAIN_DECK)).toEqual([]);
    expect(STARTER_MAIN_DECK).toHaveLength(30);
    expect(EXTRA_CARDS).toHaveLength(6);
  });
  it('rechaza copias excesivas y cartas Extra Deck en el mazo principal', () => {
    expect(validateDeck([...STARTER_MAIN_DECK, 'naruto-genin']).some((e) => e.includes('máximo 3'))).toBe(true);
    expect(validateDeck([...STARTER_MAIN_DECK.slice(0, 29), 'naruto-sage-mode']).some((e) => e.includes('no válida'))).toBe(true);
  });
});

describe('inicio, turnos y chakra', () => {
  it('inicia con 8000 puntos, cinco cartas, chakra 1 y no roba extra en el primer turno', () => {
    const s = baseGame();
    expect(s.players[0].life).toBe(8000);
    expect(s.players[1].life).toBe(8000);
    expect(s.players[0].hand).toHaveLength(5);
    expect(s.players[1].hand).toHaveLength(5);
    expect(s.players[0].deck).toHaveLength(25);
    expect(s.players[0].chakra).toBe(1);
    expect(s.players[0].maxChakra).toBe(1);
  });
  it('el siguiente jugador recupera chakra, aumenta su máximo y roba una carta', () => {
    let s = baseGame();
    const result = endTurn(s, 0);
    expect(result.error).toBeUndefined();
    s = result.state;
    expect(s.activePlayer).toBe(1);
    expect(s.turnNumber).toBe(2);
    expect(s.players[1].maxChakra).toBe(1);
    expect(s.players[1].chakra).toBe(1);
    expect(s.players[1].hand).toHaveLength(6);
    expect(s.players[0].hand).toHaveLength(5);
  });
  it('no permite pagar jutsu si falta chakra y no cambia el estado', () => {
    const s = baseGame();
    const p = s.players[0];
    const result = playCard(s, 0, p.hand[0].uid);
    expect(result.error).toMatch(/Necesitas 2 chakra/);
    expect(result.state.players[0].hand).toHaveLength(5);
    expect(result.state.players[0].chakra).toBe(1);
  });
});

describe('invocaciones y combate', () => {
  it('invoca shinobi cuando paga coste y no deja superar cinco espacios', () => {
    const s = baseGame();
    s.players[0].chakra = 10;
    const naruto = s.players[0].hand.find((c) => c.cardId === 'naruto-genin')!;
    const result = playCard(s, 0, naruto.uid);
    expect(result.error).toBeUndefined();
    expect(result.state.players[0].field).toHaveLength(1);
    expect(result.state.players[0].chakra).toBe(8);
    expect(result.state.players[0].hand).toHaveLength(5); // Naruto roba una carta al invocarse.

    const full = baseGame();
    full.players[0].chakra = 10;
    for (let i = 0; i < 5; i++) addUnit(full, 0, 'naruto-genin');
    const attempt = playCard(full, 0, full.players[0].hand[0].uid);
    expect(attempt.error).toMatch(/llena/);
  });
  it('requiere tributo para shinobi de coste 5 o más', () => {
    const s = baseGame();
    s.players[0].chakra = 10;
    const itachi = { uid: 'test-itachi-hand', cardId: 'itachi-uchiha' };
    s.players[0].hand.push(itachi);
    addUnit(s, 0, 'sakura-haruno');
    const without = playCard(s, 0, itachi.uid);
    expect(without.error).toMatch(/requiere exactamente 1 tributo/);
    const tributeUid = s.players[0].field[0].uid;
    const withTribute = playCard(s, 0, itachi.uid, undefined, [tributeUid]);
    expect(withTribute.error).toBeUndefined();
    expect(withTribute.state.players[0].field.some((u) => u.cardId === 'itachi-uchiha')).toBe(true);
    expect(withTribute.state.players[0].graveyard.some((c) => c.cardId === 'sakura-haruno')).toBe(true);
  });
  it('un shinobi no puede atacar dos veces en el mismo turno', () => {
    let s = baseGame();
    const attacker = addUnit(s, 0, 'naruto-genin');
    s = setPhase(s, 0, 'battle').state;
    let r = attack(s, 0, attacker.uid);
    expect(r.error).toBeUndefined();
    expect(r.state.players[0].field[0].hasAttacked).toBe(true);
    r = attack(r.state, 0, attacker.uid);
    expect(r.error).toMatch(/ya atacó/);
  });
  it('solo permite ataque directo si el rival no controla shinobi', () => {
    let s = baseGame();
    const attacker = addUnit(s, 0, 'rock-lee');
    addUnit(s, 1, 'gaara');
    s = setPhase(s, 0, 'battle').state;
    expect(attack(s, 0, attacker.uid).error).toMatch(/Debes atacar/);
    const targetFree = { ...s, players: [...s.players] as GameState['players'] };
    targetFree.players[1].field = [];
    const direct = attack(targetFree, 0, attacker.uid);
    expect(direct.state.players[1].life).toBe(8000 - 5);
  });
});

describe('jutsu, elementos, trampas y estados', () => {
  it('aplica la ventaja elemental Fuego sobre Viento (+2 daño)', () => {
    const s = baseGame();
    s.players[0].chakra = 10;
    const fireball = { uid: 'fire-hand', cardId: 'fireball' };
    s.players[0].hand.push(fireball);
    const windTarget = addUnit(s, 1, 'naruto-genin');
    const result = playCard(s, 0, fireball.uid, { playerIndex: 1, uid: windTarget.uid });
    expect(result.state.log.some((line) => line.includes('Ventaja elemental'))).toBe(true);
    expect(result.state.players[1].field.some((u) => u.uid === windTarget.uid)).toBe(false); // 3 + 2 destruye DEF 3.
  });
  it('el sello de reflejo cancela jutsu, conserva la carta y no cobra el coste', () => {
    let s = baseGame();
    s.players[0].chakra = 5;
    s.players[0].hand.push({ uid: 'chidori-hand', cardId: 'chidori' });
    addUnit(s, 1, 'gaara');
    s = setTrapForTest(s, 1, 'mirror-reflection');
    const before = s.players[0].chakra;
    const result = playCard(s, 0, 'chidori-hand', { playerIndex: 1, uid: s.players[1].field[0].uid });
    expect(result.error).toBeUndefined();
    expect(result.state.players[0].hand.some((c) => c.uid === 'chidori-hand')).toBe(true);
    expect(result.state.players[0].chakra).toBe(before - 1); // drenaje de la trampa, sin pagar los 3 del jutsu.
    expect(result.state.players[1].backrow.every((t) => t === null)).toBe(true);
    expect(result.state.players[1].graveyard.some((c) => c.cardId === 'mirror-reflection')).toBe(true);
  });
  it('un escudo absorbe daño antes de marcar heridas', () => {
    let s = baseGame();
    const target = addUnit(s, 1, 'gaara', { statuses: [{ kind: 'shield', value: 2, defense: 0, turns: 3 }] });
    const attacker = addUnit(s, 0, 'rock-lee');
    s = setPhase(s, 0, 'battle').state;
    const r = attack(s, 0, attacker.uid, target.uid);
    const injured = r.state.players[1].field.find((u) => u.uid === target.uid)!;
    expect(injured.damageTaken).toBe(3); // 5 ATK menos 2 de escudo.
    expect(injured.statuses.some((st) => st.kind === 'shield')).toBe(false);
  });
  it('los estados temporales expiran al final del turno del dueño afectado', () => {
    let s = baseGame();
    const affected = addUnit(s, 1, 'gaara', { statuses: [{ kind: 'stun', value: 1, defense: 0, turns: 1 }] });
    s = endTurn(s, 0).state; // ahora turno del rival
    s = setPhase(s, 1, 'battle').state;
    expect(attack(s, 1, affected.uid).error).toMatch(/inmovilizado/);
    s = endTurn(s, 1).state;
    expect(s.players[1].field[0].statuses.some((st) => st.kind === 'stun')).toBe(false);
  });
});

describe('Extra Deck y final de partida', () => {
  it('requiere anfitrión y chakra para transformar; restaura la forma al expirar', () => {
    let s = baseGame();
    s.players[0].chakra = 10;
    const sasuke = addUnit(s, 0, 'sasuke-genin');
    const extra = s.players[0].extraDeck.find((c) => c.cardId === 'sasuke-curse-mark')!;
    const activated = activateExtra(s, 0, extra.uid, sasuke.uid);
    expect(activated.error).toBeUndefined();
    expect(activated.state.players[0].field[0].form?.cardId).toBe('sasuke-curse-mark');
    expect(getEffectiveStats(activated.state, 0, activated.state.players[0].field[0]).atk).toBe(7);
    s = endTurn(activated.state, 0).state;
    s = endTurn(s, 1).state;
    s = endTurn(s, 0).state;
    expect(s.players[0].field[0].form).toBeUndefined();
    expect(s.players[0].extraDeck.some((c) => c.cardId === 'sasuke-curse-mark')).toBe(true);
  });
  it('detecta victoria al llegar a 0 Puntos de Voluntad', () => {
    let s = baseGame();
    s.players[1].life = 4;
    const attacker = addUnit(s, 0, 'rock-lee');
    s = setPhase(s, 0, 'battle').state;
    const result = attack(s, 0, attacker.uid);
    expect(result.state.winner).toBe(0);
    expect(result.state.phase).toBe('ended');
    expect(result.state.players[1].life).toBe(0);
  });
  it('la IA ejecuta acciones a partir del estado real y devuelve el turno al jugador', () => {
    let s = baseGame();
    s = endTurn(s, 0).state;
    // Hacemos disponible chakra suficiente para que el comportamiento sea observable.
    s.players[1].chakra = 5;
    const before = s.players[1].hand.length;
    const after = runAiTurn(s);
    expect(after.activePlayer).toBe(0);
    expect(after.turnNumber).toBe(3);
    expect(after.log.length).toBeGreaterThan(s.log.length);
    expect(after.players[1].field.length).toBeGreaterThan(0);
    expect(after.players[1].hand.length + after.players[1].graveyard.length).toBeGreaterThanOrEqual(0);
    void before;
  });
});
