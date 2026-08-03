---
name: difficulty-curve-calibration
description: Use when setting or reviewing a game's difficulty curve, pacing bounds, or phase-transition thresholds (spawn timing, enemy scaling, phase-shot counts) before a real human playtest exists — or when a handover doc names its difficulty numbers as "an estimate, no real data yet." Turns that recurring named gap into a repeatable calibration process instead of an apology repeated in every handover doc.
---

# Difficulty Curve Calibration

**Why this exists:** Wardfall's own handover names `PHASE_BOUNDS_SHOTS` as
"an estimate, no real playtest data yet" as its #1 stated gap, and
Iridescent Cosmology named the same category of gap before it — this has
recurred on every game shipped so far, not once. `GAME_4_PREP.md` §3 named
a calibration skill as a candidate specifically because a *recurring*
named gap, repeated in handover doc after handover doc, is exactly the
signal that a process is missing, not that playtesting itself is
optional.

## The actual problem this solves

A difficulty curve set once at design time (spawn rate at time T, enemy HP
scalar at wave N, phase-transition shot counts) is a guess dressed as a
constant. It's not wrong to ship a guess — every game before real playtest
data has to — but it's wrong to let that guess sit unflagged as if it were
calibrated, and it's wrong to have no process for turning it into real data
once players exist.

## Before shipping: label every difficulty constant honestly

Any numeric constant that gates pacing/difficulty (spawn intervals, HP/damage
scalars keyed to elapsed time or wave count, phase-transition thresholds)
gets one of two labels in its own comment or the handover doc's gap list:
- **Estimated** — chosen by intuition/playtesting-by-the-builder, no
  broader human data behind it yet. State this plainly, the way Wardfall's
  handover already does for `PHASE_BOUNDS_SHOTS` — don't let a confident
  variable name imply more certainty than exists.
- **Measured** — set or adjusted from actual logged play data (see below).

## How to actually calibrate once real play exists

1. **Instrument before you guess again.** Log, per real playthrough: time
   to each phase transition, deaths (with elapsed time + player state at
   death), any point where the player disengaged (idle >N seconds, quit
   mid-run) — the same "measure, don't assume" discipline this studio
   already applies everywhere else (the Drain lifesteal bug was only
   caught by measuring hp/sec, not by reading the formula).
2. **Compare logged outcomes against the intended pacing target**, stated
   explicitly before looking at the data (e.g. "a skilled player should
   reach phase 2 around 90s, an average player around 130s") — calibration
   without a stated target just produces a curve that matches whatever
   happened to occur, not one that matches design intent.
3. **Adjust the smallest number of constants that explains the gap.**
   Mirror `game-designer`'s own standing discipline here: check whether a
   pacing miss is one axis or a compounding interaction between axes
   (spawn rate *and* HP scalar both drifting the same direction) before
   changing either — the Drain bug was a lesson about compounding
   multipliers specifically because a fix that addresses only the axis a
   playtest happened to name can leave a second one live.
4. **Re-measure after the adjustment**, don't assume the new constant is
   correct because the math looks more reasonable — the same live-verification
   standard as every other studio system.
5. **Update the constant's label from Estimated to Measured**, and note
   the sample size behind it (even "measured across 3 informal
   playthroughs" is more honest than an unlabeled guess) — small-sample
   "measured" is still meaningfully more grounded than zero-sample
   "estimated," but shouldn't be reported with more confidence than the
   sample size supports.

## Reporting

State plainly, per the studio's name-the-gap discipline: which constants
are Estimated vs. Measured, what sample size backs any Measured value, and
which specific pacing target (if any) a Measured value was calibrated
against. "Balance feels about right" is not a finding — a stated target,
a logged outcome, and the delta between them is.
