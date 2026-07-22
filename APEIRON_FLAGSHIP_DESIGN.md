# APEIRON — Flagship Design Document
### The crux of Shin Mahou Arcade

**Status:** Draft for team review — working title, open to change
**Type:** Fresh self-contained document — not a fork, port, or reskin of the Rykndu prototype
**Built for:** Claude Code, as the studio's hardest and most integrated build to date
**Confidence labeling applies throughout this document.** Every claim below about what a system *will* do is a design intention, not a verified result — nothing here is "verified end to end" until it's actually built and run. Treat this file as the locked data model and intent, not a completion record.

---

## 0. Why this is a fresh build, not a reuse

The Rykndu prototype is a real, well-engineered file — eased pose transitions, a socket system, working combat resolution, test coverage. But its core animation model is FK pose-blending between a handful of hand-authored poses, and the recent finding (no walk cycle, kick angles solved for hit-timing fairness rather than art-directed for silhouette) showed the ceiling of that model: it can be *correct* without ever being *convincing*, because the poses themselves were never the point of iteration.

APEIRON is not that model extended. It's a physics-and-intent-driven rig from the ground up — joints exist as masses with real forces acting on them, IK resolves reaching and grounding as a constraint-solve rather than a lookup between two authored poses, and impact response is *computed*, not selected from a `flinch` pose. This is a genuinely new technical foundation for the studio, built once, correctly, with the Rykndu lessons as explicit guardrails (Section 8) rather than carried-forward code.

---

## 1. One-line pitch

A physics-reactive arena fighter where combat verbs are the four First Principles of the Wonderland cosmology — Distinction, Relation, Transformation, Persistence — made playable, with a fully reactive body that shows every hit instead of animating around it.

---

## 2. What "beyond what the studio currently has" concretely means

Every item below is a capability that does not exist anywhere in Games 1–4 or the Rykndu prototype. This section exists so "push beyond" stays a checkable claim, not a slogan.

| Capability | Current studio ceiling | APEIRON target |
|---|---|---|
| Rig motion model | Authored FK poses, blended | Constraint-solved IK + Verlet-driven secondary motion |
| Hit response | Selected from a fixed `flinch` pose | Computed from impulse magnitude/direction at the actual contact point |
| Audio | Oscillator nodes on the main thread | AudioWorklet-based custom DSP, off the main thread |
| Rendering | Canvas 2D only | Canvas 2D rig layer + a raw WebGL2 shader VFX layer, composited |
| Threading | Single-threaded | Physics/IK solved in a Worker against an OffscreenCanvas |
| Persistence | localStorage, per-game | Shared IndexedDB Essence ledger, read and written across games |
| Input | Keyboard/touch only | Keyboard/touch + Gamepad API |
| Design language | Combat moves named for genre convention (punch, kick) | Combat moves are the studio's own First Principles, expressed as mechanics |

> **Note (added post-review, v0.1.0):** the "current studio ceiling" row for Input is out of date — Gamepad API is already shipped and live in Infall, Iridescent Cosmology, and Wardfall, plus the Rykndu prototype. Treat Input as already met, not a target. See the engineering review below for the rest of the verification.

---

## 3. Core loop

1. Two fighters occupy a bounded arena.
2. Each fighter has access to four verb-classes (Section 4), not a fixed move list — the specific move within a verb-class is shaped by what's equipped/unlocked via Essence.
3. Hits apply real impulses to the rig; the resulting stagger, knockdown, or recovery is computed by the physics/IK layer, not authored per move.
4. An intensity value — built from proximity to knockout, recent hit volume, and match stakes — drives the adaptive score, the shader VFX layer, and hit-effect intensity as one shared signal, so the whole presentation escalates together instead of each system escalating on its own timer.
5. Match outcome feeds Essence into the shared ledger, which unlocks deeper Transformation forms and longer Persistence effects in future runs.

---

## 4. First Principles as mechanics

The Wonderland First Principles stop being lore and become the actual verb set:

