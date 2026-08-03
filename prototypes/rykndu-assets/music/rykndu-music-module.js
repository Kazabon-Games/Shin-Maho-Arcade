// Rykndu — Music module (REFERENCE COPY, not loaded at runtime)
//
// This is a staged copy of the exact code living inside
// prototypes/rykndu-doll-rig.html — the single-file convention every
// studio game follows stays intact; this file exists purely as a staged
// reference for anyone extending the score, per MUSIC_DIRECTION.md's own
// "assets are a design/reference layer, not a build dependency" framing.
//
// Canonical source of truth: rykndu-doll-rig.html's own `const Music =
// (function () { ... })();` block. If this copy and the game file ever
// disagree, the game file is correct — update this copy to match, the
// same relationship a .claude/skills/ file has to the game code it
// documents, never the other way around.
//
// Read MUSIC_DIRECTION.md first for the full design rationale, most
// importantly: NO ConvolverNode anywhere in this module —
// tests/rig-audio.js §6 asserts zero across the whole session (a
// deliberate, already-tested "stay dry" decision from the v0.1.6 quality
// pass), so the standard adaptive-game-audio synthesized-reverb technique
// is deliberately not used here.

const Music = (function () {
  let ctx, master, duckGain, droneFilter, started = false;
  let voices = [];
  let targetIntensity = 0, intensity = 0;

  // cancel-then-set-then-ramp -- the mandatory idiom (adaptive-game-audio)
  // for every SCHEDULED gain change. Never used for tick()'s per-frame
  // writes below, which are already smoothed in JS and use direct .value
  // assignment instead -- mixing the two patterns on the same AudioParam
  // is the exact "dying sticks the music" bug this rule exists to prevent.
  // Not a risk here by construction: rampGain only ever touches
  // duckGain.gain, tick() only ever touches droneFilter.frequency and a
  // drone voice's own gain -- disjoint AudioParams, not just disjoint timing.
  function rampGain(param, target, seconds) {
    const t = ctx.currentTime;
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(target, t + seconds);
  }

  function ensureCtx() {
    if (started) return;
    ctx = SFX.getCtx();
    const bus = SFX.getBus();
    master = ctx.createGain(); master.gain.value = 0.0001;
    duckGain = ctx.createGain(); duckGain.gain.value = 1;
    droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass'; droneFilter.frequency.value = 400;
    master.connect(duckGain); duckGain.connect(droneFilter); droneFilter.connect(bus);
    // Three detuned low voices -- root (~C2), a near-unison detune (tension
    // shimmer once the second voice fades in via tick(), see below), and a
    // fifth (~G2). Frequencies picked deliberately clear of every SFX
    // voice's own magic numbers (240/55/200/206/400/550/750/880/1320Hz) so
    // this drone can never be mistaken for an SFX oscillator by
    // tests/rig-audio.js's type/frequency filters.
    const roots = [65.41, 65.74, 98.0];
    voices = roots.map((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = i === 1 ? 0.0001 : (i === 2 ? 0.16 : 0.24);
      o.connect(g); g.connect(master);
      o.start();
      return { o, g };
    });
    started = true;
    rampGain(master.gain, 0.13, 1.4); // fade in on real audio start, not an instant on/off
  }

  // Continuous per-frame smoothing -- called from frame() every tick,
  // NOT event-gated. Direct .value writes only, per the rule above.
  function tick() {
    if (!started) return;
    intensity += (targetIntensity - intensity) * 0.03;
    droneFilter.frequency.value = 380 + intensity * 1500;
    voices[1].g.gain.value = 0.10 + intensity * 0.20;
  }

  // 0..1, set every frame by the caller from real combat state (see
  // GAME_5_PILLARS.md-adjacent callers in frame() below) -- the actual
  // "mood as a live input" mechanism, not a fixed track swap.
  function setIntensity(v) { targetIntensity = Math.max(0, Math.min(1, v)); }

  // Sidechain-style duck on a punctuating hit (strike connect, parry) --
  // the one genuinely one-shot, SCHEDULED event in this module, so it
  // correctly uses rampGain (the dip) + setTargetAtTime (the recovery),
  // never tick()'s continuous-write pattern.
  function duck() {
    if (!started) return;
    rampGain(duckGain.gain, 0.35, 0.03);
    duckGain.gain.setTargetAtTime(1, ctx.currentTime + 0.05, 0.12);
  }

  return {
    ensureCtx, tick, setIntensity, duck,
    _test: { isStarted: () => started, intensityValue: () => intensity, targetIntensityValue: () => targetIntensity }
  };
})();

// Call sites in the real game file (for reference — not re-implemented here):
//   - SFX.ensureCtx() calls Music.ensureCtx() at its own end, so Music
//     always comes alive at exactly the same real-user-gesture moments
//     SFX already does. No separate init call site needed anywhere else.
//   - frame() computes a 0..1 musicIntensity from real combat state each
//     frame (closest enemy's travel fraction in Gauntlet, a flat elevated
//     baseline while a Duel is live) and calls Music.setIntensity(...)
//     then Music.tick().
//   - Music.duck() is called alongside every SFX.strikeImpact()/
//     SFX.parryChime() call site (both the Gauntlet kill path and the
//     Duel resolveDuelHit() path).
