# Saas2D voice-over: first-round script review (superseded)

> Superseded by [`saas2d-voiceover.md`](saas2d-voiceover.md): the user rejected these seven variants as loose, and the
> tracks named below were deleted. Kept for the scene-by-scene review of the original track and the brand-voice research.

Review of [`SPEAKING-TRACK-SAAS2D.md`](../../../tools/autocue/showcase/echo3d/SPEAKING-TRACK-SAAS2D.md) against the
Saas2D picture (`tools/autocue/src/components/Saas2D/slides.ts`, `STORYBOARD.md`) and the Watson ("fry") cut, then seven
rewritten tracks, each voiced by Watson at speed 1.08 and rendered under two minutes.

## Variants

| Variant    | Track                                                                                                               | Length | Words | Style                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------- | ------ | ----- | --------------------------------------------------------------------------- |
| precise    | [`SPEAKING-TRACK-SAAS2D-precise.md`](../../../tools/autocue/showcase/echo3d/SPEAKING-TRACK-SAAS2D-precise.md)       | 1:56.8 | 181   | One fact a scene, declarative, mechanism over adjectives.                   |
| argument   | [`SPEAKING-TRACK-SAAS2D-argument.md`](../../../tools/autocue/showcase/echo3d/SPEAKING-TRACK-SAAS2D-argument.md)     | 1:57.0 | 183   | A thesis built cause to effect; the risk is stated outright.                |
| staccato   | [`SPEAKING-TRACK-SAAS2D-staccato.md`](../../../tools/autocue/showcase/echo3d/SPEAKING-TRACK-SAAS2D-staccato.md)     | 1:42.0 | 135   | Fragments of two to eight words; the picture carries the motion.            |
| cloudflare | [`SPEAKING-TRACK-SAAS2D-cloudflare.md`](../../../tools/autocue/showcase/echo3d/SPEAKING-TRACK-SAAS2D-cloudflare.md) | 1:57.0 | 173   | Infrastructure register: colon lists, architecture terms, a confident hook. |
| anthropic  | [`SPEAKING-TRACK-SAAS2D-anthropic.md`](../../../tools/autocue/showcase/echo3d/SPEAKING-TRACK-SAAS2D-anthropic.md)   | 1:56.2 | 185   | Research-lab register: measured, "we think", the risk named calmly.         |
| salesforce | [`SPEAKING-TRACK-SAAS2D-salesforce.md`](../../../tools/autocue/showcase/echo3d/SPEAKING-TRACK-SAAS2D-salesforce.md) | 1:58.4 | 186   | Enterprise register: second person, "every", contrast pairs.                |
| xai        | [`SPEAKING-TRACK-SAAS2D-xai.md`](../../../tools/autocue/showcase/echo3d/SPEAKING-TRACK-SAAS2D-xai.md)               | 1:58.6 | 184   | Contrarian register: first principles, short jabs, one dry aside.           |

Words exclude the fixed close. Renders: `~/Desktop/Demos/Composer/saas2d-<variant>-voiced.mp4` and `-voiced-720p.mp4`.
Holds: `tools/autocue/showcase/echo3d/voice/holds-saas2d-<variant>.json`.

## Budget

The fitted length is `0.5 + 2.5 + Σ max(shortest, take + 0.5)` plus the close (3.4 s anchor + take + 2 s, about 11 s).
The scenes' shortest holds alone come to 72.5 s. Watson at 1.08 reads about 2.2 words a second, so two minutes allows
about 185 words outside the close. Four scenes have slack the current track leaves unused, because their motion sets a
longer hold than the line needs: `frontier-comms` (6.5 s), `absorb` (5.5 s), `merge-1` (4.5 s since 8a454d8926d) and
`saas-merge` (5.0 s). The variants put their longer lines there and in `rivals`, the key scene.

## The user's notes, applied to every variant

1. Vendors serve **millions** of customers, not thousands.
2. SaaS did not "invest in lock-in". `competitors` opens with **But** and names the downside: walled gardens, lock-in,
   captured data.
3. **Main point.** Companies **juggle** dozens of SaaS products. The problem is fragmentation and lack of access, not
   copies, and that access is what agents need. `spread`, `spread-comms` and `frontier-comms` now carry this as one
   chain: juggle → fragmented → agents need the whole → so the data flows to the labs.
4. `rivals` drops "As models converge, each lab competes on its platform." It is the key scene and now states the danger:
   when models become interchangeable, data is the moat, so each lab competes to own yours.
5. "lets companies build" becomes **full control over their data**.
6. ECHO is named as an **agent-native database** built on a **semantic graph**.
7. "work flows back into the space" becomes **real-time collaboration**, with agents inside the company's workflows.
8. DXOS becomes the company's **operating system**, not its knowledge base.
9. The closing value is **taking control and enabling innovation**, not "less dependence on external vendors".

## Scene by scene (current track)