- **Distinction** — separating something from its surroundings. Mechanically: a parry/counter that isolates an incoming attack from its follow-through, or a cutting attack that severs an opponent's active buff.
- **Relation** — binding two things together. Mechanically: a grapple, tether, or combo-link that binds the opponent's next action to yours (a forced trade, a linked stagger window).
- **Transformation** — changing a thing's nature mid-fight. Mechanically: a stance or element shift that changes what your existing verbs *do* without changing their input — the same button means something different after a Transformation is active.
- **Persistence** — making an effect outlast the moment. Mechanically: a damage-over-time field, a lingering ward, or a buff that survives past the exchange that created it.

Design rule: every move in the game must be classifiable under exactly one of these four, or it doesn't belong in APEIRON. This is the single clearest test for whether a proposed move is actually expressing the cosmology or just reskinning a generic fighting-game move with a fancy name — if it can't be argued as one of the four, cut it or send it to a different game.

---

## 5. Rig architecture

**Skeleton.** A single locked joint/bone schema (per the Rykndu consolidation plan's Section 1 discipline, applied fresh here) — but with mass and constraint data per joint from the start, not retrofitted later.

**Base motion: constraint-solved, not pose-blended.** Idle/walk/run are driven by a procedural gait solver (phase-based leg-swing driven by velocity, not a single idle pose translated across the screen — the exact gap found in the Rykndu prototype). IK resolves foot-planting and hand-reach against the actual arena geometry.

**Hit response: computed, not selected.** An impulse (magnitude + direction + contact joint) is applied directly to the rig's physics state. Stagger, knockdown, and recovery emerge from that impulse propagating through the joint chain and a recovery-torque model pulling the rig back toward a "recover" target pose — not from picking `flinch` off a shelf.

**Secondary motion.** Verlet-driven cloth/hair on cosmetic attachments, so a cape or hair visibly lags and snaps with the rig's actual motion rather than being static geometry.

**What stays deliberately simple:** no full ragdoll free-fall physics on knockout (that's a real step beyond even this — see Section 9 stretch goals). The rig is physics-*reactive*, not a full ragdoll simulation, as an explicit scope guardrail.

---

## 6. Presentation systems

**Audio.** AudioWorklet-hosted synthesis for the adaptive score and hit sounds, replacing the main-thread oscillator model. Reverb via a synthesized impulse response, not a sample file. Score intensity reads directly from the shared intensity value in Section 3.

**Visuals.** Canvas 2D handles the rig and arena; a separate WebGL2 context, composited via stacked canvases, handles shader-driven VFX (glow, distortion, chromatic aberration on big hits) tied to the same intensity value. Path2D caching for any static-shape geometry (arena elements, UI chrome) that doesn't need per-frame redraw.

**Threading.** Physics/IK solving runs in a Worker against an OffscreenCanvas, so the main thread stays free for input, UI, and audio scheduling even when both fighters are mid-exchange with cloth and shader effects active simultaneously.

**Input.** Keyboard/touch as baseline, Gamepad API as a first-class input path from the start rather than bolted on.

---

## 7. Essence ledger integration

The cross-game Essence ledger (IndexedDB, given the Game 5 upgrade plan's item 1.9) becomes load-bearing here for the first time rather than a system waiting for a purpose:

- Essence earned in APEIRON and imported from Games 1–3 unlocks deeper **Transformation** forms (more dramatic stance shifts) and longer **Persistence** durations.
- The ledger's schema must be locked (per the Game 5 upgrade plan's own sequencing) before this integration is built — do not design the ledger's data model and APEIRON's unlock logic in the same pass.
- This is a handoff relationship between documents (the ledger's state is written by one game and read by another), which means it needs the same import-validation discipline as any other file handoff in the studio's build protocol: a missing or malformed Essence record should fail loudly and legibly, not silently default to zero.

> **Note (added post-review, v0.1.0):** no "Game 5 upgrade plan" document currently exists anywhere in the org. Today's only Essence-shaped state is a single per-game `lifetimeEssence` field in Iridescent Cosmology's `localStorage` — there is no existing cross-game schema. This section's plan is sound, but its citation is aspirational, not a reference to real prior art; write that plan (or drop the citation) before treating the ledger schema as pre-existing.

---

## 8. Guardrails from the Rykndu findings

These are not optional nice-to-haves — they're the direct fixes for the two concrete problems the Rykndu review surfaced, made explicit so they can't quietly recur:

- **A real gait system ships before anything else does.** Movement is never "idle pose translated across the screen" at any point in the build, even in the earliest prototype milestone. This is checked by literally watching the rig move sideways in the first playable build, not inferred from code.
- **Every pose or motion curve gets an eyes-on tuning pass, separate from its correctness pass.** Hit-timing fairness (does the foot reach the target frame) and visual quality (does it look like it has weight) are two different reviews with two different pass/fail criteria — completing one is never treated as completing the other.
- **Scale and composition are checked at actual play size**, not assumed from a code review — the Rykndu recording showed a rig that read as small and distant on an actual phone screen despite looking fine as isolated canvas coordinates.

---

## 9. Suggested subagent ownership

Existing roles (`engineer`, `visual-art-director`, `audio-designer`, `qa-playtest`, `game-designer`, `devops-release`, `producer-status`) plus the three roles proposed in the Game 5 upgrade plan (Audio DSP Engineer, Shader/VFX Engineer, Performance Profiler) all apply here directly — APEIRON is the project those three roles were scoped for. One further role worth naming for this specific build:

**Combat Feel Director** — owns the eyes-on tuning pass from Section 8, as a review gate distinct from `engineer`'s correctness work and distinct from `visual-art-director`'s broader visual-language ownership. This role's entire job is answering "does this hit feel like it landed," on an actual device, and has authority to send a mechanically-correct move back for another pass on weight/timing alone.

---

## 10. Suggested phasing (Arcane Mandala, applied fresh)

1. **Phase 0** — scaffold, version marker, changelog block, from the first commit
2. **Phase 1** — skeleton + mass/constraint schema locked in writing before any rendering code
3. **Phase 1.5** — gait system built and verified moving on an actual device before any combat code starts (directly enforces Section 8's first guardrail)
4. **Phase 2** — IK + impulse-response hit reactions, single-threaded, verified correct before threading is introduced
5. **Phase 2.5** — Combat Feel Director tuning pass on the base gait and one full verb from each First Principle
6. **Phase 3** — AudioWorklet score + WebGL2 VFX layer, each verified independently before being wired to the shared intensity value
7. **Phase 3.5** — OffscreenCanvas/Worker migration, only after Phases 2–3 are stable single-threaded
8. **Phase 4** — Essence ledger integration, gamepad support, full pre-ship checklist

> **Note (added post-review, v0.1.0):** Phase 3.5 as written assumes the Phase 2 single-threaded render path can later "migrate" onto a Worker/OffscreenCanvas. `canvas.transferControlToOffscreen()` is one-way and irreversible — a canvas already rendering on the main thread cannot be handed to a worker later without rebuilding that render path. The OffscreenCanvas ownership boundary needs to be decided in Phase 1 (even if the worker is a no-op passthrough until Phase 3.5 actually wires it up), not deferred to 3.5 as a pure migration.

---

## 11. Scope guardrail

This design intentionally excludes, as explicit stretch goals rather than launch scope: full free-fall ragdoll on knockout, a roster beyond two fighters, and online multiplayer. Naming these as out-of-scope now is a structural decision, not a limitation to work around later — it keeps "push the stack" from silently becoming "build everything at once," which is the failure mode this document is trying to prevent.

---

## 12. Pre-ship checklist additions specific to APEIRON

- [ ] A named person has watched the base gait moving on an actual phone, not just in a desktop browser or a code read
- [ ] Every shipped move is classifiable under exactly one First Principle, with no exceptions logged as "temporary"
- [ ] Combat Feel Director has signed off on tuning separately from `engineer`'s correctness sign-off, for every verb
- [ ] Essence ledger read/write has been tested against a missing or malformed record, and fails loudly rather than defaulting silently
- [ ] Intensity value has been verified to drive audio, shader VFX, and hit-effect scale from one shared source, not three independently-tuned approximations of it
- [ ] A block/guard mechanic (distinct from parry) has been explicitly designed or explicitly cut — not left as a silent gap (Rykndu's prototype already has a guard-stamina system; decide whether APEIRON reuses that shape)
- [ ] Transformation-driven verb changes have been checked for PvP fairness between unequal Essence-progress players, not just for ledger data integrity
- [ ] The Relation forced-trade/tether mechanic has a named counterplay or escape window, not just a definition
