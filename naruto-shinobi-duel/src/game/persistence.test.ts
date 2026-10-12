import { describe, expect, it } from 'vitest';
import { STARTER_MAIN_DECK, EXTRA_CARDS } from './cards';
import { createGame } from './engine';
import { loadExtraDeck, loadMainDeck, loadPreferences, loadProgress, loadSavedGame, saveExtraDeck, saveGame, saveMainDeck, savePreferences, saveProgress } from './persistence';
import type { Progress } from './persistence';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

function withStorage(fn: () => void) {
  const root = globalThis as unknown as { window?: { localStorage: MemoryStorage } };
  const previous = root.window;
  const localStorage = new MemoryStorage();
  root.window = { localStorage };
  try { fn(); }
  finally { if (previous) root.window = previous; else delete root.window; }
}

describe('persistencia local', () => {
  it('conserva el mazo principal y el Extra Deck entre lecturas', () => withStorage(() => {
    const deck = [...STARTER_MAIN_DECK].reverse();
    const extra = EXTRA_CARDS.slice(1, 5).map((c) => c.id);
    saveMainDeck(deck); saveExtraDeck(extra);
    expect(loadMainDeck()).toEqual(deck);
    expect(loadExtraDeck()).toEqual(extra);
  }));
  it('conserva un estado de partida que se puede reanudar', () => withStorage(() => {
    const game = createGame([...STARTER_MAIN_DECK], [...STARTER_MAIN_DECK], false, false);
    saveGame(game);
    const restored = loadSavedGame();
    expect(restored?.players[0].life).toBe(8000);
    expect(restored?.players[0].hand).toHaveLength(5);
    expect(restored?.players[1].deck).toHaveLength(25);
    expect(restored?.activePlayer).toBe(0);
  }));
  it('conserva progreso y preferencia de accesibilidad', () => withStorage(() => {
    const progress: Progress = { games: 8, wins: 5, losses: 3, lastResult: 'victoria' };
    saveProgress(progress); savePreferences({ reducedMotion: true });
    expect(loadProgress()).toEqual(progress);
    expect(loadPreferences().reducedMotion).toBe(true);
  }));
});
