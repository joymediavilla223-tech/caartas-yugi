# Naruto: Shinobi Duel — MVP jugable

Prototipo de juego de cartas de fan, para un jugador contra una IA local. Se ejecuta en navegador con React, TypeScript y Vite. No usa imágenes remotas, cuenta, servidor, tienda ni compras.

> **Nota de propiedad intelectual:** es un proyecto de fan no oficial, sin afiliación con los titulares de Naruto. Los símbolos gráficos del prototipo son diseños tipográficos/CSS propios; no hay ilustraciones oficiales incluidas. Los nombres de personajes y técnicas se usan para identificar las cartas. Las estadísticas, costes, bonificaciones, duraciones y muchas representaciones de efectos son **decisiones de diseño para el juego**, no declaraciones sobre el canon.

## 1. Reglamento de la versión inicial

### Objetivo y preparación

- Cada jugador comienza con **8.000 Puntos de Voluntad**.
- El mazo principal contiene **exactamente 30 cartas** y permite hasta **3 copias de una misma carta**. Las cartas del Extra Deck no pueden incluirse en el mazo principal.
- El Extra Deck admite **hasta 6 cartas diferentes**, una copia de cada carta especial. Este límite es una decisión de diseño del MVP.
- Cada jugador roba 5 cartas al comenzar. El jugador inicial no roba al inicio de su primer turno; el segundo jugador sí roba 1 carta cuando comienza su primer turno.
- Cada jugador tiene cinco espacios de shinobi, tres espacios de sellos/trampas y acceso a un único campo global activo. Las trampas colocadas no se muestran al rival hasta que se activan.
- El inicio de partida, los turnos, los costes, el campo y los efectos se calculan en el motor del juego. La IA utiliza este mismo motor.

### Orden del turno

1. **Inicio:** el máximo de chakra del jugador activo aumenta en 1 hasta un máximo de 10; el chakra disponible se restablece a ese máximo. Se reinicia el límite de ataque de los shinobi de ese jugador. Se roba 1 carta, salvo el primer turno del jugador inicial.
2. **Fase principal:** se pueden invocar shinobi, usar jutsu, colocar sellos/trampas, activar un campo o activar cartas del Extra Deck. Las acciones consumen el chakra impreso. Una acción no legal no cambia el estado y la interfaz muestra el motivo.
3. **Fase de combate:** el jugador selecciona un shinobi atacante y, si el rival controla algún shinobi, debe seleccionar un shinobi rival como objetivo. Si el campo rival está vacío, puede atacar directamente a los Puntos de Voluntad. Cada shinobi puede declarar un solo ataque por turno.
4. **Fin:** expiran los estados temporales al terminar el turno de su propietario afectado. Las transformaciones descuentan duración al acabar el turno de su anfitrión. Después empieza el turno rival.

Se puede jugar un jutsu en la fase principal o en la de combate. Invocaciones normales, colocación de trampas, cambios de campo y activaciones del Extra Deck solo se permiten durante la fase principal. No se puede volver de combate a la fase principal.

### Chakra

El máximo inicial es 0. Al comenzar el primer turno pasa a 1; en cada turno propio aumenta en 1, sin superar 10. Al comienzo del turno, el jugador recupera el chakra hasta su máximo (no conserva un saldo parcial entre turnos). Los efectos de recuperación no pueden rebasar ese máximo. No se puede pagar un coste superior al chakra disponible.

### Invocaciones, tributos y límites de campo

- Una carta de tipo **Shinobi** se invoca desde la mano durante la fase principal y ocupa uno de los cinco espacios.
- Decisión de diseño para este MVP: una invocación normal de coste 1–4 no requiere tributos; una de coste 5–6 requiere exactamente 1; una de coste 7–10 requiere exactamente 2. Las cartas que se tributan se seleccionan en el propio campo y van al cementerio antes de entrar el shinobi nuevo.
- Se comprueba que el campo no quede con más de cinco shinobi después de los tributos. Una trampa que cancela una invocación impide que se pague el coste o se consuman los tributos; el shinobi permanece en la mano.
- No existe una regla de «mareo de invocación» en este prototipo: un shinobi recién invocado puede atacar ese turno si ya se está en combate y no está inmovilizado. Es una decisión de diseño.

### ATK, DEF, daño y destrucción

