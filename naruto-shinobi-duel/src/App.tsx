import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { CARD_BY_ID, CARDS, EXTRA_CARDS, STARTER_MAIN_DECK, validateDeck } from './game/cards';
import { activateExtra, attack, createGame, endTurn, getEffectiveStats, playCard, setPhase } from './game/engine';
import { runAiTurn } from './game/ai';
import { loadExtraDeck, loadMainDeck, loadPreferences, loadProgress, loadSavedGame, saveExtraDeck, saveGame, saveMainDeck, savePreferences, saveProgress, type Preferences, type Progress } from './game/persistence';
import type { CardDef, GameState, TargetRef, ShinobiUnit } from './game/types';

const TYPE_LABEL: Record<CardDef['type'], string> = { shinobi: 'Shinobi', jutsu: 'Jutsu', trap: 'Sello / trampa', field: 'Campo', extra: 'Extra Deck' };
const ELEMENTS = ['Fire', 'Wind', 'Lightning', 'Earth', 'Water'] as const;
const ELEMENT_ES: Record<string, string> = { Fire: 'Fuego', Wind: 'Viento', Lightning: 'Rayo', Earth: 'Tierra', Water: 'Agua' };
const RARITY_LABEL: Record<string, string> = { Common: 'Común', Uncommon: 'Poco común', Rare: 'Rara', Legendary: 'Legendaria' };
type Screen = 'home' | 'duel' | 'collection' | 'deck' | 'tutorial' | 'results';

function playIcon(card: CardDef): string {
  if (card.type === 'shinobi') return '忍';
  if (card.type === 'jutsu') return '火';
  if (card.type === 'trap') return '封';
  if (card.type === 'field') return '風';
  return '影';
}

