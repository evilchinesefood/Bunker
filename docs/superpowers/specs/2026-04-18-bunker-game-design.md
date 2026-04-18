# Bunker Game — Design Spec

**Date:** 2026-04-18
**Status:** Approved for implementation planning
**Stack:** TypeScript + Vite, vanilla DOM rendering, CSS-only graphics, localStorage persistence

## 1. Concept

A web-based, lean MVP of a Fallout Shelter-style underground-bunker resource-management sim. The player runs a post-nuclear bunker — building rooms, assigning named dwellers with stats to those rooms, balancing power/water/food, growing the population through pregnancies and walk-up recruits, and reacting to occasional fires and resource shortages. No combat, no exploration, no narrative — pure systems-driven sandbox.

The game is paced for light idle play: it ticks once per second while the tab is open, calculates an offline catch-up (capped at 8 hours) on return, and runs as an open sandbox with milestone toasts. Visual style is a retro green-on-black terminal palette using monospace type and Font Awesome icons.

## 2. Locked-in design choices

| Decision | Value |
|---|---|
| Scope | Lean MVP: 3 resources, 12 room types, ~22 dwellers max |
| Pacing | Light idle. 8-hour offline catch-up cap. No bad-event rolls offline. |
| Dwellers | Named, 4 stats (STR/INT/END/CHA), skill-matched rooms, stats train via training rooms. |
| Conflict | Resource shortage stress + occasional in-room fires. No combat, no raiders, no exploration. |
| Save | `localStorage` only, single auto-save slot, no cloud, no export, no slot picker. |
| Platform | Desktop only. Mouse + keyboard. No mobile/touch design. |
| Layout | Card-list — no spatial grid, rooms are stacked rows. |
| Population | Pregnancies (paired in Quarters) + walk-up recruits (Reception/Radio room). |
| Building | Build + 3-level upgrade. Demolish refunds a percentage. |
| Goal | Open sandbox with milestone toasts (no win screen). |
| Visual | Monospace green-on-black terminal palette + Font Awesome icons. |

## 3. Architecture

```
BunkerGame/
  index.html              mount point, loads main.ts
  src/
    Main.ts               boot: load save → start tick loop → mount UI
    State/
      GameState.ts        the single state type
      Reducers.ts         pure: assignDweller, buildRoom, upgradeRoom, tickSim, applyEvent
      Defaults.ts         starting state
    Sim/
      Tick.ts             one game tick (production/consumption/training/etc)
      Offline.ts          catch-up calculation when returning after time away
      Events.ts           event definitions + roll table
      Pregnancy.ts        pairing → gestation → birth (inheritable stats)
    Domain/
      Rooms.ts            room type catalog (immutable)
      Dwellers.ts         name generators, stat generation, level-up
      Resources.ts        resource constants + helpers
    Save/
      Storage.ts          localStorage write/read with version migration
    UI/
      Render.ts           top-level render: HUD + main + log
      Components/
        ResourceBar.ts
        RoomCard.ts
        DwellerList.ts
        BuildMenu.ts
        EventToast.ts
        MilestoneToast.ts
      Theme.css           terminal palette + Font Awesome import
  package.json
  vite.config.ts
  tsconfig.json
```

**Pattern:** single `GameState` object, pure reducer functions return new state, render is a single `render(state)` call after every state change or every tick. No framework, no virtual DOM — direct element-update patches. Same model proven in The Runed Deep.

## 4. Data model

```ts
type ResourceId = 'power' | 'food' | 'water'
type StatId     = 'str' | 'int' | 'end' | 'cha'

interface GameState {
  version: number
  tick: number                              // monotonic counter
  lastSaveTimestamp: number                 // wall-clock ms for offline calc
  resources: Record<ResourceId, number>     // current stockpile
  resourceCaps: Record<ResourceId, number>  // derived from production room levels
  caps: number                              // build currency
  rooms: Room[]
  dwellers: Dweller[]
  pregnancies: Pregnancy[]
  activeEvents: ActiveEvent[]
  eventLog: LogEntry[]                      // last ~50 entries
  milestones: string[]                      // IDs of milestones already triggered (Set serialized as array)
  rng: number                               // seeded RNG state — deterministic offline calc
}

interface Room {
  id: string                                // uuid
  typeId: string                            // refers to RoomCatalog
  level: 1 | 2 | 3
  assigned: string[]                        // dweller IDs
  hp: number                                // damaged by fire events
  fireActive: boolean
}

interface Dweller {
  id: string
  name: string
  stats: Record<StatId, number>             // 1-10
  xp: Record<StatId, number>                // accumulates while assigned to matching room
  location: string | null                   // room ID or null (idle/sleeping)
  hp: number                                // 0-100
  happiness: number                         // 0-100
  status: 'working' | 'idle' | 'sleeping' | 'pregnant' | 'sick' | 'training'
  partnerId: string | null
  ageDays: number                           // in-game days
  isChild: boolean
}

interface Pregnancy { motherId: string; fatherId: string; ticksRemaining: number }
interface ActiveEvent { id: string; typeId: 'fire'; roomId: string; startedTick: number; ticksRemaining: number }
interface LogEntry { tick: number; text: string; severity: 'info' | 'warn' | 'bad' | 'good' }
```

