# BUNKER

A lean, Fallout-Shelter-style underground bunker sim. Build rooms, assign named dwellers with stats, balance power / water / food, and grow the population through pregnancies and walk-up recruits.

**Live:** https://dev.jdayers.com/bunker/
**Stack:** TypeScript · Vite · vanilla DOM · CSS-only graphics · localStorage persistence
**Style:** retro green-on-black terminal · monospace · Font Awesome icons

---

## Features

- **3 resources:** Power, Water, Food (all produced by assigned dwellers)
- **12 room types:** Power Plant, Water Treatment, Hydroponics, Quarters, Medbay, Workshop, Gym, Classroom, Track, Bar, Lounge, Radio
- **4 stats** per dweller: STR / INT / END / CHA — stats train while working in their affinity room or in dedicated training rooms
- **Pregnancies:** pair assigned Quarters dwellers; children inherit averaged stats + noise, age up to adults over in-game days
- **Walk-up recruits:** rolled from Radio room, boosted by CHA
- **Fires:** random in-room hazard — assigned dwellers auto-fight, can die from smoke
- **Build + 3-level upgrade + demolish refund**
- **Milestones:** First Birth · Pop 10/25/50 · First Lv-3 Room · 1 In-Game Year Survived
- **Single auto-save** to `localStorage`; versioned schema with validation + migration
- **Sound:** Web Audio synth beeps for all events (toggle in gear menu)
- **Keyboard:** Escape closes menus; Enter/Space toggles cards; Tab navigates buttons
- **Accessibility:** ARIA roles, live regions, focus-visible, `prefers-reduced-motion`, semantic landmarks

---

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173/
npm run build      # outputs dist/
npm run preview    # serves built dist/
```

## Layout

```
src/
  Main.ts               boot + game loop + save scheduler
  State/
    GameState.ts        types + constants
    Defaults.ts         starter state
    Reducers.ts         assign / build / upgrade / demolish / log / caps
  Sim/
    Tick.ts             production · consumption · decay · training · aging · events
    Offline.ts          (vestigial — offline progress is disabled; game is active-play)
    Events.ts           fire rolls + damage
    Pregnancy.ts        pair-up · conceive · advance · birth · recruit
  Domain/
    Rooms.ts            catalog of 12 room types
    Dwellers.ts         name + stat generation, inheritance
    Resources.ts        constants
    Rng.ts              seeded mulberry32 RNG
  Save/
    Storage.ts          validate + migrate + localStorage I/O
  UI/
    Render.ts           renderApp (tick) + renderOverlays (ui-change)
    UiState.ts          ephemeral UI + prefs
    Audio.ts            Web Audio synth SFX
    Theme.css           terminal palette, scrollbars, responsive
    Dom.ts              tiny h() helper
    Components/         ResourceBar · RoomCard · DwellerList · BuildMenu ·
                        DwellerModal · ConfirmModal · GearMenu · Toasts · AssignMenu
public/
  favicon.svg
index.html
vite.config.ts
tsconfig.json
```

## Controls

- **Click a room** to expand; **Enter/Space** also toggles when focused
- **+ assign** on an empty chip opens the dweller picker — shows each adult's current location
- **×** on an assigned chip unassigns them
- **Gear icon** (top-right) opens settings: sound toggle, reset bunker
- **Escape** closes any open menu / modal / expanded room

## Design doc

The full design spec lives at `docs/superpowers/specs/2026-04-18-bunker-game-design.md`.

## Credits

- **Font Awesome Free 6.5.2** — icons (CC BY 4.0)
- Built with Claude Code as pair-programmer