Take lengths and holds are from the Watson cut (`holds-saas2d-fry.json`, takes `saas2d-fry`).

| #   | Scene             | Words | Take  | Hold | Pacing                                                                                                      | Content                                                                                                                                                                                             |
| --- | ----------------- | ----- | ----- | ---- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2   | beginning         | 6     | 3.4 s | 3.9  | Good; the title fades in at 0.3 s, under the first word.                                                    | Good. Keep it short; the title says the rest.                                                                                                                                                       |
| 3   | silo              | 6     | 2.8 s | 3.3  | Good.                                                                                                       | "stopped running their own servers" is the benefit; fine, but it reads as history. Variants make it the promise.                                                                                    |
| 4   | silo-comms        | 7     | 3.5 s | 4.1  | Good; the flows in both directions match "updates arrived".                                                 | Good.                                                                                                                                                                                               |
| 5   | scale             | 7     | 3.3 s | 3.8  | Good.                                                                                                       | **thousands → millions** (note 1). The picture's "Metadata" core is never named; the variants leave it to the picture.                                                                              |
| 6   | competitors       | 6     | 2.0 s | 2.6  | **Fights the motion.** Three "Your competitor" labels appear in 2.6 s and the line says nothing about them. | **Wrong claim** (note 2). Open with "But"; name walled gardens, lock-in, capture. A 10–15 word line also gives the labels time.                                                                     |
| 7   | spread            | 8     | 3.7 s | 4.2  | Good; the camera move lands as the sentence ends.                                                           | "run" → **juggle** (note 3).                                                                                                                                                                        |
| 8   | spread-comms      | 6     | 2.2 s | 2.7  | Short for seven apps' flows to start reading.                                                               | **Wrong problem** (note 3): "a copy of company data". The point is fragmentation and access.                                                                                                        |
| 9   | frontier          | 4     | 2.4 s | 3.0  | Good.                                                                                                       | Good.                                                                                                                                                                                               |
| 10  | frontier-comms    | 14    | 5.9 s | 6.5  | At the motion's floor; fine.                                                                                | **Fights the picture**: "every vendor plugged into the labs", but one link runs from your company to the lab. Make it the main point: agents need the whole context, so the data flows to the labs. |
| 11  | orbit             | 6     | 2.6 s | 3.1  | Good; the trailing comma carries into `absorb`.                                                             | Good.                                                                                                                                                                                               |
| 12  | absorb            | 9     | 3.7 s | 5.5  | 1.8 s of silence while the last apps fold in; room for ~3 more words.                                       | Good; the data going with the apps is the point.                                                                                                                                                    |
| 13  | rivals            | 9     | 4.0 s | 4.5  | Static picture; a longer line costs nothing visually.                                                       | **Underpowered** (note 4). The key scene: say why convergence is dangerous (data becomes the moat).                                                                                                 |
| 14  | merge-1           | 7     | 3.5 s | 6.0  | Since 8a454d8926d the merge needs only 4.5 s; the fry holds still carry 6.0. A refit saves 1.5 s.           | Fine. A short line lets the merge play.                                                                                                                                                             |
| 15  | final-frontier    | 0     | —     | 2.5  | Silence; correct.                                                                                           | —                                                                                                                                                                                                   |
| 16  | engulf            | 9     | 4.7 s | 5.3  | Good; the lab grows past the frame under the line.                                                          | Good. Every variant keeps "data, compute and intelligence".                                                                                                                                         |
| 17  | dont-panic        | 7     | 1.6 s | 2.2  | Good.                                                                                                       | Good; the caption THE ALTERNATIVE does the work.                                                                                                                                                    |
| 18  | spread-again      | 7     | 3.2 s | 3.8  | Good; the sentence runs on into `echo-hub`.                                                                 | Fine.                                                                                                                                                                                               |
| 19  | echo-hub          | 13    | 6.5 s | 7.0  | Longest hold in the second half; the hub grows in 4 s, so ~9 words is enough.                               | **Weak** (note 5): "lets companies build". Use full control over their data.                                                                                                                        |
| 20  | echo-spaces       | 8     | 3.9 s | 4.4  | **Fights the caption**: the screen says ECHO HYPERGRAPH and the line never names ECHO.                      | Name ECHO; agent-native database, semantic graph (note 6).                                                                                                                                          |
| 21  | objects           | 7     | 4.1 s | 4.6  | Good.                                                                                                       | Good.                                                                                                                                                                                               |
| 22  | object-created    | 13    | 5.9 s | 6.4  | Good; the cards appear under the line.                                                                      | **Wrong image** (note 7): "work flows back into the space". Real-time collaboration, agents in the workflow.                                                                                        |
| 23  | echo-spaces-again | 9     | 4.1 s | 4.7  | Good.                                                                                                       | "knowledge base" (note 8). The variants move the operating system to `echo-hub-again` and use this scene for sync or integration.                                                                   |
| 24  | echo-hub-again    | 5     | 2.9 s | 3.5  | Good.                                                                                                       | "brought in house" is fine; the variants use it for "operating system".                                                                                                                             |
| 25  | saas-merge        | 6     | 2.8 s | 5.0  | 2.2 s of silence while the apps fold in; room for ~4 more words.                                            | **Wrong value** (note 9). Take control, enable what comes next.                                                                                                                                     |
| 28  | company-fills     | 7     | 5.7 s | 11.1 | Fixed: the take starts as the logo lands (3.4 s).                                                           | Fixed close, kept in every variant.                                                                                                                                                                 |