Catalog data lives in `Domain/` as immutable maps:

- `RoomCatalog[typeId]` — name, icon, statAffinity, baseProduction, baseCapacity, costPerLevel, demolishRefundPct, capBoostPerLevel
- `EventCatalog[typeId]` — duration, effect, weight in roll table

## 5. Simulation loop

**Tick rate:** 1 real-time second = 1 game tick. 60 ticks = 1 in-game minute. 1 in-game day ≈ 24 real minutes (tunable constant).

### Per-tick steps, in order

1. **Production** — for each room with assignments, add `production = baseProd × level × Σ(assignedDweller.stat[affinity]) / N` to the appropriate resource. Cap at `resourceCaps[res]`.
2. **Consumption** — `food` and `water` decrement by `dwellers.length × consumption_rate`. If a resource hits 0, set a `shortage` flag for that resource.
3. **Need decay** — every dweller loses small `happiness` if any shortage active; loses small `hp` if shortage persists past N ticks. **If a dweller's hp reaches 0, they die: removed from roster, log entry + toast, partner becomes single.** Medbay heals low-HP dwellers before death if assigned in time.
4. **Stat training** — each working dweller gains tiny `xp` in the room's affinity stat; xp threshold → stat increments (cap 10).
5. **Pregnancy advance** — decrement `ticksRemaining` on each pregnancy; on hit-zero, spawn a child dweller (stats = inherited average ± noise, `isChild: true`, `ageDays: 0`).
6. **Aging** — every N ticks (default: 1 in-game day = aging tick), increment dweller `ageDays`. Children age up to adults at `ageDays >= CHILD_TO_ADULT_DAYS` (default: 3 in-game days ≈ 72 real minutes). Adults do not age further (no death by old age in MVP).
7. **Active events** — decrement event timers, apply per-tick effects (fire: damages room hp, risks dweller hp), expire when 0.
8. **Event roll** — once per minute, roll against `EventCatalog` weight table.
9. **Walk-up recruit roll** — once per N minutes, low-prob roll modified by Radio room level + assigned CHA; spawn recruit if housing capacity available.

### Offline catch-up (`Sim/Offline.ts`)

On boot, compute `elapsed = min(now - lastSaveTimestamp, 8h)`. Then:

- Batch-compute steady-state production/consumption assuming current assignments held the entire elapsed period.
- Apply averaged effects: resource fill (capped), happiness drift, stat xp gain.
- Pregnancies advance by elapsed ticks (births handled in batch).
- **Skip event rolls offline** (no fires while you were away).
- Show "Welcome back" toast summarizing what happened.

**Driver:** `setInterval(tick, 1000)` while tab visible. `requestAnimationFrame` for render only. Pause on `document.hidden`; on visibilitychange resume → run offline catch-up if gap > 5 sec.

## 6. UI

Single page, three regions + modals + toasts. Desktop layout, fixed-ish width.

```
┌──────────────────────────────────────────────────────────────────────┐
│ ⚡ POWER 412/500 +12/m   💧 WATER 88/300 −2/m   🍴 FOOD 240/300 +4/m │ ← top HUD
│                                              💰 CAPS 1,250           │
├──────────────────────────────────────────────────┬───────────────────┤
│ ROOMS                              [+ BUILD]     │ DWELLERS  18/22   │
│ (room cards, click to expand for slots/actions)  │ (dweller list)    │
├──────────────────────────────────────────────────┴───────────────────┤
│ LOG (last ~5 entries visible, scrollable)                            │
└──────────────────────────────────────────────────────────────────────┘
```