- **ATK** es la cantidad de daño que causa un ataque de un shinobi. **DEF** es la resistencia máxima que puede acumular ese shinobi antes de ser destruido; las heridas permanecen entre turnos.
- Los ataques y los jutsu que infligen daño reducen primero los escudos activos. El daño restante se suma a las heridas. Cuando las heridas alcanzan o superan la DEF efectiva actual, el shinobi es destruido y va al cementerio. Un escudo reduce daño, no aumenta DEF.
- Si un ataque destruye al objetivo, el exceso por encima de la DEF se resta de los Puntos de Voluntad de su controlador. El daño de jutsu no tiene exceso de combate; si un jutsu con objetivo «enemigo» no encuentra ningún shinobi enemigo, en este MVP su valor de daño se aplica a los Puntos de Voluntad del rival.
- Las sinergias y el campo activo pueden modificar ATK o DEF efectiva. La resistencia que se muestra en la interfaz se calcula con esa DEF efectiva. Los estados de mejora, debilitamiento e inmovilización se aplican por el número de finales de turno impreso en el efecto.

### Jutsu, sellos, trampas y resolución de efectos

- Un jutsu se paga, resuelve sus efectos en el orden definido en los datos de la carta y después va al cementerio. Si una trampa cancela el jutsu, el jutsu permanece en la mano y no paga chakra; la trampa puede tener su propio efecto adicional.
- Para jugar un jutsu dirigido, se puede tocar primero el objetivo deseado. Si no se elige uno, el motor usa un objetivo válido por defecto: el enemigo con más ATK para efectos enemigos, o el aliado con menos ATK para efectos aliados. Si no existe objetivo, el efecto sobre shinobi no se aplica (la excepción de daño directo de jutsu se describe arriba).
- Las trampas se colocan boca abajo durante la fase principal, pagan su coste al colocarse y ocupan un espacio de la zona de trampas. Se revelan, resuelven sus efectos y van al cementerio al dispararse.
- Las trampas se comprueban al declarar un ataque, al lanzar un jutsu o al invocar. Se resuelven de izquierda a derecha en la zona del jugador que recibe la acción. Todas las trampas compatibles se consumen y sus efectos se resuelven; si alguna cancela la acción, la acción principal no se ejecuta. El intento de ataque cancelado consume el ataque de ese shinobi.
- La resolución de una carta sigue el orden de sus efectos en los datos. Se comprueba la victoria tras los efectos que cambian Puntos de Voluntad o destruyen unidades. Las trampas no disparan otras trampas por resolver sus propios efectos: la cadena no es recursiva. La cantidad de respuestas queda limitada por los tres espacios de trampas.

### Elementos y naturaleza de chakra

Ciclo de ventaja empleado por el juego: **Fuego supera a Viento, Viento a Rayo, Rayo a Tierra, Tierra a Agua y Agua a Fuego**.

La naturaleza del shinobi y el elemento impreso en el jutsu son datos diferentes. Solo se aplica el ciclo a un efecto de daño de un jutsu que tenga elemento impreso, cuando golpea directamente a un shinobi que tiene naturaleza conocida. El motor compara el elemento del jutsu contra la **primera naturaleza** listada en la carta del defensor:

- Si el elemento del jutsu supera a la naturaleza defensora: **+2 daño**.
- Si la naturaleza defensora supera al jutsu: **−2 daño**, con mínimo 0.
- Si no hay relación directa o coinciden: no hay modificador.

Un shinobi sin naturaleza impresa, los ataques básicos, los efectos sin daño y las cartas sin elemento de jutsu no reciben modificador elemental. Si un personaje tiene varias naturalezas, las siguientes sirven como información de carta, pero la comprobación de combate usa la primera; es una simplificación declarada del MVP.

### Campos, sinergias y Extra Deck

- Solo puede haber **un campo global** activo. Al jugar otro, el anterior se retira y va al cementerio de su propietario. Las bonificaciones impresas del campo se aplican a los shinobi de ambos lados que cumplan la condición.
- Los bonos de sinergia se calculan automáticamente por equipo, clan o aldea entre aliados en el mismo campo. Los bonos de equipo/clan en las cartas son reglas de juego; no implican que todos los integrantes compartan siempre escuadrón en cada etapa del canon.
- Las transformaciones del Extra Deck requieren el anfitrión indicado en la carta, pagan chakra, no ocupan un segundo espacio y sustituyen las estadísticas impresas del anfitrión mientras duran. Los modificadores y estados de la unidad se mantienen. La duración baja al final de cada turno del anfitrión.
- Al expirar normalmente, la transformación vuelve al Extra Deck. Si el anfitrión abandona el campo antes, la carta transformada va al cementerio del Extra Deck. La carta «Apertura de las Cinco Puertas» destruye al anfitrión al expirar: es una consecuencia de balance diseñada para el juego, no una afirmación sobre el desenlace de una escena del canon.
- Las invocaciones del Extra Deck requieren que uno de los anfitriones indicados esté en el campo y un espacio libre. No consumen al anfitrión. Cuando una invocación especial es destruida, va al cementerio del Extra Deck.
- Si una trampa cancela una activación del Extra Deck, no se paga el coste ni se retira la carta del Extra Deck.

