import type { CardDef, EffectDef } from './types';

const e = (kind: EffectDef['kind'], target: EffectDef['target'], value: number, text: string, more: Partial<EffectDef> = {}): EffectDef => ({ kind, target, value, text, ...more });

// La información de rango, aldea, clan y organización está separada a propósito.
// Los bonos de equilibrio y los efectos jugables son decisiones de diseño, no afirmaciones del canon.
export const CARDS: CardDef[] = [
  { id: 'naruto-genin', name: 'Naruto Uzumaki', type: 'shinobi', cost: 2, rarity: 'Common', description: 'Al entrar, roba 1 carta. La persistencia también es una estrategia.', village: 'Konohagakure', clan: 'Uzumaki', team: 'Team 7', rank: 'Genin', natures: ['Wind'], atk: 3, def: 3, effects: [e('draw', 'ownPlayer', 1, 'Al invocarse: roba 1 carta.')], synergy: { by: 'team', atk: 1, def: 1, minimum: 1, text: 'Con otro integrante de Team 7: +1 ATK/+1 DEF.' }, tags: ['protagonista'] },
  { id: 'sasuke-genin', name: 'Sasuke Uchiha', type: 'shinobi', cost: 2, rarity: 'Common', description: 'Un atacante veloz del clan Uchiha.', village: 'Konohagakure', clan: 'Uchiha', team: 'Team 7', rank: 'Genin', natures: ['Lightning', 'Fire'], atk: 4, def: 2, effects: [e('buff', 'self', 1, 'Al invocarse: obtiene +1 ATK durante 2 turnos.', { turns: 2 })], synergy: { by: 'team', atk: 1, def: 1, minimum: 1, text: 'Con otro integrante de Team 7: +1 ATK/+1 DEF.' } },
  { id: 'sakura-haruno', name: 'Sakura Haruno', type: 'shinobi', cost: 1, rarity: 'Common', description: 'Apoyo eficiente para estabilizar una partida.', village: 'Konohagakure', team: 'Team 7', rank: 'Genin', atk: 2, def: 4, effects: [e('heal', 'ownPlayer', 2, 'Al invocarse: recupera 2 Puntos de Voluntad.')], synergy: { by: 'team', atk: 1, def: 1, minimum: 1, text: 'Con otro integrante de Team 7: +1 ATK/+1 DEF.' } },
  { id: 'kakashi-hatake', name: 'Kakashi Hatake', type: 'shinobi', cost: 4, rarity: 'Rare', description: 'Un jōnin versátil que puede adaptarse a varios enfrentamientos.', village: 'Konohagakure', clan: 'Hatake', team: 'Team 7', rank: 'Jonin', natures: ['Lightning', 'Earth', 'Water'], atk: 5, def: 5, effects: [e('chakra', 'ownPlayer', 1, 'Al invocarse: recupera 1 chakra, sin superar su máximo.')], synergy: { by: 'team', atk: 1, def: 1, minimum: 1, text: 'Con otro integrante de Team 7: +1 ATK/+1 DEF.' }, tags: ['Sharingan'] },
  { id: 'shikamaru-nara', name: 'Shikamaru Nara', type: 'shinobi', cost: 3, rarity: 'Uncommon', description: 'Especialista en frenar la amenaza más peligrosa.', village: 'Konohagakure', clan: 'Nara', team: 'Team 10', rank: 'Chunin', natures: ['Wind'], atk: 2, def: 5, effects: [e('stun', 'enemy', 1, 'Al invocarse: inmoviliza al enemigo más fuerte hasta el final de su próximo turno.', { turns: 1 })], synergy: { by: 'team', def: 1, minimum: 1, text: 'Con otro integrante de Team 10: +1 DEF.' } },
  { id: 'ino-yamanaka', name: 'Ino Yamanaka', type: 'shinobi', cost: 2, rarity: 'Common', description: 'Apoyo táctico que debilita al rival.', village: 'Konohagakure', clan: 'Yamanaka', team: 'Team 10', rank: 'Chunin', atk: 2, def: 3, effects: [e('debuff', 'enemy', 1, 'Al invocarse: el enemigo más fuerte pierde 1 ATK durante 1 turno.', { turns: 1 })], synergy: { by: 'team', def: 1, minimum: 1, text: 'Con otro integrante de Team 10: +1 DEF.' } },
  { id: 'choji-akimichi', name: 'Choji Akimichi', type: 'shinobi', cost: 3, rarity: 'Uncommon', description: 'Un combatiente resistente que mejora su fuerza en el momento clave.', village: 'Konohagakure', clan: 'Akimichi', team: 'Team 10', rank: 'Chunin', atk: 4, def: 4, effects: [e('buff', 'self', 2, 'Al invocarse: obtiene +2 ATK durante 1 turno.', { turns: 1 })], synergy: { by: 'team', def: 1, minimum: 1, text: 'Con otro integrante de Team 10: +1 DEF.' } },
  { id: 'hinata-hyuga', name: 'Hinata Hyuga', type: 'shinobi', cost: 2, rarity: 'Common', description: 'Defensa paciente con afinidad por el combate de precisión.', village: 'Konohagakure', clan: 'Hyuga', team: 'Team 8', rank: 'Genin', atk: 2, def: 4, effects: [e('shield', 'self', 1, 'Al invocarse: recibe un escudo que absorbe 1 daño.')], synergy: { by: 'clan', def: 1, minimum: 1, text: 'Con otro Hyuga aliado: +1 DEF.' } },
  { id: 'rock-lee', name: 'Rock Lee', type: 'shinobi', cost: 3, rarity: 'Uncommon', description: 'Especialista en taijutsu, sin naturaleza elemental impresa.', village: 'Konohagakure', team: 'Team Guy', rank: 'Genin', atk: 5, def: 2, effects: [e('buff', 'self', 2, 'Al invocarse: obtiene +2 ATK durante 1 turno.', { turns: 1 })] },
  { id: 'neji-hyuga', name: 'Neji Hyuga', type: 'shinobi', cost: 3, rarity: 'Uncommon', description: 'El Byakugan y el Jūken se representan con control preciso.', village: 'Konohagakure', clan: 'Hyuga', team: 'Team Guy', rank: 'Jonin', atk: 3, def: 5, effects: [e('debuff', 'enemy', 2, 'Al invocarse: el enemigo más fuerte pierde 2 ATK durante 1 turno.', { turns: 1 })], synergy: { by: 'clan', def: 1, minimum: 1, text: 'Con otro Hyuga aliado: +1 DEF.' } },
  { id: 'gaara', name: 'Gaara', type: 'shinobi', cost: 4, rarity: 'Rare', description: 'Defensa excepcional; su título es Kazekage, no un rango ninja genérico.', village: 'Sunagakure', team: 'Sand Siblings', title: 'Kazekage', powerTier: 'Kage-level', natures: ['Wind', 'Earth'], atk: 3, def: 7, effects: [e('shield', 'self', 2, 'Al invocarse: recibe un escudo que absorbe 2 daño.')], tags: ['Kazekage', 'arena'] },
  { id: 'temari', name: 'Temari', type: 'shinobi', cost: 3, rarity: 'Uncommon', description: 'Combatiente de largo alcance con naturaleza Viento.', village: 'Sunagakure', team: 'Sand Siblings', rank: 'Jonin', natures: ['Wind'], atk: 4, def: 3, effects: [e('damage', 'enemy', 2, 'Al invocarse: inflige 2 de daño al shinobi enemigo más fuerte.')], synergy: { by: 'team', atk: 1, minimum: 1, text: 'Con otro hermano de la arena: +1 ATK.' } },
  { id: 'jiraiya', name: 'Jiraiya', type: 'shinobi', cost: 5, rarity: 'Rare', description: 'Uno de los Sannin; el título no es una aldea ni un rango.', village: 'Konohagakure', title: 'Sannin', powerTier: 'Legendary', natures: ['Fire', 'Earth', 'Water', 'Wind'], atk: 6, def: 5, effects: [e('chakra', 'ownPlayer', 2, 'Al invocarse: recupera 2 chakra, hasta su máximo.')], tags: ['Sannin', 'mentor'] },
  { id: 'tsunade', name: 'Tsunade', type: 'shinobi', cost: 5, rarity: 'Rare', description: 'Ninjutsu médico y fuerza extraordinaria.', village: 'Konohagakure', clan: 'Senju', title: 'Hokage', powerTier: 'Kage-level', atk: 4, def: 7, effects: [e('heal', 'ownPlayer', 3, 'Al invocarse: recupera 3 Puntos de Voluntad.')], tags: ['Sannin', 'Hokage'] },
  { id: 'itachi-uchiha', name: 'Itachi Uchiha', type: 'shinobi', cost: 5, rarity: 'Legendary', description: 'Miembro de Akatsuki y del clan Uchiha; Akatsuki es una organización.', village: 'Konohagakure', clan: 'Uchiha', organization: 'Akatsuki', status: 'Exiliado / missing-nin', powerTier: 'Legendary', natures: ['Fire', 'Water', 'Wind'], atk: 6, def: 5, effects: [e('stun', 'enemy', 1, 'Al invocarse: inmoviliza al enemigo más fuerte durante 1 turno.', { turns: 1 })], synergy: { by: 'clan', atk: 1, minimum: 1, text: 'Con otro Uchiha aliado: +1 ATK.' } },
  { id: 'zabuza-momochi', name: 'Zabuza Momochi', type: 'shinobi', cost: 4, rarity: 'Rare', description: 'Uno de los Siete Espadachines de la Niebla.', village: 'Kirigakure', status: 'Missing-nin', title: 'Espadachín de la Niebla', natures: ['Water', 'Wind'], atk: 5, def: 4, effects: [e('debuff', 'enemy', 1, 'Al invocarse: el enemigo más fuerte pierde 1 ATK durante 2 turnos.', { turns: 2 })], tags: ['Siete Espadachines'] },

  { id: 'rasengan', name: 'Rasengan', type: 'jutsu', cost: 3, rarity: 'Uncommon', description: 'Concentra chakra en una esfera giratoria; en este MVP no tiene elemento impreso.', effects: [e('damage', 'enemy', 4, 'Inflige 4 de daño a un shinobi enemigo.')], tags: ['ninjutsu'] },
  { id: 'chidori', name: 'Chidori', type: 'jutsu', cost: 3, rarity: 'Uncommon', description: 'Ninjutsu de alta concentración con naturaleza Rayo.', jutsuElement: 'Lightning', effects: [e('damage', 'enemy', 3, 'Inflige 3 de daño a un shinobi enemigo; aplica la regla elemental.')], tags: ['ninjutsu'] },
  { id: 'fireball', name: 'Estilo Fuego: Jutsu Bola de Fuego', type: 'jutsu', cost: 2, rarity: 'Common', description: 'Técnica elemental de fuego.', jutsuElement: 'Fire', effects: [e('damage', 'enemy', 3, 'Inflige 3 de daño a un shinobi enemigo; aplica la regla elemental.')], tags: ['ninjutsu'] },
  { id: 'great-breakthrough', name: 'Estilo Viento: Gran Avance', type: 'jutsu', cost: 2, rarity: 'Common', description: 'Una ráfaga de viento que castiga una posición expuesta.', jutsuElement: 'Wind', effects: [e('damage', 'enemy', 2, 'Inflige 2 de daño a un shinobi enemigo; aplica la regla elemental.')], tags: ['ninjutsu'] },
  { id: 'water-dragon', name: 'Estilo Agua: Dragón de Agua', type: 'jutsu', cost: 4, rarity: 'Rare', description: 'Una técnica elemental de agua de gran coste.', jutsuElement: 'Water', effects: [e('damage', 'enemy', 4, 'Inflige 4 de daño a un shinobi enemigo; aplica la regla elemental.')], tags: ['ninjutsu'] },
  { id: 'mud-wall', name: 'Estilo Tierra: Muro de Lodo', type: 'jutsu', cost: 2, rarity: 'Common', description: 'Refuerza a un aliado contra el próximo golpe.', jutsuElement: 'Earth', effects: [e('shield', 'ally', 2, 'Un aliado recibe un escudo que absorbe 2 daño.')], tags: ['ninjutsu'] },
  { id: 'shadow-possession', name: 'Jutsu de Posesión de Sombra', type: 'jutsu', cost: 2, rarity: 'Uncommon', description: 'Control temporal de un objetivo.', effects: [e('stun', 'enemy', 1, 'Inmoviliza a un shinobi enemigo durante su próximo turno.', { turns: 1 })], tags: ['ninjutsu', 'control'] },
  { id: 'gentle-fist', name: 'Puño Suave', type: 'jutsu', cost: 2, rarity: 'Uncommon', description: 'Golpe de precisión que debilita el flujo de chakra del rival.', effects: [e('debuff', 'enemy', 2, 'Un shinobi enemigo pierde 2 ATK durante 1 turno.', { turns: 1 })], tags: ['taijutsu'] },
  { id: 'medical-ninjutsu', name: 'Ninjutsu Médico', type: 'jutsu', cost: 2, rarity: 'Common', description: 'Recuperación de emergencia.', effects: [e('heal', 'ownPlayer', 3, 'Recupera 3 Puntos de Voluntad.')], tags: ['ninjutsu', 'medicina'] },
  { id: 'shadow-clone', name: 'Técnica de Clones de Sombra', type: 'jutsu', cost: 3, rarity: 'Uncommon', description: 'Genera una apertura para mantener la iniciativa. Efecto abstracto de diseño.', effects: [e('draw', 'ownPlayer', 2, 'Roba 2 cartas.')], tags: ['ninjutsu'] },
  { id: 'sharingan-genjutsu', name: 'Genjutsu: Ilusión del Sharingan', type: 'jutsu', cost: 3, rarity: 'Rare', description: 'Un genjutsu que impide actuar temporalmente.', effects: [e('stun', 'enemy', 1, 'Inmoviliza a un shinobi enemigo durante 1 turno.', { turns: 1 })], tags: ['genjutsu'] },

  { id: 'explosive-tag', name: 'Sello Explosivo', type: 'trap', cost: 1, rarity: 'Common', description: 'Se coloca boca abajo y estalla cuando un shinobi enemigo ataca.', trigger: 'attack', effects: [e('damage', 'selected', 2, 'Al activarse: inflige 2 de daño al atacante enemigo.')] },
  { id: 'substitution', name: 'Técnica de Sustitución', type: 'trap', cost: 2, rarity: 'Uncommon', description: 'Se coloca boca abajo; cancela el siguiente ataque enemigo.', trigger: 'attack', counterAction: true, effects: [e('shield', 'ally', 1, 'Al activarse: un aliado recibe un escudo de 1 daño.')] },
  { id: 'mirror-reflection', name: 'Sello de Reflejo', type: 'trap', cost: 2, rarity: 'Rare', description: 'Se coloca boca abajo; cancela un jutsu enemigo y agota parte de su chakra.', trigger: 'jutsu', counterAction: true, effects: [e('chakra', 'opponentPlayer', 1, 'Al activarse: el lanzador pierde 1 chakra disponible.')] },
  { id: 'chakra-seal-tag', name: 'Sello de Bloqueo de Chakra', type: 'trap', cost: 2, rarity: 'Uncommon', description: 'Se coloca boca abajo; cancela una invocación normal enemiga.', trigger: 'summon', counterAction: true, effects: [] },

  { id: 'training-grounds', name: 'Campo: Terreno de Entrenamiento', type: 'field', cost: 2, rarity: 'Common', description: 'El trabajo en equipo se recompensa.', fieldBonus: { team: 'Team 7', atk: 1, def: 1, text: 'Los integrantes de Team 7 obtienen +1 ATK/+1 DEF.' } },
  { id: 'valley-of-end', name: 'Campo: Valle del Fin', type: 'field', cost: 3, rarity: 'Rare', description: 'El enfrentamiento entre vínculos y rivalidad.', fieldBonus: { clan: ['Uzumaki', 'Uchiha'], atk: 2, text: 'Uzumaki y Uchiha obtienen +2 ATK.' } },
  { id: 'forest-of-death', name: 'Campo: Bosque de la Muerte', type: 'field', cost: 2, rarity: 'Uncommon', description: 'El terreno premia la preparación de shinobi de bajo coste.', fieldBonus: { maxCost: 2, def: 2, text: 'Shinobi de coste 2 o menos obtienen +2 DEF.' } },

  { id: 'naruto-sage-mode', name: 'Naruto: Modo Sabio', type: 'extra', cost: 5, rarity: 'Legendary', description: 'Transformación: requiere Naruto Uzumaki en el campo. Sustituye sus estadísticas durante 3 turnos.', extraKind: 'transform', requiredHostIds: ['naruto-genin'], duration: 3, atk: 7, def: 7, natures: ['Wind'], tags: ['senjutsu'] },
  { id: 'sasuke-curse-mark', name: 'Sasuke: Marca Maldita, nivel 2', type: 'extra', cost: 4, rarity: 'Rare', description: 'Transformación: requiere Sasuke Uchiha. Obtiene potencia ofensiva durante 2 turnos.', extraKind: 'transform', requiredHostIds: ['sasuke-genin'], duration: 2, atk: 7, def: 4, natures: ['Lightning', 'Fire'], tags: ['transformación'] },
  { id: 'itachi-susanoo', name: 'Itachi: Susanoo', type: 'extra', cost: 6, rarity: 'Legendary', description: 'Transformación: requiere Itachi Uchiha. Una defensa formidable durante 2 turnos.', extraKind: 'transform', requiredHostIds: ['itachi-uchiha'], duration: 2, atk: 7, def: 9, natures: ['Fire'], tags: ['dōjutsu'] },
  { id: 'gamabunta', name: 'Invocación: Gamabunta', type: 'extra', cost: 5, rarity: 'Legendary', description: 'Invocación: requiere Naruto o Jiraiya en el campo y un espacio libre.', extraKind: 'summon', requiredHostIds: ['naruto-genin', 'jiraiya'], atk: 7, def: 6, natures: ['Water'], tags: ['invocación'] },
  { id: 'katsuyu', name: 'Invocación: Katsuyu', type: 'extra', cost: 4, rarity: 'Rare', description: 'Invocación: requiere Tsunade o Sakura en el campo y un espacio libre.', extraKind: 'summon', requiredHostIds: ['tsunade', 'sakura-haruno'], atk: 2, def: 8, effects: [e('heal', 'ownPlayer', 2, 'Al invocarse: recupera 2 Puntos de Voluntad.')], tags: ['invocación', 'medicina'] },
  { id: 'rock-lee-gates', name: 'Rock Lee: Apertura de las Cinco Puertas', type: 'extra', cost: 5, rarity: 'Rare', description: 'Transformación de alto riesgo: requiere Rock Lee. Dura 1 turno y después el anfitrión queda exhausto y es destruido (decisión de diseño).', extraKind: 'transform', requiredHostIds: ['rock-lee'], duration: 1, expiresDestroysHost: true, atk: 9, def: 3, tags: ['taijutsu', 'transformación'] },
];

