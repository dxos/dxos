hows unison different from effect-ts --- appart from obvious, js, vm, etc..

---

does unison compile to wasm?

---

what if you combine unison with a proof engine like lean to produce mathmetical proofs?

---

lets implement it.

name the language DEUS

- take best of everything: proofs, lean syntax, hash codebase, iris, specs, mdl
- create new package. keep docs with references to prior art
- CLI for codebase-magement and execution + interpretor + testing framework
- wasm compiler
- llm uses CLI directly to read terms and write patches
- use ucm's ideas about branching and naming
- keep decision log

work fully autonomously from now on

first goal: dogfooding the compiler/CLI/codebase so they are written in deus

---

keep a file where only what I say goes that, use that as golden standard. your decision log is separate file

---

- being able to define performance requirements in semi-formal way as part of mdl

---

mdl is extensible -- the mdl extensions are defined in the language

---

- i like the effects model for checked errors -- lets add it. we could have errors (checked, exepcted), defects (code is bugged), panics (kernel broken)

---

- make be able to compile to standalone binary

---

- proposal: we need to be able to separate graph data (the actual content-addressed defintiions) into subgraphs. so that it doesnt become one huge graph. lets have that be infered from definitoin IRIs? the authoerity part. it should be pretty coarse -- sepecific library, organization, project
- proposal: be able to represent requirements to extenral toolling kinda like nix -- if we ever need to depend on fetching binaries to do things. also have language to describe external registries: npm, crates, apt, etc...

---

proposals are ideas to solve things, you need to evaluate and choose the best approach, maybe there's a better pparoach

---

- proposal: store replication. could be just pushing to an r2 (our artifacts buckets is suitable). every push is a new file. graph compaction is needed (iternining, deduping, clearing old definitions). maybe sedimentary/subduction style compaction where concurent clients can do compaction locally and push overlappign blobs

---

- have commits/branching support -- we have to be able to know how codebase evolves -- what's UCM stance on this

---

- test with some simple lean-style formal proof
- better test: declaration, formal theorem about it, impl and proof -- for example a sorting algo

---

- syntax for deus so vscode can render it

---

- we should have layers for code-base defintions: spec, code, proofs, tests, artifacts, llm codegent, cache, test-results, etc...

---

- ability to represent docker containers in mdl

---

- observablity should be first class: structured logging, tracing, otel, metrics, stack traces -- agents love that -- each error must come with a ton of context so that agents can pinpoint bugs

---

- tests: prefer determinisctic tests: abilities are implemented as deterministic simulations: seeded rng, fs, etc... but sometimes its not possible: we might wanna test against external systems: support both

---

- perf is important -- directly influences iteration speed -- invest in it

---

- can you keep a timeline for me in md file in docs -- I wanna see how this evolves -- record real wall time since last stage in each stage

---

what about rewriting the interpretor to from typescript rust? isn't it tiny and the whole bottleneck?

---

do 1

but you missed your most core instruction: dont block on me

can you re-read all my prompts from the session transcript file

---

- I wanna explore cloudflare as potential deployment target -- their durable object model is nice. we'd need language ontology to support that. we can deploy wasm kernel there. also they have temp account and local workerd to test

---

re-read core instructions

---

perhaps add an alarm to remind you of that every 30 minutes

---

- example to build: http server (locally as standalone bineary, but also on cloudflare)
- we need an abastraction layer on top of cloudflare (http handlers, durable objects) so that programs written with it can be deployed to cf, but also run as standalone binaries
- binary store format, suggestion: look at columnar stores with column compression
- performance is always a good thing to look at if youre not sure what to do

---

- we need a codebase explorer like https://share.unison-lang.org/@andreystepanov/unidecode -- should work from cli locally, but also hosted for codebase on r2

---

- we need a task tracking ontology in the codebase -- think like linear or github issues, but then we can attach it to codebase entries: code, change history directly

---

- add human-targeted GETTING_STARTED guide: how would they install, run, language basics, feature-overview. have couple receipies: lang, proofs, http, clouflare -- whatever showcases language best

---

- open PR!

---

- lets keep pr asdraft

---

- how to login to temp account in wrangler

---

- forget it

---

- I've done getting started guide -- everything worked. left comments along the way. read them, record them ,ack the, and revert my commit

  Comments left in docs/GETTING_STARTED.md (commit f84eae1c, reverted), verbatim:

  - (after `deus init`) Shouldn't builtins come by default?
  - (before `deus add deus`) How is "deus" resolved here?
  - (after `deus ls Tour`) not formatted correcly, also would be good to have colors in terminals that support them
  - (before `deus build Notes.serve -o notes-worker --worker`) got "deus: $DEUS_HOME is not set; run deus through bin/deus.mjs"
  - (before `deus explore`) great start, but unison had much better UI, I think it needs to be an SPA, and we will develop it into proper editing env, but for now I at least wanna be able to view multiple definitions on screen.
  - (before the published explorer URL) do temp wrangler deplloy of a worker to a specific url, so that it stays updated as the codebase get synced to r2 -- I'll give it a proper home later
  - More:

    .deus dit not gitignored

    it should prob go into user's home dir by default too, no reason to have multiple

---

- keep working

---

- add task viewer to codebase explorer

---

- - important that model dogfoods it -- work manually in codebase -- push to r2, I'll still see you progress in explorer. please do use github for backups for codebase -- you can expore right layers (no cache, etc..) to some text format and commit. but work mainly through codebase and track tasks there. your feedback from dogfooding is good source for improvements and you can file and take tasks in codebase