### Cementerio, fin de partida y límites

- Shinobi destruidos o tributados, jutsu usados, trampas activadas y campos reemplazados van al cementerio correspondiente. Las cartas especiales tienen una zona de cementerio del Extra Deck.
- Si un jugador debe robar y su mazo está vacío, pierde por agotamiento y sus Puntos de Voluntad llegan a 0. La partida termina cuando un jugador llega a 0. Si ambos llegan a 0 en la misma resolución, el resultado es empate.
- No hay bucles infinitos de efectos: los efectos se ejecutan una vez en el orden de la carta, las trampas no vuelven a dispararse por efectos de respuesta y las zonas tienen límites fijos. Si una acción es inválida, el motor devuelve un error sin aplicar su coste ni cambiar el estado (salvo las respuestas que ya se activaron en una acción legalmente declarada).

## 2. Arquitectura

```text
src/
  main.tsx                 Entrada React
  App.tsx                  Pantallas y composición de interfaz
  styles.css               Tema visual, cartas, tablero y responsive
  game/
    types.ts               Tipos y límites de las reglas
    cards.ts               40 cartas, efectos, sinergias y validación de mazo
    engine.ts              Estado, acciones, combate, turnos y resolución de efectos
    ai.ts                  Selección de jugadas heurística basada en el estado actual
    persistence.ts         Guardado local de mazo, partida, preferencias y progreso
    engine.test.ts         Pruebas de reglas, combate y IA con Vitest
    persistence.test.ts    Pruebas de guardado y restauración local
index.html
vite.config.ts
tsconfig.json
package.json
```

**Separación clave:** `engine.ts` no depende de React ni del DOM. `App.tsx` solo llama las acciones del motor y representa el estado. `ai.ts` propone jugadas mediante puntuaciones heurísticas y también llama al mismo motor; no usa resultados predeterminados. `cards.ts` centraliza las definiciones para que se puedan añadir cartas declarativas sin rehacer los componentes.

## 3. Cartas iniciales

Hay 40 cartas (16 shinobi, 11 jutsu, 4 sellos/trampas, 3 campos y 6 cartas del Extra Deck). Cada una tiene ID y coste; las cartas de personaje incluyen atributos y afiliaciones cuando procede. Los efectos de las 40 cartas usan las rutinas reales de `engine.ts` o sus propiedades declarativas (`fieldBonus`, `synergy`, `trigger`, `extraKind`).

| Grupo | Contenido |
|---|---|
| Shinobi | Naruto Uzumaki, Sasuke Uchiha, Sakura Haruno, Kakashi Hatake, Shikamaru Nara, Ino Yamanaka, Choji Akimichi, Hinata Hyuga, Rock Lee, Neji Hyuga, Gaara, Temari, Jiraiya, Tsunade, Itachi Uchiha, Zabuza Momochi. |
| Jutsu | Rasengan, Chidori, Bola de Fuego, Gran Avance, Dragón de Agua, Muro de Lodo, Posesión de Sombra, Puño Suave, Ninjutsu Médico, Clones de Sombra, Genjutsu del Sharingan. |
| Sellos/trampas | Sello Explosivo, Técnica de Sustitución, Sello de Reflejo, Sello de Bloqueo de Chakra. |
| Campos | Terreno de Entrenamiento, Valle del Fin, Bosque de la Muerte. |
| Extra Deck | Naruto: Modo Sabio, Sasuke: Marca Maldita nivel 2, Itachi: Susanoo, Invocación: Gamabunta, Invocación: Katsuyu, Rock Lee: Apertura de las Cinco Puertas. |

El reglamento y las cartas indican cuándo algo es una regla de balance del MVP. El modelo separa rango ninja, título/epíteto, clan, aldea, equipo y organización. Por ejemplo, `Akatsuki` se guarda como `organization`, y `Kazekage` como `title`, no como rango ninja.

