import { CARDS, EXTRA_CARDS, STARTER_MAIN_DECK, validateDeck } from './cards';
import type { GameState } from './types';

const KEYS = { deck: 'nsd-deck-v1', extra: 'nsd-extra-v1', game: 'nsd-game-v1', progress: 'nsd-progress-v1', prefs: 'nsd-prefs-v1' } as const;
export interface Progress { games: number; wins: number; losses: number; lastResult?: string; }
export interface Preferences { reducedMotion: boolean; }
const defaultProgress: Progress = { games: 0, wins: 0, losses: 0 };
const defaultPrefs: Preferences = { reducedMotion: false };
function storage(): Storage | undefined { try { return typeof window !== 'undefined' ? window.localStorage : undefined; } catch { return undefined; } }
function readJson<T>(key: string): T | undefined {
  try { const s = storage()?.getItem(key); return s ? JSON.parse(s) as T : undefined; } catch { return undefined; }
}
function writeJson(key: string, value: unknown): void { try { storage()?.setItem(key, JSON.stringify(value)); } catch { /* private mode / storage quota: game can still run in memory */ } }

export function loadMainDeck(): string[] {
  const saved = readJson<string[]>(KEYS.deck);
  return Array.isArray(saved) && validateDeck(saved, loadExtraDeck()).length === 0 ? saved : [...STARTER_MAIN_DECK];
}
export function saveMainDeck(deck: string[]): void { writeJson(KEYS.deck, deck); }
export function loadExtraDeck(): string[] {
  const saved = readJson<string[]>(KEYS.extra);
  return Array.isArray(saved) && saved.length <= 6 && new Set(saved).size === saved.length && saved.every((id) => EXTRA_CARDS.some((c) => c.id === id)) ? saved : EXTRA_CARDS.map((c) => c.id);
}
export function saveExtraDeck(deck: string[]): void { writeJson(KEYS.extra, deck); }
export function loadSavedGame(): GameState | null {
  const state = readJson<GameState>(KEYS.game);
  if (!state || !Array.isArray(state.players) || state.players.length !== 2 || !state.players.every((p) => Array.isArray(p.hand) && Array.isArray(p.deck) && Array.isArray(p.field) && Array.isArray(p.backrow))) return null;
  if (state.players.some((p) => typeof p.life !== 'number' || typeof p.chakra !== 'number')) return null;
  return state;
}
export function saveGame(state: GameState | null): void { if (state) writeJson(KEYS.game, state); else try { storage()?.removeItem(KEYS.game); } catch { /* optional persistence */ } }
export function loadProgress(): Progress { const p = readJson<Progress>(KEYS.progress); return p && Number.isFinite(p.games) && Number.isFinite(p.wins) && Number.isFinite(p.losses) ? { ...defaultProgress, ...p } : { ...defaultProgress }; }
export function saveProgress(progress: Progress): void { writeJson(KEYS.progress, progress); }
export function loadPreferences(): Preferences { const p = readJson<Preferences>(KEYS.prefs); return { reducedMotion: typeof p?.reducedMotion === 'boolean' ? p.reducedMotion : defaultPrefs.reducedMotion }; }
export function savePreferences(preferences: Preferences): void { writeJson(KEYS.prefs, preferences); }
export function collectionCount(): number { return CARDS.length; }