export const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(CARDS.map((card) => [card.id, card]));
export const EXTRA_CARDS = CARDS.filter((card) => card.type === 'extra');
export const MAIN_CARDS = CARDS.filter((card) => card.type !== 'extra');

// Mazo legal de demostración: 30 cartas exactas, sin superar 3 copias.
export const STARTER_MAIN_DECK: string[] = [
  'naruto-genin', 'naruto-genin', 'naruto-genin',
  'sasuke-genin', 'sasuke-genin', 'sakura-haruno',
  'sakura-haruno', 'kakashi-hatake', 'shikamaru-nara',
  'shikamaru-nara', 'ino-yamanaka', 'choji-akimichi',
  'hinata-hyuga', 'rock-lee', 'neji-hyuga',
  'gaara', 'temari', 'jiraiya', 'tsunade', 'itachi-uchiha',
  'rasengan', 'rasengan', 'chidori', 'fireball', 'fireball',
  'great-breakthrough', 'mud-wall', 'shadow-possession',
  'medical-ninjutsu', 'explosive-tag',
];

export function validateDeck(deck: string[], extras: string[] = EXTRA_CARDS.map((c) => c.id)): string[] {
  const errors: string[] = [];
  if (deck.length !== 30) errors.push(`El mazo principal debe contener 30 cartas (ahora tiene ${deck.length}).`);
  const counts = new Map<string, number>();
  for (const id of deck) {
    if (!CARD_BY_ID[id] || CARD_BY_ID[id].type === 'extra') errors.push(`Carta principal no válida: ${id}.`);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const [id, count] of counts) if (count > 3) errors.push(`${CARD_BY_ID[id]?.name ?? id}: máximo 3 copias.`);
  if (extras.length > 6) errors.push('El Extra Deck admite un máximo de 6 cartas.');
  if (new Set(extras).size !== extras.length) errors.push('No se permiten copias repetidas en el Extra Deck.');
  for (const id of extras) if (!CARD_BY_ID[id] || CARD_BY_ID[id].type !== 'extra') errors.push(`Carta del Extra Deck no válida: ${id}.`);
  return [...new Set(errors)];
}
