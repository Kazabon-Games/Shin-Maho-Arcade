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
// v2 (2026-08-03, apex-standard pass): per-mode identity (Gauntlet vs
// Duel), a real Duel proximity/clash-voice signal, a Gauntlet-only
// heartbeat pulse, a signature-motif bell() stinger (parry/ring-out/
// match-win), and a reduced-audio intensity cap. Read MUSIC_DIRECTION.md
// first for the full design rationale, most importantly: NO ConvolverNode
// anywhere in this module — tests/rig-audio.js §6 asserts zero across the
// entire session (a deliberate, already-tested "stay dry" decision from
// the v0.1.6 quality pass), so the standard adaptive-game-audio
// synthesized-reverb technique is deliberately not used here, including
// in v2's stingers (bell() below routes to sfxGain, never through a
// convolver).

const Music = (function () {
  let ctx, bus, sfxGain, master, duckGain, droneFilter, clashVoice, started = false;
  let voices = [];
  let targetIntensity = 0, intensity = 0;
  let targetDuelProximity = 0, duelProximity = 0;
  let mode = 'gauntlet';
  let reducedAudio = false;
  let nextHeartbeatAt = 0;

  // cancel-then-set-then-ramp -- the mandatory idiom (adaptive-game-audio)
  // for every SCHEDULED gain change. Never used for tick()'s per-frame
  // writes below, which are already smoothed in JS and use direct .value
  // assignment instead -- mixing the two patterns on the same AudioParam
  // is the exact "dying sticks the music" bug this rule exists to prevent.
  function rampGain(param, target, seconds) {
    const t = ctx.currentTime;
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(target, t + seconds);
  }

  function ensureCtx() {
    if (started) return;
    ctx = SFX.getCtx();
    bus = SFX.getBus();
    sfxGain = SFX.getSfxGain(); // stingers route here, not through droneFilter -- must not get swallowed by whatever the lowpass cutoff happens to be
    master = ctx.createGain(); master.gain.value = 0.0001;
    duckGain = ctx.createGain(); duckGain.gain.value = 1;
    droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass'; droneFilter.frequency.value = 400; droneFilter.Q.value = 0.7;
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
    // Duel-only clash voice: tritone of the C2 root, one octave up
    // (F#3, 185.00Hz) -- the score's one dissonant interval, reserved for
    // Duel specifically (a tritone has no home key, fitting two evenly-
    // matched opponents in unresolved conflict). Gauntlet's threat is
    // known/physical, so it's handled by rhythm (the heartbeat below)
    // instead, never by pitch -- silent (gain ~0) whenever mode isn't 'duel'.
    const cv = ctx.createOscillator(); cv.type = 'sawtooth'; cv.frequency.value = 185.00;
    const cvg = ctx.createGain(); cvg.gain.value = 0.0001;
    cv.connect(cvg); cvg.connect(master);
    cv.start();
    clashVoice = { o: cv, g: cvg };
    started = true;
    rampGain(master.gain, 0.13, 1.4); // fade in on real audio start, not an instant on/off
  }

  // Continuous per-frame smoothing -- called from frame() every tick,
  // NOT event-gated. Direct .value writes only, per the rule above.
  // Not a risk mixing with rampGain()'s scheduled automation: tick() only
  // ever touches droneFilter.frequency/Q, a drone voice's own gain, and
  // clashVoice's gain -- disjoint AudioParams from duckGain.gain, the only
  // param rampGain() ever schedules against.
  function tick() {
    if (!started) return;
    intensity += (targetIntensity - intensity) * 0.03;
    duelProximity += (targetDuelProximity - duelProximity) * 0.03;

    const duel = mode === 'duel';
    droneFilter.Q.value = duel ? 2.2 : 0.7;
    droneFilter.frequency.value = (duel ? 520 : 380) + intensity * 1500;
    voices[1].g.gain.value = 0.10 + intensity * 0.20;
    clashVoice.g.gain.value = duel ? (0.0001 + duelProximity * 0.16) : 0.0001;

    // Gauntlet-only heartbeat: a real elapsed-time lookahead scheduler,
    // sub-bass sine sweep 90->42Hz, interval shortens as intensity rises
    // -- the "closing physical threat" made audible as a literal pulse.
    if (!duel && !reducedAudio && ctx.currentTime >= nextHeartbeatAt) {
      fireHeartbeat();
      nextHeartbeatAt = ctx.currentTime + Math.max(0.4, 1.15 - intensity * 0.75);
    }
  }

  function fireHeartbeat() {
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05 + intensity * 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    g.connect(duckGain); // rides the same duck+droneFilter chain as the drone; cutoff never attenuates it (always >=380Hz, well above 42-90Hz)
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    o.connect(g); o.start(t); o.stop(t + 0.22);
  }

  // 0..1, set every frame by the caller from real combat state -- the
  // actual "mood as a live input" mechanism, not a fixed track swap.
  function setIntensity(v) { targetIntensity = Math.max(0, Math.min(1, v)); }
  // 0..1, Duel-only: how close the two rigs currently are, drives the
  // clash voice directly (not blended through the general intensity).
  function setDuelProximity(v) { targetDuelProximity = Math.max(0, Math.min(1, v)); }
  function setMode(m) { mode = m; }
  // Reduced-motion-equivalent audio cap (MUSIC_DIRECTION.md's own named
  // v2 gap) -- silences the driving Gauntlet heartbeat specifically, the
  // audio equivalent of screen shake, mirroring shakeMag's existing
  // reducedMotion-gated convention elsewhere in this file.
  function setReducedAudio(v) { reducedAudio = !!v; }

  // Sidechain-style duck on a punctuating hit (strike connect, parry) --
  // the one genuinely one-shot, SCHEDULED event among the continuous
  // writes above, so it correctly uses rampGain (the dip) + setTargetAtTime
  // (the recovery).
  function duck() {
    if (!started) return;
    rampGain(duckGain.gain, 0.35, 0.03);
    duckGain.gain.setTargetAtTime(1, ctx.currentTime + 0.05, 0.12);
  }

  // bell() -- same fundamental+2.01x-overtone sine idiom as sigilchain.html
  // / iridescentcosmology.html, minus the reverb send: connects to
  // sfxGain, never droneFilter, so a stinger can't get swallowed by
  // whatever the drone's lowpass cutoff happens to be that instant.
  function bell(freq, dur, vol) {
    if (!started) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.5));
    g.connect(sfxGain);
    const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2.01;
    const g2 = ctx.createGain(); g2.gain.value = 0.28;
    o2.connect(g2); g2.connect(g); o1.connect(g);
    o1.start(t); o2.start(t);
    o1.stop(t + (dur || 0.5) + 0.05); o2.stop(t + (dur || 0.5) + 0.05);
  }

  // Signature motif: an open perfect fifth, C6/G6 -- checked >100Hz clear
  // of every existing SFX/drone frequency. Never a full triad anywhere in
  // this score (matches the drone's own C+G-only harmony) -- every accent
  // event below uses these same two pitches so one consistent "moment of
  // consequence" signature covers all of them.
  const MOTIF_ROOT = 1046.50, MOTIF_FIFTH = 1567.98;

  function parryStinger() { bell(MOTIF_FIFTH, 0.18, 0.09); } // one quiet grace-note under SFX.parryChime()'s existing 880/1320 tones
  function ringOutStinger() {
    bell(MOTIF_ROOT, 0.16, 0.14);
    setTimeout(() => bell(MOTIF_FIFTH, 0.24, 0.16), 70);
  }
  function matchWinStinger() {
    bell(MOTIF_ROOT, 0.3, 0.18);
    setTimeout(() => bell(MOTIF_FIFTH, 0.35, 0.2), 130);
    setTimeout(() => bell(MOTIF_ROOT, 0.5, 0.22), 320);
    setTimeout(() => bell(MOTIF_FIFTH, 0.9, 0.26), 500); // landing ring
  }

  return {
    ensureCtx, tick, setIntensity, setDuelProximity, setMode, setReducedAudio, duck,
    parryStinger, ringOutStinger, matchWinStinger,
    _test: {
      isStarted: () => started,
      intensityValue: () => intensity,
      targetIntensityValue: () => targetIntensity,
      duelProximityValue: () => duelProximity,
      modeValue: () => mode,
      clashVoiceGain: () => clashVoice ? clashVoice.g.gain.value : null,
      droneFilterQ: () => droneFilter ? droneFilter.Q.value : null
    }
  };
})();