function App() {
  const [screen, setScreen] = useState<Screen>(() => {
    const existing = loadSavedGame();
    return existing ? (existing.winner !== null ? 'results' : 'duel') : 'home';
  });
  const [deck, setDeck] = useState<string[]>(loadMainDeck);
  const [extras, setExtras] = useState<string[]>(loadExtraDeck);
  const [game, setGame] = useState<GameState | null>(loadSavedGame);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [preferences, setPreferences] = useState<Preferences>(loadPreferences);
  const [notice, setNotice] = useState('');
  const [selectedHandUid, setSelectedHandUid] = useState<string | null>(null);
  const [selectedAttackerUid, setSelectedAttackerUid] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<TargetRef | undefined>(undefined);
  const [selectedTributes, setSelectedTributes] = useState<string[]>([]);
  const [selectedExtraUid, setSelectedExtraUid] = useState<string | null>(null);
  const [detailCard, setDetailCard] = useState<CardDef | null>(null);
  const [graveyardView, setGraveyardView] = useState<0 | 1 | null>(null);
  const [collectionType, setCollectionType] = useState('all');
  const [filterVillage, setFilterVillage] = useState('all');
  const [filterClan, setFilterClan] = useState('all');
  const [filterElement, setFilterElement] = useState('all');
  const [filterRarity, setFilterRarity] = useState('all');
  const [collectionSearch, setCollectionSearch] = useState('');
  const [deckFilter, setDeckFilter] = useState('all');
  const [deckSearch, setDeckSearch] = useState('');
  const [deckEditor, setDeckEditor] = useState<'main' | 'extra'>('main');
  const previousWinner = useRef<GameState['winner']>(game?.winner ?? null);
  const countedEnd = useRef(false);

  useEffect(() => { saveMainDeck(deck); }, [deck]);
  useEffect(() => { saveExtraDeck(extras); }, [extras]);
  useEffect(() => { saveGame(game); }, [game]);
  useEffect(() => { saveProgress(progress); }, [progress]);
  useEffect(() => { savePreferences(preferences); }, [preferences]);
  useEffect(() => {
    if (!game || game.winner === null) { previousWinner.current = game?.winner ?? null; return; }
    setScreen('results');
    if (previousWinner.current === null && !countedEnd.current) {
      countedEnd.current = true;
      setProgress((prev) => ({ ...prev, games: prev.games + 1, wins: prev.wins + (game.winner === 0 ? 1 : 0), losses: prev.losses + (game.winner === 1 ? 1 : 0), lastResult: game.winner === 0 ? 'victoria' : game.winner === 1 ? 'derrota' : 'empate' }));
    }
    previousWinner.current = game.winner;
  }, [game?.winner]);
  useEffect(() => {
    if (screen !== 'duel' || !game || game.winner !== null || game.activePlayer !== 1) return;
    const timer = window.setTimeout(() => {
      setGame((current) => current && current.winner === null && current.activePlayer === 1 ? runAiTurn(current) : current);
      setNotice('');
    }, 420);
    return () => window.clearTimeout(timer);
  }, [screen, game?.activePlayer, game?.turnNumber, game?.winner]);

  const mainErrors = useMemo(() => validateDeck(deck, extras), [deck, extras]);
  const villages = useMemo(() => [...new Set(CARDS.map((c) => c.village).filter(Boolean) as string[])].sort(), []);
  const clans = useMemo(() => [...new Set(CARDS.map((c) => c.clan).filter(Boolean) as string[])].sort(), []);
  const filteredCollection = useMemo(() => CARDS.filter((card) => {
    if (collectionType !== 'all' && card.type !== collectionType) return false;
    if (filterVillage !== 'all' && card.village !== filterVillage) return false;
    if (filterClan !== 'all' && card.clan !== filterClan) return false;
    if (filterElement !== 'all' && ![...(card.natures ?? []), ...(card.jutsuElement ? [card.jutsuElement] : [])].includes(filterElement as typeof ELEMENTS[number])) return false;
    if (filterRarity !== 'all' && card.rarity !== filterRarity) return false;
    const search = collectionSearch.trim().toLowerCase();
    if (search && ![card.name, card.description, card.team, card.village, card.clan, card.organization].some((x) => x?.toLowerCase().includes(search))) return false;
    return true;
  }), [collectionType, filterVillage, filterClan, filterElement, filterRarity, collectionSearch]);
  const filteredDeckCards = useMemo(() => CARDS.filter((card) => {
    if (deckEditor === 'main' && card.type === 'extra') return false;
    if (deckEditor === 'extra' && card.type !== 'extra') return false;
    if (deckFilter !== 'all' && card.type !== deckFilter) return false;
    const s = deckSearch.trim().toLowerCase();
    return !s || card.name.toLowerCase().includes(s) || card.description.toLowerCase().includes(s);
  }), [deckEditor, deckFilter, deckSearch]);

  const clearSelections = () => { setSelectedHandUid(null); setSelectedAttackerUid(null); setSelectedTarget(undefined); setSelectedTributes([]); setSelectedExtraUid(null); };
  const openNewGame = (tutorialMode = false) => {
    const validation = validateDeck(deck, extras);
    if (validation.length) { setNotice(validation[0]); setScreen('deck'); return; }
    const next = createGame(deck, STARTER_MAIN_DECK, tutorialMode, true, extras, EXTRA_CARDS.map((c) => c.id));
    setGame(next); countedEnd.current = false; previousWinner.current = null; clearSelections(); setNotice(''); setScreen('duel');
  };
  const act = (result: { state: GameState; error?: string }) => {
    if (result.error) { setNotice(result.error); return; }
    setNotice(''); setGame(result.state);
  };
  const currentPlayer = game?.players[game.activePlayer];
  const userPlayer = game?.players[0];
  const selectedHandCard = userPlayer?.hand.find((c) => c.uid === selectedHandUid);
  const selectedDefinition = selectedHandCard ? CARD_BY_ID[selectedHandCard.cardId] : undefined;

  const addCard = (card: CardDef) => {
    if (deckEditor === 'extra' || card.type === 'extra') {
      if (extras.includes(card.id)) { setNotice('Esa carta ya está en el Extra Deck.'); return; }
      if (extras.length >= 6) { setNotice('El Extra Deck admite un máximo de 6 cartas.'); return; }
      setExtras((prev) => [...prev, card.id]); setNotice('Carta añadida al Extra Deck.'); return;
    }
    const copies = deck.filter((id) => id === card.id).length;
    if (copies >= 3) { setNotice('El mazo admite un máximo de 3 copias por carta.'); return; }
    if (deck.length >= 30) { setNotice('El mazo principal ya tiene 30 cartas. Quita una antes de añadir otra.'); return; }
    setDeck((prev) => [...prev, card.id]); setNotice('Carta añadida al mazo.');
  };
  const removeCard = (cardId: string) => {
    if (deckEditor === 'extra') { setExtras((prev) => prev.filter((id) => id !== cardId)); return; }
    setDeck((prev) => { const i = prev.lastIndexOf(cardId); if (i < 0) return prev; return prev.filter((_, index) => index !== i); });
  };
  const selectUnit = (playerIndex: 0 | 1, unit: ShinobiUnit) => {
    if (!game) return;
    if (playerIndex === game.activePlayer && selectedExtraUid) {
      setSelectedTarget({ playerIndex, uid: unit.uid });
      setNotice(`Anfitrión seleccionado: ${CARD_BY_ID[unit.form?.cardId ?? unit.cardId]?.name}.`);
      return;
    }
    if (playerIndex === game.activePlayer && selectedDefinition?.type === 'shinobi' && selectedDefinition.cost >= 5) {
      setSelectedTributes((prev) => prev.includes(unit.uid) ? prev.filter((id) => id !== unit.uid) : [...prev, unit.uid]);
      setSelectedTarget({ playerIndex, uid: unit.uid }); return;
    }
    setSelectedTarget({ playerIndex, uid: unit.uid });
    if (!selectedDefinition && !selectedExtraUid && playerIndex === game.activePlayer) {
      setSelectedAttackerUid(unit.uid);
      setNotice(`Atacante seleccionado: ${CARD_BY_ID[unit.form?.cardId ?? unit.cardId]?.name}. Ahora toca un objetivo rival o ataca directamente si su campo está vacío.`);
    } else {
      setNotice(`Objetivo seleccionado: ${CARD_BY_ID[unit.form?.cardId ?? unit.cardId]?.name}.`);
    }
  };
  const selectedTargetCard = selectedTarget ? game?.players[selectedTarget.playerIndex].field.find((u) => u.uid === selectedTarget.uid) : undefined;

  const header = <header className="topbar">
    <button className="brand" onClick={() => setScreen('home')} aria-label="Ir al inicio"><span className="brand-mark">忍</span><span><strong>SHINOBI DUEL</strong><small>TACTICAL CARD BATTLE</small></span></button>
    <nav className="nav-tabs" aria-label="Navegación principal">
      {([['home', 'Inicio'], ['duel', 'Duelo'], ['collection', 'Colección'], ['deck', 'Constructor'], ['tutorial', 'Tutorial']] as [Screen, string][]).map(([id, label]) => <button key={id} className={screen === id ? 'nav-tab active' : 'nav-tab'} onClick={() => { if (id === 'duel' && !game) { openNewGame(false); return; } setScreen(id); setNotice(''); }}>{label}</button>)}
    </nav>
    <div className="top-progress"><span className="online-dot" /> <span>{progress.wins} victorias</span></div>
  </header>;

  const cardFace = (card: CardDef, compact = false, selected = false, count?: number, click?: () => void) => <button key={`${card.id}-${compact ? 'mini' : 'full'}`} className={`card-face ${card.type} ${card.rarity.toLowerCase()} ${compact ? 'compact' : ''} ${selected ? 'selected' : ''}`} onClick={click ?? (() => setDetailCard(card))} title={`${card.name} — ${card.description}`}>
    <span className="card-topline"><span className="type-symbol">{playIcon(card)}</span><span className="card-cost">{card.cost} CH</span></span>
    <span className="card-art"><span className="art-glyph">{card.type === 'shinobi' ? (card.clan?.slice(0, 1) ?? '忍') : card.type === 'extra' ? '影' : card.type === 'trap' ? '封' : card.type === 'field' ? '山' : '術'}</span><span className="art-lines" /></span>
    <span className="card-name">{card.name}</span>
    <span className="card-type-line">{TYPE_LABEL[card.type]}{card.rank ? ` · ${card.rank}` : card.powerTier ? ` · ${card.powerTier}` : ''}</span>
    <span className="card-description">{card.description}</span>
    {(card.atk !== undefined || card.def !== undefined) && <span className="card-stats"><b>ATK {card.atk ?? '—'}</b><b>DEF {card.def ?? '—'}</b></span>}
    {count !== undefined && <span className="card-count">×{count}</span>}
  </button>;

  const renderUnit = (unit: ShinobiUnit, playerIndex: 0 | 1) => {
    if (!game) return null;
    const def = CARD_BY_ID[unit.form?.cardId ?? unit.cardId];
    const base = CARD_BY_ID[unit.cardId];
    const stats = getEffectiveStats(game, playerIndex, unit);
    const selected = selectedTarget?.playerIndex === playerIndex && selectedTarget.uid === unit.uid;
    const isTribute = selectedTributes.includes(unit.uid);
    const classes = `battle-unit ${playerIndex === 0 ? 'own-unit' : 'enemy-unit'} ${selected ? 'target-selected' : ''} ${isTribute ? 'tribute-selected' : ''} ${unit.hasAttacked ? 'already-attacked' : ''} ${game.fx?.targetUid === unit.uid ? `fx-${game.fx.kind}` : ''}`;
    return <button key={unit.uid} className={classes} onClick={() => selectUnit(playerIndex, unit)} title={`${def.name}: ATK ${stats.atk}, DEF ${stats.def}`}>
      <span className="unit-head"><span className="unit-glyph">{def.clan?.slice(0, 1) ?? (def.type === 'extra' ? '召' : '忍')}</span><span className="unit-name">{def.name}</span><span className="unit-cost">{def.cost}CH</span></span>
      {unit.form && <span className="form-ribbon">FORMA · {unit.form.turnsRemaining}T</span>}
      <span className="unit-stats"><b>⚔ {stats.atk}</b><b>◆ {stats.def}</b></span>
      <span className="unit-health">Resistencia {Math.max(0, stats.def - unit.damageTaken)}/{stats.def}</span>
      <span className="unit-statuses">{unit.statuses.filter((s) => s.turns > 0).map((s) => s.kind === 'stun' ? '⛓ Inmovilizado' : s.kind === 'shield' ? `◈ Escudo ${s.value}` : s.kind === 'buff' ? `↑ ATK ${s.value}` : `↓ ATK ${s.value}`).join(' · ') || (unit.hasAttacked ? 'Ataque usado' : base.rank ?? 'Listo')}</span>
      {isTribute && <span className="tribute-tag">TRIBUTO</span>}
    </button>;
  };

  const homeView = <main className="main-shell home-view">
    <section className="hero-panel">
      <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> STRATEGY · CHAKRA · SHINOBI <span className="eyebrow-line" /></div><h1>LA VOLUNTAD<br /><em>DEL SHINOBI</em></h1><p>Construye tu mazo, administra el chakra y encuentra la combinación que cambia el rumbo del duelo.</p><div className="hero-actions"><button className="btn-primary" onClick={() => openNewGame(false)}>⚔ Iniciar duelo <span>↗</span></button><button className="btn-secondary" onClick={() => setScreen('deck')}>Construir mazo</button></div><div className="hero-metrics"><div><b>40</b><span>cartas jugables</span></div><div><b>5</b><span>elementos</span></div><div><b>30</b><span>cartas por mazo</span></div></div></div>
      <div className="hero-art" aria-label="Diseño gráfico original con símbolos shinobi"><div className="sun-disc" /><div className="concentric-ring ring-one" /><div className="concentric-ring ring-two" /><div className="kanji-seal">忍</div><div className="slash slash-a" /><div className="slash slash-b" /><div className="hero-vertical">忍道 · SHINOBI WAY</div><div className="hero-caption"><span>VOL. 001</span><span>THE WILL OF FIRE</span></div></div>
    </section>
    <section className="home-lower"><div className="section-heading"><div><span className="eyebrow">COMIENZA TU CAMINO</span><h2>Tu próximo movimiento</h2></div><span className="tiny-index">01 — 04</span></div><div className="feature-grid">
      <button className="feature-card" onClick={() => openNewGame(false)}><span className="feature-number">01</span><span className="feature-icon">⚔</span><strong>Entrar al duelo</strong><p>Juega una partida completa contra una IA que calcula sus movimientos según el estado real.</p><span className="feature-link">Jugar ahora ↗</span></button>
      <button className="feature-card" onClick={() => setScreen('collection')}><span className="feature-number">02</span><span className="feature-icon">▧</span><strong>Explorar colección</strong><p>Consulta costes, atributos, condiciones, sinergias y efectos de las 40 cartas.</p><span className="feature-link">Ver colección ↗</span></button>
      <button className="feature-card" onClick={() => setScreen('deck')}><span className="feature-number">03</span><span className="feature-icon">巻</span><strong>Armar tu estrategia</strong><p>Construye un mazo legal de 30 cartas y configura tu Extra Deck de hasta 6.</p><span className="feature-link">Editar mazo ↗</span></button>
      <button className="feature-card" onClick={() => setScreen('tutorial')}><span className="feature-number">04</span><span className="feature-icon">☷</span><strong>Aprender las reglas</strong><p>Conoce las fases, las ventajas elementales, el sistema de tributos y las trampas.</p><span className="feature-link">Abrir tutorial ↗</span></button>
    </div><div className="home-footnote"><span className="red-dot" /> PROTOTIPO JUGABLE · GUARDADO LOCAL <span>·</span> FAN PROJECT NO OFICIAL</div></section>
  </main>;

  const deckView = <main className="main-shell content-view"><div className="page-title-row"><div><span className="eyebrow">ARSENAL · CONSTRUCCIÓN</span><h1>Constructor de mazos</h1><p>Elige las herramientas para tu estilo de combate. Los cambios se guardan automáticamente en este dispositivo.</p></div><button className="btn-secondary" onClick={() => { setDeck([...STARTER_MAIN_DECK]); setExtras(EXTRA_CARDS.map((c) => c.id)); setNotice('Mazo inicial restaurado.'); }}>Restaurar mazo inicial</button></div>
    <div className="deck-summary"><div className="deck-meter"><div className="meter-top"><span>MAZO PRINCIPAL</span><strong className={deck.length === 30 ? 'good' : 'bad'}>{deck.length}/30</strong></div><div className="meter-track"><span style={{ width: `${Math.min(100, deck.length / 30 * 100)}%` }} /></div><small>Máximo 3 copias por carta</small></div><div className="deck-meter"><div className="meter-top"><span>EXTRA DECK</span><strong className={extras.length <= 6 ? 'good' : 'bad'}>{extras.length}/6</strong></div><div className="meter-track extra-meter"><span style={{ width: `${Math.min(100, extras.length / 6 * 100)}%` }} /></div><small>Una copia por transformación o invocación</small></div><div className="deck-counters"><b>{deck.filter((id) => CARD_BY_ID[id].type === 'shinobi').length}</b><span>SHINOBI</span><b>{deck.filter((id) => CARD_BY_ID[id].type === 'jutsu').length}</b><span>JUTSU</span><b>{deck.filter((id) => ['trap', 'field'].includes(CARD_BY_ID[id].type)).length}</b><span>TACTICAS</span></div></div>
    {mainErrors.length > 0 && <div className="validation-box"><strong>El mazo aún no es legal</strong>{mainErrors.map((err) => <p key={err}>• {err}</p>)}</div>}
    <div className="deck-workspace"><section className="deck-pool"><div className="subsection-title"><h2>Colección disponible</h2><span>{filteredDeckCards.length} cartas</span></div><div className="deck-controls"><div className="segmented"><button className={deckEditor === 'main' ? 'on' : ''} onClick={() => { setDeckEditor('main'); setDeckFilter('all'); }}>Mazo principal</button><button className={deckEditor === 'extra' ? 'on' : ''} onClick={() => { setDeckEditor('extra'); setDeckFilter('all'); }}>Extra Deck</button></div><input value={deckSearch} onChange={(e: ChangeEvent<HTMLInputElement>) => setDeckSearch(e.target.value)} placeholder="Buscar carta…" aria-label="Buscar carta" /></div><div className="filter-chips">{(deckEditor === 'main' ? [['all','Todas'],['shinobi','Shinobi'],['jutsu','Jutsu'],['trap','Trampas'],['field','Campos']] : [['all','Todas'],['extra','Especiales']]).map(([v,l]) => <button key={v} className={deckFilter === v ? 'chip selected' : 'chip'} onClick={() => setDeckFilter(v)}>{l}</button>)}</div><div className="card-grid pool-grid">{filteredDeckCards.map((card) => {
      const count = deckEditor === 'main' ? deck.filter((id) => id === card.id).length : (extras.includes(card.id) ? 1 : 0);
      return <div className="pool-card-wrap" key={card.id}>{cardFace(card, true, false, count, () => addCard(card))}<button className="quick-add" onClick={() => addCard(card)} aria-label={`Añadir ${card.name}`}>{deckEditor === 'extra' ? (count ? '✓ En Extra' : '+ Añadir') : `+ Añadir (${count}/3)`}</button></div>;
    })}</div></section>
    <aside className="deck-list-panel"><div className="subsection-title"><h2>{deckEditor === 'main' ? 'Tu mazo' : 'Tu Extra Deck'}</h2><span>{deckEditor === 'main' ? `${deck.length} cartas` : `${extras.length} cartas`}</span></div><div className="deck-list-scroll">{(deckEditor === 'main' ? deck : extras).length === 0 ? <div className="empty-state">Aún no hay cartas. Añádelas desde la colección.</div> : (deckEditor === 'main' ? deck : extras).map((id, index) => <div className="deck-list-row" key={`${id}-${index}`}><span className={`mini-stamp ${CARD_BY_ID[id].type}`}>{playIcon(CARD_BY_ID[id])}</span><span className="deck-row-name"><strong>{CARD_BY_ID[id].name}</strong><small>{TYPE_LABEL[CARD_BY_ID[id].type]} · {CARD_BY_ID[id].cost} chakra</small></span><button onClick={() => removeCard(id)} aria-label={`Quitar ${CARD_BY_ID[id].name}`}>−</button></div>)}</div><div className="deck-side-footer"><span>{mainErrors.length ? 'Revisa las reglas del mazo' : 'Mazo legal y guardado'}</span><button className="btn-primary" onClick={() => { if (mainErrors.length) { setNotice(mainErrors[0]); return; } openNewGame(false); }}>Usar este mazo ↗</button></div></aside></div>
  </main>;

  const collectionView = <main className="main-shell content-view"><div className="page-title-row"><div><span className="eyebrow">ARCHIVO SHINOBI · 40 CARTAS</span><h1>Tu colección</h1><p>Todos los efectos listados en este archivo están respaldados por lógica del motor de juego.</p></div><div className="collection-total"><b>{CARDS.length}</b><span>CARTAS</span></div></div><div className="collection-toolbar"><input value={collectionSearch} onChange={(e: ChangeEvent<HTMLInputElement>) => setCollectionSearch(e.target.value)} placeholder="Buscar nombre, equipo u organización…" aria-label="Buscar en la colección" /><select value={collectionType} onChange={(e: ChangeEvent<HTMLSelectElement>) => setCollectionType(e.target.value)} aria-label="Filtrar por tipo"><option value="all">Todos los tipos</option>{Object.entries(TYPE_LABEL).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select><select value={filterVillage} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterVillage(e.target.value)} aria-label="Filtrar por aldea"><option value="all">Todas las aldeas</option>{villages.map((v) => <option value={v} key={v}>{v}</option>)}</select><select value={filterClan} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterClan(e.target.value)} aria-label="Filtrar por clan"><option value="all">Todos los clanes</option>{clans.map((v) => <option value={v} key={v}>{v}</option>)}</select><select value={filterElement} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterElement(e.target.value)} aria-label="Filtrar por elemento"><option value="all">Todos los elementos</option>{ELEMENTS.map((v) => <option value={v} key={v}>{ELEMENT_ES[v]}</option>)}</select><select value={filterRarity} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterRarity(e.target.value)} aria-label="Filtrar por rareza"><option value="all">Todas las rarezas</option>{Object.entries(RARITY_LABEL).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></div><div className="collection-stats"><span><i className="dot shinobi" /> Shinobi {CARDS.filter((c) => c.type === 'shinobi').length}</span><span><i className="dot jutsu" /> Jutsu {CARDS.filter((c) => c.type === 'jutsu').length}</span><span><i className="dot trap" /> Sellos/trampas {CARDS.filter((c) => c.type === 'trap').length}</span><span><i className="dot extra" /> Extra Deck {EXTRA_CARDS.length}</span><span className="result-count">{filteredCollection.length} resultado(s)</span></div><div className="card-grid collection-grid">{filteredCollection.map((card) => cardFace(card, false))}</div>{filteredCollection.length === 0 && <div className="empty-state wide">No hay cartas que coincidan con esos filtros.</div>}</main>;

  const tutorialView = <main className="main-shell content-view"><div className="page-title-row"><div><span className="eyebrow">MANUAL DE CAMPO</span><h1>Aprende a jugar</h1><p>Un resumen operativo del reglamento de Shinobi Duel. Las reglas completas están en el archivo README.md del proyecto.</p></div><button className="btn-primary" onClick={() => openNewGame(true)}>Practicar contra la IA ↗</button></div><div className="tutorial-grid"><article className="tutorial-card large"><span className="tutorial-number">01 / FLUJO</span><h2>Un turno, cuatro decisiones</h2><ol><li><b>Comienzo:</b> el máximo de chakra sube 1 (hasta 10) y se recupera por completo. Roba 1 carta, excepto el primer turno del jugador inicial.</li><li><b>Principal:</b> invoca shinobi, usa jutsu, coloca trampas y activa campo o cartas del Extra Deck.</li><li><b>Combate:</b> cada shinobi puede atacar una vez. Si hay shinobi rivales, debes elegir uno como objetivo.</li><li><b>Final:</b> los estados temporales disminuyen y el turno pasa al rival.</li></ol></article><article className="tutorial-card"><span className="tutorial-number">02 / CHAKRA</span><h2>Administra el recurso</h2><p>El máximo empieza en 1 y crece al inicio de tus turnos, hasta 10. Los costes se pagan desde el chakra disponible; un efecto de recuperación nunca supera tu máximo.</p><div className="chakra-demo">{Array.from({length:10},(_,i)=><span key={i} className={i<5?'filled':''}>{i+1}</span>)}</div></article><article className="tutorial-card"><span className="tutorial-number">03 / ELEMENTOS</span><h2>Ventaja en cadena</h2><div className="element-wheel">{['Fuego','Viento','Rayo','Tierra','Agua'].map((v,i)=><div key={v} className={`element-node node-${i}`}><b>{v}</b><small>supera a</small><span>{['Viento','Rayo','Tierra','Agua','Fuego'][i]}</span></div>)}</div><p>Solo los jutsu con elemento impreso hacen esta comprobación contra la primera naturaleza de chakra del defensor: +2 daño si la supera; −2 si la naturaleza defensora supera al jutsu; mínimo 0. Las demás naturalezas no se usan en esa comprobación.</p></article><article className="tutorial-card"><span className="tutorial-number">04 / COMBATE</span><h2>ATK contra resistencia</h2><p>El ATK causa daño y la DEF determina cuánto daño acumulado soporta un shinobi. Los escudos absorben daño primero. Al llegar a su DEF, el shinobi es destruido; el exceso de un ataque se convierte en daño a los Puntos de Voluntad.</p></article><article className="tutorial-card"><span className="tutorial-number">05 / TRIBUTOS</span><h2>El poder tiene precio</h2><p>Por decisión de diseño, una invocación normal de coste 5–6 exige 1 tributo y una de coste 7–10 exige 2. La invocación de coste 1–4 no pide tributos. Selecciona exactamente los shinobi que sacrificarás antes de invocar.</p></article><article className="tutorial-card"><span className="tutorial-number">06 / TRAMPAS Y FORMAS</span><h2>Respuestas y Extra Deck</h2><p>Coloca trampas boca abajo pagando su coste. Se activan automáticamente ante el primer tipo de acción compatible. Las transformaciones requieren un anfitrión específico y duran los turnos impresos; destruir al anfitrión también envía su forma al cementerio del Extra Deck.</p></article></div></main>;

  const duelView = game && <main className="main-shell duel-view">
    <div className="duel-header"><div><span className="eyebrow">ARENA · TURNO {game.turnNumber}</span><h1>Duelo shinobi <span className="phase-pill">{game.activePlayer === 0 ? 'TU TURNO' : 'TURNO DE LA IA'}</span></h1></div><div className="duel-header-actions"><button className="btn-small" onClick={() => setScreen('tutorial')}>Reglas</button><button className="btn-small" onClick={() => { saveGame(null); setGame(null); setScreen('home'); clearSelections(); }}>Salir del duelo</button></div></div>
    {game.tutorialMode && <div className="guided-tip"><span>✦ MODO PRÁCTICA</span> Selecciona una carta de tu mano y usa <b>Jugar carta</b>. Pulsa un shinobi del campo para seleccionarlo como objetivo, o para marcar tributos cuando la invocación lo exija.</div>}
    <div className="duel-status-row"><div className={`player-status ${game.activePlayer === 1 ? 'active-player' : ''}`}><div className="avatar enemy-avatar">影</div><div className="player-status-info"><strong>{game.players[1].name}</strong><span>{game.players[1].hand.length} cartas en mano · {game.players[1].deck.length} en mazo</span></div><div className="life-number"><small>P. VOLUNTAD</small><b>{game.players[1].life.toLocaleString('es-ES')}</b><div className="life-track"><span style={{width:`${Math.max(0,game.players[1].life/8000*100)}%`}} /></div></div></div><div className="vs-marker">VS</div><div className={`player-status ${game.activePlayer === 0 ? 'active-player' : ''}`}><div className="avatar own-avatar">火</div><div className="player-status-info"><strong>Tú</strong><span>{game.players[0].hand.length} cartas en mano · {game.players[0].deck.length} en mazo</span></div><div className="life-number"><small>P. VOLUNTAD</small><b>{game.players[0].life.toLocaleString('es-ES')}</b><div className="life-track"><span style={{width:`${Math.max(0,game.players[0].life/8000*100)}%`}} /></div></div></div></div>
    <section className="arena-panel"><div className="arena-banner"><span>敵 · CAMPO DEL RIVAL</span><span>{game.players[1].field.length}/5 SHINOBI</span></div><div className="field-row enemy-field">{game.players[1].field.length ? game.players[1].field.map((unit) => renderUnit(unit,1)) : <div className="empty-field"><span>忍</span><b>Campo rival despejado</b><small>Un ataque directo inflige daño a sus Puntos de Voluntad.</small></div>}</div><div className="backrow-area"><div className="backrow-label">SELLOS / TRAMPAS</div><div className="backrow-slots">{game.players[1].backrow.map((trap,i)=><div key={i} className={`backrow-slot ${trap?'occupied enemy-set':''}`}>{trap ? <><span>封</span><small>Boca abajo</small></> : <><span>＋</span><small>Vacío</small></>}</div>)}</div><div className="active-field-card">{game.activeField ? <><span className="field-token">風</span><span><small>CAMPO ACTIVO</small><b>{CARD_BY_ID[game.activeField.cardId].name}</b></span><button onClick={() => setDetailCard(CARD_BY_ID[game.activeField!.cardId])}>Ver efecto</button></> : <><span className="field-token muted">風</span><span><small>CAMPO ACTIVO</small><b>Ninguno</b></span></>}</div></div>
      <div className="arena-divider"><span>CHAKRA INCLINADO</span><div className="divider-line" /><span>TURNO {game.turnNumber}</span></div>
      <div className="backrow-area own-backrow"><div className="backrow-label">TUS SELLOS / TRAMPAS</div><div className="backrow-slots">{game.players[0].backrow.map((trap,i)=><div key={i} className={`backrow-slot ${trap?'occupied own-set':''}`}>{trap ? <><span>封</span><small>{CARD_BY_ID[trap.cardId].name}</small></> : <><span>＋</span><small>Vacío</small></>}</div>)}</div><div className="active-chakra"><div className="chakra-top"><span>CHAKRA DISPONIBLE</span><b>{game.players[0].chakra}<small> / {game.players[0].maxChakra}</small></b></div><div className="chakra-orbs">{Array.from({length:10},(_,i)=><span key={i} className={i<game.players[0].chakra?'lit':''} />)}</div><div className="chakra-foot">Se recupera al inicio de tu turno</div></div></div>
      <div className="arena-banner own-banner"><span>味方 · TU CAMPO</span><span>{game.players[0].field.length}/5 SHINOBI</span></div><div className="field-row own-field">{game.players[0].field.length ? game.players[0].field.map((unit) => renderUnit(unit,0)) : <div className="empty-field"><span>木</span><b>Aún no has invocado</b><small>Usa una carta Shinobi de tu mano cuando tengas chakra.</small></div>}</div>
    </section>
    {selectedTargetCard && <div className="selection-note"><span>OBJETIVO</span><b>{CARD_BY_ID[selectedTargetCard.form?.cardId ?? selectedTargetCard.cardId].name}</b><button onClick={() => {clearSelections();}}>Limpiar selección ×</button>{selectedTributes.length>0 && <strong>Tributos: {selectedTributes.length}</strong>}</div>}
    {notice && <div className="notice-banner" role="status"><span>ⓘ</span>{notice}<button onClick={() => setNotice('')} aria-label="Cerrar aviso">×</button></div>}
    <section className="hand-panel"><div className="hand-heading"><div><span className="eyebrow">TU MANO · {game.players[0].hand.length} CARTAS</span><h2>Selecciona tu movimiento</h2></div><div className="hand-controls"><button className={`btn-small ${game.phase === 'battle' ? 'phase-active' : ''}`} disabled={game.activePlayer !== 0 || game.phase === 'battle'} onClick={() => { const r=setPhase(game,0,'battle'); act(r); }}>Fase de combate →</button><button className="btn-primary" disabled={game.activePlayer !== 0 || game.winner !== null} onClick={() => { const r=endTurn(game,0); act(r); clearSelections(); }}>Terminar turno ↗</button></div></div>
      {game.players[0].hand.length ? <div className="hand-scroll">{game.players[0].hand.map((item) => { const card=CARD_BY_ID[item.cardId]; return <div className="hand-card-wrap" key={item.uid}>{cardFace(card,true,selectedHandUid===item.uid,undefined,()=>{setSelectedHandUid(item.uid);setSelectedTributes([]);setNotice(card.type==='shinobi'&&card.cost>=5?`Selecciona ${card.cost>=7?2:1} tributo(s) en tu campo y luego invoca.`:`Carta seleccionada: ${card.name}.`);})}</div>; })}</div> : <div className="empty-hand">No tienes cartas en la mano. Si necesitas robar y tu mazo está vacío, pierdes por agotamiento.</div>}
      <div className="action-bar"><div className="selected-card-info">{selectedDefinition ? <><span className={`mini-stamp ${selectedDefinition.type}`}>{playIcon(selectedDefinition)}</span><span><b>{selectedDefinition.name}</b><small>{TYPE_LABEL[selectedDefinition.type]} · coste {selectedDefinition.cost} chakra</small></span><button className="text-link" onClick={() => setDetailCard(selectedDefinition)}>Detalles</button></> : <span className="action-placeholder">Elige una carta de tu mano para ver sus acciones.</span>}</div><div className="action-buttons">{selectedDefinition && <button className="btn-primary" disabled={game.activePlayer!==0} onClick={() => { if(!selectedHandUid) return; const r=playCard(game,0,selectedHandUid,selectedTarget,selectedTributes); act(r); if(!r.error){setSelectedHandUid(null);setSelectedTributes([]);setSelectedTarget(undefined);} }}> {selectedDefinition.type==='trap'?'Colocar trampa':selectedDefinition.type==='field'?'Activar campo':selectedDefinition.type==='jutsu'?'Usar jutsu':'Invocar shinobi'} · {selectedDefinition.cost} CH</button>}
        {selectedExtraUid && <button className="btn-secondary" disabled={game.activePlayer!==0} onClick={() => {const r=activateExtra(game,0,selectedExtraUid,selectedTarget?.playerIndex===0?selectedTarget.uid:undefined);act(r);if(!r.error){setSelectedExtraUid(null);setSelectedTarget(undefined);}}}>Activar carta especial</button>}

      </div></div>
      <div className="combat-actions"><div className="extra-zone"><div className="extra-zone-heading"><span>EXTRA DECK</span><small>{game.players[0].extraDeck.length} disponibles</small></div><div className="extra-card-list">{game.players[0].extraDeck.map((item)=>{const card=CARD_BY_ID[item.cardId];return <button key={item.uid} className={`extra-card-button ${selectedExtraUid===item.uid?'selected':''}`} onClick={()=>{setSelectedExtraUid(item.uid);setSelectedHandUid(null);setSelectedAttackerUid(null);setSelectedTarget(undefined);setNotice(`${card.name}: ${card.description}`);}}><span>{playIcon(card)}</span><b>{card.name}</b><small>{card.cost} CH</small></button>;})}{!game.players[0].extraDeck.length&&<small className="muted-copy">No quedan cartas disponibles.</small>}</div></div><div className="attack-action-panel"><span className="eyebrow">ACCIÓN DE COMBATE</span><p>{game.phase==='battle'?'Selecciona uno de tus shinobi y después un objetivo rival. Si el campo rival está vacío, puedes atacar directamente.':'Pasa a la fase de combate para declarar ataques.'}</p><button className="btn-primary" disabled={game.activePlayer!==0 || game.phase!=='battle' || !selectedAttackerUid || !!game.players[0].field.find((u)=>u.uid===selectedAttackerUid)?.hasAttacked || (game.players[1].field.length>0 && selectedTarget?.playerIndex!==1)} onClick={()=>{if(!selectedAttackerUid)return;const targetUid=game.players[1].field.length && selectedTarget?.playerIndex===1 ? selectedTarget.uid : undefined;const r=attack(game,0,selectedAttackerUid,targetUid);act(r);if(!r.error){setSelectedAttackerUid(null);setSelectedTarget(undefined);}}}>Atacar seleccionado</button></div></div>
    </section>
    <section className="graveyard-panel"><div><span className="eyebrow">REGISTRO DEL DUELO</span><h2>Últimos acontecimientos</h2></div><div className="log-list">{game.log.slice(-5).reverse().map((entry,i)=><p key={`${game.log.length-i}-${entry}`}><span>{String(game.log.length-i).padStart(2,'0')}</span>{entry}</p>)}</div><div className="graveyard-counts"><button onClick={()=>setGraveyardView(0)}>Tu cementerio <b>{game.players[0].graveyard.length + game.players[0].extraGraveyard.length}</b> ↗</button><button onClick={()=>setGraveyardView(1)}>Cementerio rival <b>{game.players[1].graveyard.length + game.players[1].extraGraveyard.length}</b> ↗</button><span>Trampas activas <b>{game.players.reduce((n,p)=>n+p.backrow.filter(Boolean).length,0)}</b></span></div></section>
  </main>;

  const resultView = game && <main className="main-shell result-view"><div className={`result-seal ${game.winner===0?'win':game.winner===1?'loss':'draw'}`}>{game.winner===0?'勝':game.winner===1?'敗':'和'}</div><span className="eyebrow">DUEL RESULT · TURNO {game.turnNumber}</span><h1>{game.winner===0?'Victoria shinobi':game.winner===1?'Derrota honorable':'Empate'}</h1><p>{game.winner===0?'Tu estrategia ha superado a la IA.':game.winner===1?'El rival ha agotado tus Puntos de Voluntad o tus cartas. Revisa el registro y prueba otra estrategia.':'Ambos combatientes llegaron a 0 Puntos de Voluntad.'}</p><div className="result-scoreboard"><div><small>TÚ</small><b>{game.players[0].life.toLocaleString('es-ES')}</b><span>Puntos de Voluntad</span></div><div className="score-vs">VS</div><div><small>RIVAL SHINOBI</small><b>{game.players[1].life.toLocaleString('es-ES')}</b><span>Puntos de Voluntad</span></div></div><div className="result-stats"><span>Turnos jugados <b>{game.turnNumber}</b></span><span>Cartas en tu cementerio <b>{game.players[0].graveyard.length}</b></span><span>Victorias acumuladas <b>{progress.wins}</b></span></div><div className="result-actions"><button className="btn-primary" onClick={()=>openNewGame(false)}>Jugar otra vez ↗</button><button className="btn-secondary" onClick={()=>setScreen('deck')}>Cambiar mazo</button><button className="btn-secondary" onClick={()=>setScreen('home')}>Volver al inicio</button></div><div className="result-log"><h2>Registro final</h2>{game.log.slice(-8).reverse().map((entry,i)=><p key={`${i}-${entry}`}>{entry}</p>)}</div></main>;

  return <div className={`app-shell ${preferences.reducedMotion?'reduce-motion':''}`}>{header}{screen==='home'&&homeView}{screen==='deck'&&deckView}{screen==='collection'&&collectionView}{screen==='tutorial'&&tutorialView}{screen==='duel'&&duelView}{screen==='results'&&resultView}<footer className="app-footer"><span>忍 SHINOBI DUEL</span><span>PROTOTIPO DE FAN · SIN COMPRAS · GUARDADO LOCAL</span><button onClick={()=>setPreferences((p)=>({...p,reducedMotion:!p.reducedMotion}))}>{preferences.reducedMotion?'Activar animaciones':'Reducir animaciones'}</button></footer>
    {graveyardView!==null && game && <div className="modal-backdrop" role="presentation" onClick={()=>setGraveyardView(null)}><section className="card-detail-modal graveyard-modal" role="dialog" aria-modal="true" aria-label="Cementerio" onClick={(e: MouseEvent<HTMLElement>)=>e.stopPropagation()}><button className="modal-close" onClick={()=>setGraveyardView(null)} aria-label="Cerrar">×</button><span className="eyebrow">ZONA DE DESCARTE</span><h2>{graveyardView===0?'Tu cementerio':'Cementerio rival'}</h2><p>Las cartas destruidas, tributadas o utilizadas aparecen aquí. Pulsa una carta para consultar su efecto.</p><div className="graveyard-card-list">{[...game.players[graveyardView].graveyard, ...game.players[graveyardView].extraGraveyard].slice().reverse().map((item,index)=>{const card=CARD_BY_ID[item.cardId];return <button className="graveyard-card-row" key={`${item.uid}-${index}`} onClick={()=>{setDetailCard(card);setGraveyardView(null);}}><span className={`mini-stamp ${card.type}`}>{playIcon(card)}</span><span><b>{card.name}</b><small>{TYPE_LABEL[card.type]} · {card.cost} chakra</small></span><span className="graveyard-view-link">Ver ↗</span></button>;})}{game.players[graveyardView].graveyard.length+game.players[graveyardView].extraGraveyard.length===0&&<div className="empty-state">Este cementerio está vacío.</div>}</div></section></div>}
    {detailCard&&<div className="modal-backdrop" role="presentation" onClick={()=>setDetailCard(null)}><section className="card-detail-modal" role="dialog" aria-modal="true" aria-label={`Detalles de ${detailCard.name}`} onClick={(e: MouseEvent<HTMLElement>)=>e.stopPropagation()}><button className="modal-close" onClick={()=>setDetailCard(null)} aria-label="Cerrar">×</button><div className="detail-topline"><span className={`detail-stamp ${detailCard.type}`}>{playIcon(detailCard)}</span><div><span className="eyebrow">{TYPE_LABEL[detailCard.type]} · {RARITY_LABEL[detailCard.rarity]}</span><h2>{detailCard.name}</h2><span className="detail-cost">{detailCard.cost} chakra</span></div></div><p>{detailCard.description}</p><div className="detail-stats">{detailCard.atk!==undefined&&<div><small>ATK</small><b>{detailCard.atk}</b></div>}{detailCard.def!==undefined&&<div><small>DEF</small><b>{detailCard.def}</b></div>}{detailCard.rank&&<div><small>RANGO NINJA</small><b>{detailCard.rank}</b></div>}{detailCard.title&&<div><small>TÍTULO / EPÍTETO</small><b>{detailCard.title}</b></div>}{detailCard.status&&<div><small>ESTATUS</small><b>{detailCard.status}</b></div>}{detailCard.powerTier&&<div><small>CATEGORÍA DE PODER</small><b>{detailCard.powerTier}</b></div>}{detailCard.village&&<div><small>ALDEA</small><b>{detailCard.village}</b></div>}{detailCard.clan&&<div><small>CLAN</small><b>{detailCard.clan}</b></div>}{detailCard.organization&&<div><small>ORGANIZACIÓN</small><b>{detailCard.organization}</b></div>}{detailCard.team&&<div><small>EQUIPO</small><b>{detailCard.team}</b></div>}{detailCard.natures?.length&&<div><small>NATURALEZAS DE CHAKRA</small><b>{detailCard.natures.map((n)=>ELEMENT_ES[n]).join(', ')}</b></div>}{detailCard.jutsuElement&&<div><small>ELEMENTO DEL JUTSU</small><b>{ELEMENT_ES[detailCard.jutsuElement]}</b></div>}</div>{detailCard.effects&&detailCard.effects.length>0&&<div className="detail-effects"><h3>Efectos programados</h3>{detailCard.effects.map((effect,i)=><p key={i}><span>✦</span>{effect.text}</p>)}</div>}{detailCard.synergy&&<div className="detail-effects"><h3>Sinergia</h3><p><span>⌘</span>{detailCard.synergy.text}</p></div>}{detailCard.fieldBonus&&<div className="detail-effects"><h3>Efecto de campo</h3><p><span>⌘</span>{detailCard.fieldBonus.text}</p></div>}{detailCard.trigger&&<div className="detail-effects"><h3>Condición de activación</h3><p><span>⚑</span>Se activa ante: {detailCard.trigger==='attack'?'ataque enemigo':detailCard.trigger==='jutsu'?'jutsu enemigo':'invocación enemiga'}.</p>{detailCard.counterAction&&<p><span>⚑</span>Cancela la acción que la activa.</p>}</div>}{detailCard.extraKind&&<div className="detail-effects"><h3>Requisitos del Extra Deck</h3><p><span>影</span>{detailCard.extraKind==='transform'?'Transformación':'Invocación'} · anfitrión requerido: {detailCard.requiredHostIds?.map((id)=>CARD_BY_ID[id]?.name).join(' o ')}.</p>{detailCard.duration&&<p><span>⌛</span>Duración: {detailCard.duration} fin(es) de turno propios del anfitrión.</p>}</div>}<div className="detail-actions"><button className="btn-primary" onClick={()=>{setScreen('deck');setDetailCard(null);}}>Editar en constructor ↗</button><button className="btn-secondary" onClick={()=>setDetailCard(null)}>Cerrar</button></div></section></div>}
  </div>;
}

export default App;
