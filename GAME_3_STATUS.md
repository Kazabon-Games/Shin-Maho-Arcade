# Game 3 — Deliberation Summary
*Kazabon Game Studio / Shin Mahou Arcade — last updated 2026-07-08*

Naming note: **Kazabon Game Studio** is the developer. **Shin Mahou Arcade** is the browser platform/brand the studio publishes to. Keep these distinct — separately, "Wonderland" currently names *two* unrelated things: Game 1 (shipped survivor-roguelite, Monolith mythos) and the Persistent Narrative State Engine meta-framework for the Age of Wonder TTRPG. Neither of those is Game 3.

## Decided

- **Genre:** OFDP-style reflex/rhythm combat — binary left/right input, striding-attack feel, single-input-stream double-boss threat reading (not separate channels).
- **Character:** MC is **Rykndu**, rendered as a procedural stick-figure "doll rig" (joint/angle-based, not raster sprite art, not a reuse of Charles/DKMN).
- **Launch scope:** one unarmed fighting style at launch; Monolith-universe weapons bolt onto the rig later via attachment points.
- **Customization:** cosmetic skins as a system separate from weapons.
- **Rig philosophy:** built with future PvP-readiness as a design goal for the rig itself — PvP as a *feature* is still a separate, deferred backend/networking problem, not something good rig quality solves by itself.
- **Meta-progression ambition:** go maximal — deep unlockables plus a redemption-code/gift mechanism for post-launch surprises.
- **Cross-game economy:** yes in principle — a shared currency (e.g. Essence) should get a real sink in Game 3, not stay siloed to Wonderland.
- **MMORPG/rig lineage:** aspirational only, explicitly not shaping Game 3's scope — revisit after Game 5.
- **Path A vs. B (shared engine vs. shared patterns):** still open by design. New signal: the Wonderland TTRPG state engine's "model state before UI" discipline looks like real *cross-domain* evidence for Path B (shared patterns/technique, not shared code) — worth formalizing as a named, documented technique regardless of the eventual call.
- **Build approach for Game 3 itself:** live, in-conversation, code-first — build the rig, watch it move, let feel answer several open questions rather than deliberating them on paper.

## Still open — genuinely undecided

1. **Lane/input depth** — recommended binary input with a wider stride space rather than more lanes; not yet confirmed against a working rig.
2. **Session/run structure** — no shape yet (encounters per run, boss cadence).
3. **Redemption code mechanism** — versioned embedded code list (ships with file version bumps, consistent with existing convention) vs. a small externally-fetched code table (allows adding codes without re-shipping the whole file). Real architecture choice, not yet made.
4. **Currency schema specifics** — does Game 3 spend a shared currency directly, or earn its own currency that also feeds a shared pool? The shared economy schema itself isn't designed yet, and touching it means retrofitting Wonderland's save format too, not just adding to Game 3.
5. **Path A vs. B final call** — intentionally still deferred.
6. **Double-boss visual differentiation** — confirmed same input stream; how two simultaneous threats read clearly on screen is not yet designed.
7. **Accessibility for a fast-reflex genre** — reduced-motion/colorblind-safe threat-reading is a harder version of the studio's existing readability lesson than either prior game faced; not yet discussed.

## Current build status

- **File:** `rykndu-doll-rig-v0.1.1.html` — first rig prototype.
- **What exists:** joint hierarchy (pelvis → hip/knee legs, spine → shoulder/elbow arms, head), one idle breathing pose, a mirrored left/right kick sequence (windup → strike → recover) with input buffering, keyboard + tap-zone input, a mock incoming-enemy marker for connect-timing feel only (not real hit detection).
- **v0.1.0 → v0.1.1:** fixed a crash where the last phase of an attack sequence could read past the end of the sequence array before the end-of-sequence check ran; also fixed the pose-blend handoff to use the just-completed phase's actual target pose instead of a circular self-read.
- **Confidence status:** logically sound but unverified from the building side — Canvas rendering and feel can't be checked from this environment. Needs real eyes on a real device, which is actively in progress.
- **Pose angles and phase durations (110ms windup / 70ms strike / 220ms recover) are first guesses**, explicitly flagged as the first thing to hand-tune once the rig is being watched rather than read as code.

## Carrying this forward

This file plus the current rig `.html` are the two artifacts worth carrying into whatever comes next — re-uploaded into a fresh chat, dropped into a Claude Project's knowledge, or brought into Claude Code if this becomes a longer multi-session build with real version history. Either way, this doc is meant to make "wait, what did we already decide" answerable without re-explaining the last several conversations.