## Brand voices

Each brand variant writes in the company's register, with no slogan copied and no company named.

### Cloudflare → `cloudflare`

- **Traits:** engineer-to-engineer; short fragments and label-and-colon lists ("Deploy once, run in 330+ cities"; "Pay
  for what you use: CPU-time based billing"); technical nouns used as selling points (V8 isolates, egress-free storage);
  confident absolutes ("instantly", "zero cold starts"); blog intros that open on a hook and frame the work as making the
  Internet better; recent launches speak of agents as a "second audience" of the Internet.
- **In the track:** colon lists ("lock-in, captive data"), architecture lines ("Bring compute to the data,
  not the reverse"), "local-first, peer to peer, with sync at the edge", "Own the stack. Ship what's next."
- **Sources:** [cloudflare.com](https://www.cloudflare.com/), [Cloudflare blog](https://blog.cloudflare.com/),
  [Birthday Week 2026 wrap-up](https://blog.cloudflare.com/birthday-week-2026-wrap-up/).

### Anthropic → `anthropic`

- **Traits:** measured and mission-led; plain declaratives of medium length; first person plural ("we", "our"); claims
  backed by figures and then hedged where it matters; risk named directly and calmly ("a public benefit corporation
  dedicated to securing its benefits and mitigating its risks"); product copy that is spec-like rather than hyped.
- **In the track:** "This is the real risk", "We believe there's a better path", scoped claims ("Each agent sees only the
  spaces it's been given"), no superlatives.
- **Sources:** [anthropic.com](https://www.anthropic.com/),
  [Claude Opus 5.5 announcement](https://www.anthropic.com/news/claude-opus-5-5).

### Salesforce → `salesforce`

- **Traits:** aspirational enterprise copy; second person and repetition of "every", "your", "trusted"; contrast pairs
  for rhythm ("Let humans do what they do best…"); agents framed as teammates with business context; trust and control
  as the headline value; short fragments ending in a full stop. Dreamforce 2026 was themed on becoming an agentic
  enterprise.
- **In the track:** "Each holds a piece of the customer. None holds the whole story.", "whoever holds your data holds
  your business", "Agents work beside your people, never outside your walls." No "trusted agents", no "agentic
  enterprise".
- **Sources:** [salesforce.com](https://www.salesforce.com/),
  [Dreamforce 2026 keynote live blog](https://thelettertwo.com/2026/09/15/live-blog-salesforce-dreamforce-2026-keynote/),
  [Dreamforce 2026 preview](https://www.marketscale.com/industries/software-and-technology/dreamforce-2026-puts-the-agentic-enterprise-on-trial-in-san-francisco-this-september).

### x.ai → `xai`

- **Traits:** blunt and contrarian; bold superlatives ("the most intelligent model in the world"); first-principles
  framing; truth-seeking and universe-scale mission language; scale bravado (Colossus); an irreverent, joking aside.
  x.ai's own pages refused automated fetches (HTTP 403), so the traits come from launch coverage.
- **In the track:** "Rent software. Fire the server room.", "First principles: … data is the only moat", "Not great.",
  "A semantic graph, not a pile of tables." No "understand the universe", no "maximally truth-seeking".
- **Sources:** [Built In on Grok 4](https://builtin.com/artificial-intelligence/grok-4),
  [Built In on xAI](https://builtin.com/artificial-intelligence/what-is-xai),
  [Washington Times on Grok 3](https://m.washingtontimes.com/news/2025/feb/18/elon-musk-xai-unveils-grok-3-tech-race-intensifies/).

## Product claims to verify

Every track keeps to ECHO, Composer and EDGE as they are. These lines go further than the code may support:

- "Every change syncs, peer to peer." (`precise`) and "Local-first, peer to peer, with sync at the edge."
  (`cloudflare`): ECHO replicates through EDGE as well as between peers. _(verify)_ the peer-to-peer path is live in
  Composer today.
- "Each agent sees only the spaces it's been given." (`anthropic`): _(verify)_ that agent access is scoped to spaces.
- "Agents as first-class participants in every workflow." (`cloudflare`) and "Agents in the loop, not bolted on."
  (`xai`): true of Composer's assistant in a space; "every workflow" is a reach. _(verify)_
- "agent-native database" and "semantic graph" are the user's framing of ECHO (an object graph, a hypergraph on screen).
