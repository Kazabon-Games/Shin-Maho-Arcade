# Game 3 Deliberation Brief — Kazabon Game Studio / Shin Mahou Arcade

**Purpose of this document.** This is a briefing packet for a Claude AI
session — handed to you standalone, with no assumption you have access to
this studio's actual repositories. It exists so you can help deliberate on
what Game 3 should be. **It is not a spec, and no genre or concept has been
chosen yet.** Do not treat anything below as a decision to execute against.
Read it, then help brainstorm: propose a few genuinely distinct concrete
directions with honest tradeoffs, ask clarifying questions if you have them,
and resist collapsing to a single answer prematurely. That's how this studio
actually works — deliberate, then commit, not the reverse.

---

## 1. Who this studio is

**Kazabon Game Studio** publishes browser games under the brand **Shin
Mahou Arcade** (真魔法, "Shin Mahou" = "True Magic"). One person directs an
AI development team (Claude) to build every game; AI removes the
implementation bottleneck so creative direction, not coding throughput, is
the actual bottleneck and the actual point.

**The goal:** become known for the highest-quality browser games
available — not to compete with AAA studios, but to be excellent at a
different, smaller thing. The reference feeling is the **Flash-portal era**
— Newgrounds, Kongregate, Miniclip — reimagined with modern web tech
instead of Flash. Players should associate Shin Mahou Arcade with instant
play, high polish, strong artistic identity, creative mechanics, and
browser-first design. The platform is meant to become a recognizable
destination, not just a list of files.

**Core philosophy — Zero Friction, Maximum Wonder:** a friend sends a link,
you click it, the game is loaded and playable within seconds. No
installers, no launchers, no accounts, no unnecessary waiting. The browser
itself is the platform.

**Technology stack, and why it's a deliberate constraint, not a
limitation:** every game is a **single self-contained HTML file** — HTML5,
CSS3, JavaScript, Canvas 2D rendering, Web Audio API for all sound
(synthesized in-browser, no audio file assets), `localStorage` for saves,
and (as of the most recent work) a genuinely functioning **Progressive Web
App** layer (installable, offline-capable via a per-page manifest + service
worker). No build step, no bundler, no backend server, no framework
runtime. This means: any game can be opened by double-clicking the file, is
trivially portable, is trivial to hand off between sessions, and has zero
deployment complexity. It also means "shared code" across games isn't a
simple import — see §5 below, because this constraint is directly relevant
to how Game 3 should be scoped.

**Long-term roadmap (stated milestones, not fixed content):**

| Game | Milestone |
|---|---|
| 1 | Learn the pipeline |
| 2 | Refine the framework / pattern-library |
| 3 | **Expand systems** |
| 4 | Solidify studio identity |
| 5 | Produce flagship-quality browser game |
| 6 | Become known as one of the most polished browser game developers on the web |

Game 3 is explicitly framed as "expand systems" — deliberately vague on
purpose, and one of the things worth deliberating below is what that should
actually mean in practice.

---

## 2. The portfolio so far (two shipped games)

**Game 1 — Wonderland.** A survivor-roguelite (auto-attacking character,
waves of enemies, timed runs, build-defining pickups) set in an original
dark-fantasy "Monolith" mythos. Player powers are drawn from a real
in-universe "operator schema" (Inflict, Surge, Sever, Create Talisman,
Drain, Root, Displace, Chain Effect, Delayed Effect, Reflect, Afflict,
Banish, Impose) rather than generic RPG spell names. Has a permanent
meta-progression shop (in-fiction: "The Grimoire") for run-to-run currency
spending, a full production-quality synthesized audio chain (layered music,
sidechain ducking, synthesized reverb), a faceted-gem visual rendering
identity (see §4), boss fights with telegraphed attacks, achievements,
gamepad support, and now PWA/offline installability.