// Call sites in the real game file (for reference — not re-implemented here):
//   - SFX.ensureCtx() calls Music.ensureCtx() at its own end, so Music
//     always comes alive at exactly the same real-user-gesture moments
//     SFX already does. No separate init call site needed anywhere else.
//   - frame() computes musicIntensity from real combat state each frame,
//     branching on whichever mode is currently visible (SHOW_GAUNTLET vs
//     SHOW_P2 -- see GAME_5_PILLARS.md §3): closest live enemy's travel
//     fraction in Gauntlet; in Duel, a composite of wall-to-wall proximity
//     (0.40 weight), guard-break risk on either fighter (0.20 weight,
//     GUARD_BREAK_RISK_THRESHOLD = GUARD_METER_MAX * 0.25), and a
//     match-point flag (0.15 weight) on top of a 0.25 baseline -- then
//     calls Music.setMode(...), Music.setDuelProximity(proximity) (Duel
//     only), Music.setReducedAudio(reducedMotion), Music.setIntensity(...)
//     (capped at 0.5 when reducedMotion is set), and Music.tick().
//   - Music.duck() is called alongside every SFX.strikeImpact()/
//     SFX.parryChime() call site (both the Gauntlet kill path and the
//     Duel resolveDuelHit() path).
//   - Music.parryStinger() fires alongside a parried connect in
//     resolveDuelHit(); Music.ringOutStinger() fires on every scored
//     ring-out in checkRingOuts(); Music.matchWinStinger() fires
//     alongside ringOutStinger() the instant a ring-out also decides the
//     match (both fire on that same point -- see MUSIC_DIRECTION.md).