## 4. Persistencia y ejecución

Se guarda en `localStorage`: mazo principal, Extra Deck, estado completo de la partida, preferencias de accesibilidad y contadores de victoria/derrota. Si se recarga la página durante el duelo, se intenta restaurar la partida guardada. No existe backend ni sincronización entre dispositivos.

### Ejecutar en ordenador

Se requiere Node.js 18+ (recomendado Node 20 o 22) y npm.

```bash
cd naruto-shinobi-duel
npm install
npm run dev
```

Abre la URL local que indique Vite (normalmente `http://localhost:5173`). Para verificar el build de producción y servirlo:

```bash
npm test
npm run build
npm run preview
```

### Ejecutar en Android

El proyecto es una aplicación web adaptable; no se distribuye como APK. En Android se puede usar un entorno local con Node.js/Termux (instalando Node y npm primero), copiar la carpeta del proyecto y ejecutar `npm install` y `npm run dev -- --host 0.0.0.0`. Para verla desde el mismo teléfono, abre en el navegador la URL local que indique Vite. Si la instalación de paquetes no está disponible, el motor puede inspeccionarse por separado, pero la interfaz React requiere las dependencias del `package.json`.

## 5. Pruebas y resultados comprobados

Pruebas automatizadas incluidas en `src/game/engine.test.ts` y `src/game/persistence.test.ts`:

- Contenido de al menos 40 cartas, mazo de 30 y validación de copias/Extra Deck.
- Mano inicial, Puntos de Voluntad, chakra inicial y robo al pasar el turno.
- Rechazo de costes imposibles, invocación y capacidad del campo, tributos.
- Ataque único por turno, bloqueo de ataques directos cuando el rival tiene shinobi, escudos y destrucción.
- Ventaja elemental, contra-jutsu por trampa, duración de inmovilización.
- Requisitos y expiración de transformaciones, victoria al llegar a 0 e iteración de la IA.
- Guardado/lectura de mazo y Extra Deck, reanudación de partida y preferencia/progreso local.

**Resultados ejecutados aquí:** 16 casos del motor + 3 casos de persistencia pasaron compilados y ejecutados bajo un pequeño harness local compatible con las aserciones utilizadas (`node:assert`); además pasaron 13 comprobaciones de humo directas del motor. También pasó el chequeo TypeScript estricto del núcleo y el chequeo TSX del proyecto usando declaraciones locales de compatibilidad para las dependencias que no pudieron instalarse. Estos últimos chequeos no equivalen a construir o abrir la aplicación en un navegador.

**Limitación honesta del entorno:** `npm install` no pudo completarse porque la resolución DNS del registro (`registry.npmjs.org`, error `EAI_AGAIN`) no estaba disponible. Por eso no pude ejecutar el runner real de `npm test`, `npm run build` ni abrir el navegador aquí. Los tests reales de Vitest están incluidos y deben ejecutarse después de instalar las dependencias. No considero verificados esos pasos hasta que se ejecuten con npm.

## 6. Hoja de ruta

### Versión 1.0 — persistencia remota e historia

- Backend y cuentas de usuario, autenticación y recuperación de cuenta.
- Guardado remoto de colección, mazos y progreso, con migraciones/versionado del estado.
- Campaña narrativa con rivales y reglas particulares, diálogos originales y progresión.
- Historial de partidas, estadísticas por mazo, desbloqueos y tutorial interactivo paso a paso.

### Versión competitiva — PvP

- Servidor autoritativo para el estado y validación de cada jugada.
- Matchmaking, sala privada, invitaciones, cola de conexión y clasificación.
- Turnos sincronizados con control de tiempo, reconexión y restauración de una partida tras desconexión.
- Pruebas de concurrencia, replay determinista, telemetría de equilibrio y detección de acciones ilegales.

### Contenido futuro

- Más cartas por aldea, clan, equipos y organizaciones; desafíos, amigos, clanes de jugadores y eventos.
- Partidas de práctica y modo espectador; filtros y herramientas de análisis de mazos.
- Recompensas y colección ampliada tras calibrar la economía.

### Economía y compras

Tienda, moneda premium y compras reales quedan explícitamente fuera del MVP. Antes de introducirlas, habría que probar la economía, evitar que el pago sustituya la estrategia, definir políticas de reembolso/privacidad y estudiar la clasificación por edades y las obligaciones legales aplicables.
