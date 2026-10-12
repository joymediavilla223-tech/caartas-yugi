export type Element = 'Fire' | 'Wind' | 'Lightning' | 'Earth' | 'Water';
export type CardType = 'shinobi' | 'jutsu' | 'trap' | 'field' | 'extra';
export type Rank = 'Academy' | 'Genin' | 'Chunin' | 'Jonin' | 'Tokubetsu Jonin';
export type PowerTier = 'Standard' | 'Elite' | 'Kage-level' | 'Legendary' | 'Summon';
export type EffectKind = 'damage' | 'heal' | 'buff' | 'debuff' | 'stun' | 'shield' | 'draw' | 'chakra' | 'destroy' | 'weaken';
export type EffectTarget = 'enemy' | 'ally' | 'self' | 'opponentPlayer' | 'ownPlayer' | 'selected' | 'none';
export type TrapTrigger = 'attack' | 'jutsu' | 'summon';

export interface EffectDef {
  kind: EffectKind;
  target: EffectTarget;
  value?: number;
  defense?: number;
  turns?: number;
  count?: number;
  element?: Element;
  text: string;
}

export interface SynergyDef {
  by: 'team' | 'clan' | 'village';
  atk?: number;
  def?: number;
  minimum?: number;
  text: string;
}

export interface FieldBonus {
  team?: string;
  clan?: string[];
  village?: string;
  maxCost?: number;
  atk?: number;
  def?: number;
  text: string;
}

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  cost: number;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
  description: string;
  village?: string;
  clan?: string;
  team?: string;
  organization?: string;
  rank?: Rank;
  title?: string;
  status?: string;
  powerTier?: PowerTier;
  natures?: Element[];
  jutsuElement?: Element;
  atk?: number;
  def?: number;
  effects?: EffectDef[];
  synergy?: SynergyDef;
  trigger?: TrapTrigger;
  counterAction?: boolean;
  extraKind?: 'transform' | 'summon';
  requiredHostIds?: string[];
  duration?: number;
  expiresDestroysHost?: boolean;
  fieldBonus?: FieldBonus;
  tags?: string[];
}

export interface CardInstance {
  uid: string;
  cardId: string;
}

export interface StatusEffect {
  kind: 'buff' | 'debuff' | 'stun' | 'shield' | 'weaken';
  value: number;
  defense: number;
  turns: number;
}

export interface ActiveForm {
  cardId: string;
  uid: string;
  turnsRemaining: number;
  expiresDestroysHost?: boolean;
}

export interface ShinobiUnit {
  uid: string;
  cardId: string;
  attackBonus: number;
  defenseBonus: number;
  statuses: StatusEffect[];
  hasAttacked: boolean;
  damageTaken: number;
  form?: ActiveForm;
}

export interface SetTrap {
  uid: string;
  cardId: string;
  placedTurn: number;
}

export interface PlayerState {
  id: number;
  name: string;
  isAI: boolean;
  life: number;
  chakra: number;
  maxChakra: number;
  deck: CardInstance[];
  hand: CardInstance[];
  field: ShinobiUnit[];
  backrow: (SetTrap | null)[];
  graveyard: CardInstance[];
  extraDeck: CardInstance[];
  extraGraveyard: CardInstance[];
}

export type Phase = 'main' | 'battle' | 'ended';

export interface GameFx {
  kind: 'summon' | 'attack' | 'jutsu' | 'damage' | 'destroy' | 'transform';
  targetUid?: string;
  serial: number;
}

export interface GameState {
  players: [PlayerState, PlayerState];
  activePlayer: 0 | 1;
  turnNumber: number;
  phase: Phase;
  firstTurnNoDraw: boolean;
  winner: 0 | 1 | 'draw' | null;
  log: string[];
  fx?: GameFx;
  actionSerial: number;
  activeField?: { cardId: string; owner: 0 | 1; uid: string };
  tutorialMode: boolean;
}

export interface TargetRef {
  playerIndex: 0 | 1;
  uid: string;
}

export interface ActionResult {
  state: GameState;
  error?: string;
}

export const MAX_LIFE = 8000;
export const MAIN_DECK_SIZE = 30;
export const MAX_COPIES = 3;
export const MAX_FIELD = 5;
export const MAX_BACKROW = 3;
export const MAX_CHAKRA = 10;