### Interactions

- **Click a room** → expands inline to show: assigned dweller chips, "+ assign" empty slots, [Upgrade Nc] / [Demolish] buttons.
- **Click + BUILD** → modal with grid of buildable room types (cost in caps, brief description, affinity).
- **Click a dweller name** → modal with full stats, partner status, history, [Reassign] dropdown.
- **Toasts** slide in bottom-right for events, milestones, births. Auto-dismiss after 8 sec; click to dismiss early.
- **Persistent banner** at top if any resource at 0 — red blink: "⚠ OUT OF WATER — DWELLERS DEHYDRATING".
- **Gear icon** top-right → small menu: Reset Bunker (with confirm).

No tabs, no menu screens. All detail through modals.

## 7. Save / load

- **Single auto-save** in `localStorage` under key `bunkergame_save`.
- **Format:** JSON of full `GameState` (small — a few KB even at 22 dwellers).
- **Save trigger:** every 20 game ticks (20 sec) AND on `visibilitychange` (tab hide).
- **Load trigger:** on boot — read key, run version migration if `state.version !== CURRENT_VERSION`, then run offline catch-up.
- **Reset:** button in gear menu → confirm modal → wipes save + restarts.
- **Set serialization:** `milestones` is logically a Set; serialize/deserialize as array.
- **RNG state saved** so offline calc is deterministic across reloads.

## 8. Content catalog

### Room types (12)

| Room | Icon (Font Awesome) | Affinity | Purpose |
|---|---|---|---|
| Power Plant | `fa-bolt` | STR | Produces power. Each upgrade also raises power cap. |
| Water Treatment | `fa-droplet` | INT | Produces water. Each upgrade also raises water cap. |
| Hydroponics | `fa-seedling` | INT | Produces food. Each upgrade also raises food cap. |
| Quarters | `fa-bed` | — | Housing capacity. Pairs assigned here can conceive. |
| Medbay | `fa-kit-medical` | INT | Heals sick / low-HP dwellers. |
| Workshop | `fa-hammer` | STR | Produces caps (build currency). |
| Gym | `fa-dumbbell` | — | Trains STR of assigned dwellers. |
| Classroom | `fa-book` | — | Trains INT. |
| Track | `fa-person-running` | — | Trains END. |
| Bar | `fa-mug-saucer` | — | Trains CHA + small happiness boost to assigned dwellers. |
| Lounge | `fa-couch` | — | Passive happiness recovery for idle dwellers (no assignment). |
| Radio | `fa-tower-broadcast` | CHA | Boosts walk-up recruit chance + small caps trickle. |

**Resource cap rule:** Storage rooms removed. Each production room upgrade raises the cap of its own resource (e.g., Power Plant Lv2 → +100 power cap, Lv3 → +150). Removes a class of "dead" rooms; rewards investing in your producers.

### Stats (4)

`STR` (Power Plant, Workshop work; trained in Gym)
`INT` (Water Treatment, Hydroponics, Medbay work; trained in Classroom)
`END` (consumption resilience; trained in Track)
`CHA` (Radio recruit boost; trained in Bar)

Cap: 10. Train via training rooms.

### Resources (3 + currency)

Power, water, food. Caps as build currency (earned in Workshop + small Radio trickle).

### Events (1 + 1 implicit)

- **Fire** — random, in a working room. Dwellers in the room auto-fight. ~30 sec duration. Risks dweller HP, damages room HP. Logged & toasted.
- **Resource shortage** — implicit, not a discrete event but applies stress when a resource hits 0 (banner + happiness/HP decay).

### Milestones (~6)

First Birth, Pop 10, Pop 25, Pop 50, First Lv-3 Room, 1 In-Game Year Survived. Toast + log entry only.

### Starting state

5 dwellers (procedurally named, randomized stats 3-7), 1 Power Plant Lv1, 1 Water Treatment Lv1, 1 Hydroponics Lv1, 1 Quarters Lv1 (housing cap 4 — pressure to build a 2nd quarters early), 200 caps, all resources at 50, resource caps 100/each.

## 9. Out of scope (explicitly)

- Combat / raiders / wasteland exploration
- Equipment / weapons / outfits
- Multiple save slots, cloud sync, save export
- Mobile / touch controls
- Sound / music
- Themes beyond the terminal palette
- Tutorial / story / narrative beats