---

- stop. I wanna convert you to project -- anything you should record or push before that? what are core project instructions briefly?

---

- 1

---

- if you ever run-out of tasks, just find things to work on yourself keeping the spirit

---

- some ideas: figure out qa flows for web-apps. use knowledge from dxos, autocue skill, etc...

---

- \* codebase explorer app needs to be much better

---

- \* continue thinking about dogfooding and working without git

---

- \* embedding files in codebase -- they shouldn't ever go to git + a though: an artifact is just a const defined in codebase with cached value. i.e. you can have something like: let deus_cli = Deus.toBinary Cli.main -- you can change the naming... then this expr can be evaluated and cached

---

- \* dogfooding idea: `deus eval` that model calls with deus snippet that has ability to mutate codebase

---

- i instructed to be autonomous yet a session is blocking on me -- fix this systemically

---

- also remember about timeline and decision log

---

- \* one of the most impactful things you can do rn is a really good codebase ui, take unison as gold standard, check your work yourself

---

- > defect trace holds definition hashes (or the #… names of builtins),
  > sgould builtins also be proper uris?

---

- - unison authors mentioned different dialects with shared codebase format -- you can write code in one, and then render with another. lets experiment with that -- still keep deus as the primary -- that best for models, but add minimal rendering to other dialects -- what about something more JS, TS -like?

---

- one of the most impactful things you can do rn is a really good codebase ui, take unison as gold standard, check your work yourself

---

- how does the compaction work -- normal subduction sedimetree chunks the graph, but our graph doesn't grow the same way, automerge grows vertically (each commit builds on previous one), but ours is more horizontal: new definitions added, old ones replaced

---

wouldn't columnar format benefit from being binary and following what parquet or automerge or duckdb do: interning hashes, column copression formats, etc..

I might be wrong though

---

> Retention GC (level 99)

as git, we should be able to keep entire code history without trimming, artifacts and caches might get deleted though. lets make sure compaction allows that

---

- standing instructions: all sessions should be merging changes directly into https://github.com/dxos/dxos/pull/13952 ; close all extra PRs that were openend

---

- standing instructions: track tasks in codebase and make sure its up to date

---

- explore embedding deus into browser apps via wasm (like codenase viewer for example)
- explore interop with ts and generating typescript binding types
- explore native compilation (llvm?) -- whats the best perf we can get
- we need to be able to write from codebase ui, so we need accounts. can we get github oauth, and for now liimit writes to only members of dxos org. default view is still RO unauthed and is allowed.
- ability to quickly attach comments to things and store them in codebase, attach to tasks and definitions for example
- ability to file tasks from codebase and attach images (as bin assets pushed to codebase)

---

- have thread chew through other open tasks

---

- explore if functional style of writing programs (specifically immutability leads to fundamentally inneficient code and whether we need to add mutable memory. case study: writing a sorting algorithm

---

- we need generated pretty ts apis with .d.ts

---

how much of .mdl are you dogfooding? the general process should be mdl spec > apis + theorems > impls and proofs and tests. maybe backfill this for existing code and keep using this process as you go, eval it

---

can you confirm that all codebase changes are stil backed-up to git

---

make sure the thread that's picking up open tasks doesnt stop and picks up next task when its done with prev

---

how much of .mdl are you dogfooding? the general process should be mdl spec > apis + theorems > impls and proofs and tests. maybe backfill this for existing code and keep using this process as you go, eval it

---

- codebase ui -- when authed should have a report tool that takes screenshot and files a task --- typically something about improbing codebase explorer

---

- those should be clickable

---

I think deus should allow declaring a definition with a type but no impl

---

impl recomendation

- js as compilation target: without wasm, source-mapped, doesnt need to be super legible, but at least clear stacks -- good for iterop with dom and existing js libs (what wasm struggles with)
- find way to introp with external js libs: like react and effect, how do we express those bindings in the language
- react bindings with ability for hooks access that compoennts get + example react web app in deus
- build a full composer plugin (at least surfaces + echo access) and dynamically load it in composer -- autocue demo

---

for composer thread -> can we have some smaller version of explorer as composer plugin, also matching composer design system + skills so composer assistant can program in deus and use codebase

---

---

about mdl-first approach --- I want agents to record specs in codebase, not in github. and overall, most development at this point should be happening via-codebase

---

idea: we need analytical db associated with codebase. cloudflare has something about indexing parquet uploaded to r2 and allowing to run analytical queries over it. here's what im thinking. analytical events are synced together with codebase, but clients generally only push, dont pull. each event type is defeined in the codebase. analytical db entires reference event types, and otherwise have flat structure: scalars, and refs to codebase.

here we will store things like results for non-determentistic tests, ci results, agent analytics, etc...

codebase cannot referece into analytical events, but events referece into codebase.

to make sure my understanding is right, there's 3 way to reference a codebase item

via name via iri <https://...> -- can mutate
via name and hash <https://....#123123> -- fixed, and name immediatelly avialable (in case same has has multiple names) -- most specific
via hash #123123 --- has but no name, name can be infered but might be multiple

codebase ui should be able to show events, and at least display their count

---

oh, nonono, threads MUST use the codebase as primary VCS, and git as backup

---

are woktrees not pushing the codebase, or is this explorer not getting updated