**Game 2 — Sigil Chain.** A score-attack rune-matching/chain-clearing
puzzle game — smaller in scope than Wonderland by design, built second to
prove the studio's patterns generalize to a genuinely different genre
rather than reskinning Game 1. Player draws chains across a grid of runes,
clears them for score, faces escalating phases under time pressure. Has a
guaranteed-solvable board (every board state provably has at least one
legal move — see §4), its own reduced/scoped audio graph (deliberately
lighter than Wonderland's, not a copy-paste), a lightweight
achievements/meta-progression layer, and the same PWA/offline treatment.

Both games passed a full internal quality audit and were brought up to a
shared bar together: consistent color language, working navigation back to
the arcade portal, offline installability, and a meta-progression floor
neither game was allowed to fall below.

---

## 3. Real lessons learned (read this before proposing anything)

These are actual bugs and gaps this studio hit and fixed across its first
two games — not hypothetical risks. A concept for Game 3 should be
evaluated partly on whether it avoids repeating these:

- **Compounding-multiplier balance bugs.** A "heal per hit" mechanic in
  Wonderland was uncapped and silently produced absurd effective healing
  rates at high hit-counts (measured, not eyeballed, at ~159hp/sec against
  an intended ballpark of ~30hp/sec). The fix was an explicit cap on how
  many hits/stacks a per-tick effect can scale from. Any mechanic that
  multiplies a per-event bonus by a variable event count needs this kind of
  cap considered up front, not discovered after shipping.
- **Generic-shape rendering breaks readability for named/singular things.**
  Both games initially generated enemy/entity silhouettes from a uniform
  regular-polygon function. This reads fine for interchangeable mooks, but
  any boss, named entity, or anything the player must visually tell apart
  by shape (not just color) needs **hand-authored, asymmetric** vertex
  geometry. This was fixed twice — Wonderland's boss, then all of Sigil
  Chain's rune types — after shipping generic and having it read as
  visually flat/confusing. Don't let a third game rediscover this.
- **Puzzle/board solvability must be provably guaranteed, not assumed.**
  Sigil Chain's tile-refill logic originally had no guarantee that a
  legal move existed after a refill — players could get stuck looking at
  an unsolvable board. Fixed via an explicit reachability check
  (flood-fill for a same-type connected component of sufficient size) with
  a bounded reroll if the naive refill fails it. Any procedurally-generated
  puzzle state needs an explicit, tested solvability guarantee, not an
  assumption that randomness will usually be fine.
- **Color language must be a deliberate rule, not vibes.** A real
  playtester misread two hostile enemies as rewards on sight, because their
  colors were (measurably, by RGB distance, not just impression) nearly
  identical to the game's reward/currency colors. The studio now has an
  explicit rule: gold/yellow is reserved for reward/currency/positive-UI
  only, red for danger/threat, green for safe/positive-health — no hostile
  entity may use the reward band, and this is checked before shipping any
  new color, not after a playtester notices.
- **Meta-progression can't be an afterthought.** The first version of Game
  2 had far thinner run-to-run progression than Game 1. Whatever Game 3 is,
  it needs its own meta-progression thought through as a first-class
  system, not bolted on late to match a floor set by earlier games.
- **Every game needs a working way back to the arcade portal**, discoverable
  in the main menu, not just a link that was forgotten. Small, but it
  shipped missing once and had to be retrofitted.
- **Accessibility (reduced motion, ARIA, colorblind-safe contrast, etc.)
  is far cheaper designed in from the start than retrofitted** — both
  games ended up doing a dedicated accessibility pass after the fact.

---

## 4. What the studio now has that it didn't for Games 1 or 2

Three reusable "skills" (technique references, not shared code — see the
constraint in §1) now exist and should inform how Game 3 is built:

- **Adaptive game audio** — synthesized Web Audio techniques with no audio
  file assets: a specific gain-automation idiom that prevents a real
  "dying note gets stuck" bug class, sidechain ducking for a produced-mix
  feel, synthesized convolution reverb from a noise buffer, the rule that
  one-shot automation and continuous per-frame automation are genuinely
  different patterns that must not be mixed, and — importantly — how to
  deliberately *scope down* the audio graph for a smaller/calmer game
  instead of defaulting to the flagship game's full complexity.
- **PWA / offline games** — how to make a single-file, no-build browser
  game installable and offline-capable: manifest + service worker as the
  one deliberate, justified exception to "no separate files" (a service
  worker is a hard platform requirement, not a convention choice), the
  scoping gotcha when multiple games share one hosting directory, and how
  to actually verify offline capability rather than trusting a clean
  registration.
- **Faceted-gem rendering** — the cut-gem facet-shading visual technique
  that is this studio's signature look, plus the hand-authored-vertices
  lesson from §3 above.

Also newly real: a studio-wide **cross-game visual and color language**
(§3 above), and a **still-open, unresolved strategic question**: should the
studio move toward Path A (an actual shared build/framework/engine across
games, at the cost of the no-build-step convention) or stay on Path B
(shared *patterns and reference documentation*, each game remaining a
fully independent single file)? This has not been decided, and Game 3 is a
real, relevant data point for that decision — not something to resolve
casually as a side effect of Game 3's own scoping.

---

## 5. What to actually deliberate on

Please help think through the following. Propose **2-4 concrete, genuinely
different directions**, each with honest tradeoffs, rather than converging
on one option immediately:

1. **Genre.** Game 1 is an action survivor-roguelite; Game 2 is a
   match/chain puzzle. This studio's stated approach is to diversify genre
   rather than reskin a proven formula. What's a third genre that (a) is
   genuinely distinct from both, (b) still fits instant-play,
   single-browser-tab, no-install play, and (c) plays well on both desktop
   and mobile without needing different codebases? Some candidates worth
   weighing (not a shortlist to just pick from) — idle/incremental, tower
   defense, rhythm, physics-based puzzle, card-battler, platformer, or
   something not on this list at all.
2. **"Expand systems" — expand what, specifically?** The roadmap names this
   as Game 3's milestone but doesn't define it. Candidates: a deeper
   cross-game meta-progression layer connecting all three games' saves;
   new input modalities neither prior game needed (richer touch gestures,
   deeper gamepad support); a genuinely new engine capability (physics,
   procedural generation, a save/share format); or something else entirely.
3. **Does Game 3 tip the Path A vs. Path B decision** (§4), or is it too
   early / not the right forcing function for that decision yet?
4. **What should carry over from Games 1-2 as a hard requirement** (PWA/
   offline support, the color language, arcade-portal navigation, no
   accounts/no installs, the "Zero Friction Maximum Wonder" philosophy) —
   versus **what should be deliberately left behind** rather than copied
   forward out of habit?
5. Anything else you notice that's worth raising before a direction gets
   picked — including pushing back if a proposed direction seems to repeat
   one of the lessons in §3.

Please engage with this as an actual creative-and-technical planning
conversation, not a form to fill out. Ask follow-up questions if something
above is ambiguous or under-specified.
