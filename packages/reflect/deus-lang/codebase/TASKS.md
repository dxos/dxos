# Tasks

## A Js.import binding's hash does not cover its type, so two bindings with the same body share one codec (`1e8dee8b`)

- state: todo
- priority: high
- labels: js, codebase

Js.text and Js.list with body Js.import "js" "id" collapsed into one definition, and Js.list encoded with the text codec. platform/js/js.deus works around it with distinct paths js.as.<name>. Fix: hash a binding together with its declared type, or refuse two bindings with the same body.

## Catch the R2 remote up with the git export and push it, so threads can start from deus pull (`e76e36b0`)

- state: doing
- priority: high
- labels: vcs, codebase

From Dmytro: threads MUST use the codebase as primary VCS, and git as backup. D101. The remote r2://agent-artifacts/deus/explorer-demo was at #5ed10805c0 (stage 65). Pulling it, then update codebase/code codebase/specs, task import and history import gives exactly the export (1727 definitions, 0 differ); the push failed with 403 from this session's network policy for <account>.r2.cloudflarestorage.com. Run that catch-up from a session that can reach R2.

> claude: The JS target thread could not reach R2 either: its deus pull origin was refused by the session's permission policy before any request. It restored from the git export and exported back (D102).

> claude: The explorer graph-view thread (claude/project-thread-oixvu2) has no DEUS_R2_ENDPOINT, so it cannot deus pull or push either; it works on the git export (restore, update, export) until this lands.

> claude: The 'Continue DEUS pending work' thread has no R2 keys. It worked on the git export: D113/D114 and the task restore are on #13952's branch (fb40e15a), ready for the next deus pull/push from a thread that has the keys.

## Embed files in the codebase, never in git, and make artifacts cached constants (`88004c30`)

- state: todo
- priority: high
- assignee: claude
- labels: dogfood, artifacts

From Dmytro: an artifact is a constant whose value is cached, e.g. deusCli := Deus.toBinary Cli.main; evaluating it once caches the result in the artifacts layer by the hash of the expression.

## Explorer: show feature maps from deus features --json: the tree with status, open tasks and problems, each feature linking its specs, definitions and tasks (`381a725d`)

- state: todo
- priority: high
- labels: explorer, features

D115. deus features --json gives [{document, features: [{id, title, status, parent, depth, specs, defs, tasks, openTasks, problems}], notes}]. Toolchain.Features is the first map.

## Metadata changes on known hashes never replicate: push sends meta only with missing objects, import keeps the first (`f4afc2c0`)

- state: todo
- priority: high
- labels: replication, spec, codebase, bug
- links `Replicate.import` (#cbbdb9bbaa)

Follow-up to D96: spec prose is block metadata; Replicate writes meta only when absent.

> claude: Seen 2026-10-14 by the native thread: a fresh clone of r2://agent-artifacts/deus/toolchain (origin.main #9db52bfe04) exports specs/JsGen.Spec.mdl with R-3's prose under the wrong blocks; the long-lived store and the git export are right. Cause: Replicate.push bundles meta only for objects the remote lacks, and Replicate.import writes meta only where none exists, so a meta-only change (spec prose, docs, D116 schemes) never reaches the remote, and a clone keeps whichever bundle it imports first. A local deus update cannot repair R2. Proposed fix: make a metadata change a content-addressed object (metaset hash form) that the causal node of the change references, so it replicates and compacts like any object, and apply metasets in causal order on merge (descendant wins; concurrent ones merge as Codebase.mergeMeta does). Subsumes 4c9147ce. Until then, export only from a long-lived store and diff codebase/specs against git before committing an export.

## Names that share a hash keep only the last name's doc, comments and parameter names (`62f3f4d0`)

- state: todo
- priority: high
- labels: codebase, bug
- links `Codebase.mergeMeta` (#20fb7353e5)

Core has no types or names, so two definitions with the same body share a hash and one metadata file. Codebase.store keeps the newest doc, lead comments and locals (D116 merges only the scheme), so updating deus/wasm.deus gives Prove.lambdas the doc of Wasm.unlam, and view, export and the explorer print it under both names. Workaround: deus update deus/prove.deus afterwards. Proposed fix: keep name-specific fields per name when they differ, as (for "<fqn>" doc lead locals…) entries in the shared meta, written by mergeMeta from the batch's fqn, and read through one Codebase.metaFor meta name used by view, export, the explorer and bindings. Found by the native thread, 2026-10-14.

## Publish pushed events to Basin Catalog on the R2 bucket and query them with Basin SQL (needs Dmytro's go-ahead to create Cloudflare resources) (`c5955f97`)

- state: todo
- priority: high
- assignee: claude
- labels: analytics, cloudflare

## QA flows for web apps: scripted user journeys checked in simulation, on a real server and in a browser (`9428f054`)

- state: doing
- priority: high
- assignee: claude
- labels: qa, web
- links `Qa.check` (#8fbd9f94b9)

From Dmytro: figure out QA flows for web apps, using what dxos does (.mdl QA tests, composer-qa, autocue).

> claude: First arm built (D65): qa blocks in MDL with do/expect/send/assert steps, run by deus mdl in Web.simulateMany; examples/notes.mdl has two flows. Next: the same steps against deus serve (--integration) and in a browser.

> claude: Simulation is done (D65, qa blocks run by deus mdl). Left: run the same flows against deus serve and in a browser.

## Republish the hosted explorer on every push to the PR branch (`696086fe`)

- state: todo
- priority: high
- labels: explorer, ci

The hosted explorer stays at its last manual publish (the 19:18 one) because nothing republishes it. Once threads push to r2://agent-artifacts/deus/toolchain (D101), a CI job, or deus push itself, should run deus explore --publish for the explorer URL. A CI job needs Dmytro's go-ahead and an R2 token that can write agent-artifacts; the existing CI R2 token covers only the Composer asset buckets.

## The codebase explorer app needs to be much better (`861438d2`)

- state: doing
- priority: high
- assignee: claude
- labels: explorer

From Dmytro. Measure it against share.unison-lang.org: search, navigation, dependency links, history.

> claude: The Codebase explorer UI thread built a Unison-style UI (finder, namespace pages, definition and change cards, keyboard), verified with Playwright; merging into #13952 from PR #13975. It also fixes the builtin page 404 and the content types.

## Wasm back end: Perceus reference counting with reuse, sharing one ownership analysis with the C back end's task 62d1bdda; pure sorts allocate 470 MiB for 10^6 numbers today (D83) (`cf0e3937`)

- state: todo
- priority: high
- labels: perf
- links `Array.set` (#b3d7fa0dc1)

## Work without git: the codebase is where the toolchain is developed, git only backs it up (`86d7b02a`)

- state: todo
- priority: high
- assignee: claude
- labels: dogfood

From Dmytro. Depends on P8 (b09507db): files must be regenerable from the codebase.

## deus eval with a Codebase ability: a snippet the model sends can read and change the codebase (`10b95384`)

- state: todo
- priority: high
- assignee: claude
- labels: dogfood, llm

From Dmytro. A Codebase ability (find, view, add, update, mv, task ops) handled by the CLI under eval, so an agent scripts edits in DEUS instead of chaining CLI calls.

## devex: a fresh container cannot run the full suite: the Rust wasm32 target and tsc are missing, and three threads re-diagnosed it (native, explorer, bindings) (`6cffbc44`)

- state: todo
- priority: high
- labels: devex, perf

Install the wasm32 target and tsc in the repo's cloud setup script or a SessionStart hook, and add a test preflight that names exactly what is missing.

## devex: merges into #13952 race and D-numbers collide (`602f4557`)

- state: todo
- priority: high
- labels: devex, perf

Every thread renumbers DECISIONS and TIMELINE on each merge; check a merge script into the repo and give decisions collision-free ids.

## devex: the dogfood test takes 124 s (`f264430b`)

- state: todo
- priority: high
- labels: devex, perf

Its view round-trip re-adds the whole printed toolchain; blocked on the printed-source typecheck task.

## devex: the restore test takes 89 s and compiles deus/ twice (`b4e12f14`)

- state: todo
- priority: high
- labels: devex, perf

Restore once into a shared codebase, or reuse the dogfood codebase.

## devex: the seed fixpoint compiles the toolchain twice (17 s) (`9e2f6916`)

- state: todo
- priority: high
- labels: devex, perf

Compile s2 with the s1 image only when sources changed since the last fixpoint, or check the fixpoint in CI only.

## A req can name TypeScript tests as evidence (vitest file and test name), so the toolchain-wide view round trip stops being a gap (`a2da28e2`)

- state: todo
- priority: medium
- assignee: claude
- labels: mdl, spec

Gap R-8 in docs/spec/COMPILE.mdl.

## Apply the explorer inbox every 15 minutes once the Worker is deployed with its GitHub secrets (D85) (`729ad2b4`)

- state: todo
- priority: medium
- assignee: claude
- labels: explorer, writing
- parent: 861438d2

Routine: deus inbox, then deus push, which refreshes the site. Waits on Dmytro's OAuth app and wrangler secrets; publishing to the public bucket needs his named approval.

## CI checks that pyarrow, DuckDB and an Iceberg catalog read pushed event files (Analytics.Spec R-6; checked by hand with scripts/analytics-publish.py --local) (`1ad89782`)

- state: todo
- priority: medium
- assignee: claude
- labels: analytics, ci

## Checked specs for the remaining subsystems: lexer and parser, types, prover and check, tasks, replicate, update, image, wasm and C back ends (`1ab6c044`)

- state: todo
- priority: medium
- assignee: claude
- labels: dogfood, spec

## Custom generators for by test laws, declared next to the law, instead of hand-built inputs (Codebase.Spec.dotted, Bindings.Spec.crowded) (`1cbfdd30`)

- state: todo
- priority: medium
- assignee: claude
- labels: mdl, spec, prover

Raised by the bindings thread too (D87): random Text almost never collides.

## Embedding kernel re-reads the whole image on every deus_start (about 60 ms for the seed): keep a loaded image and call entries on it (`d780de91`)

- state: todo
- priority: medium
- assignee: claude
- labels: wasm, perf, embedding

## Field names are global: two structures with a field of the same name make every unannotated access ambiguous, so event types had to rename kind, reason, url and command (`31d3c1cd`)

- state: todo
- priority: medium
- assignee: claude
- labels: types, devex

## Laws for task, comment and history-record merges, and for add/update refusing layer crossings (`823f7b83`)

- state: todo
- priority: medium
- assignee: claude
- labels: spec, codebase

Known gaps R-10 and R-12 in docs/spec/CODEBASE-STORE.mdl.

## MDL extensions see the document's name, so tests can point back at requirements (@[req "Doc.R-1"]) and deus mdl can list tests no requirement names (`6a3b0ebe`)

- state: todo
- priority: medium
- assignee: claude
- labels: mdl, spec

## Native: a C runtime for Text, maps and the other primitives, ported from the Rust kernel (`72a1f2fb`)

- state: todo
- priority: medium
- labels: native, perf

> claude: Text done in D113: literals, ++ on texts and lists (in place when unique), slice, split, join, indexOf, trim, Int.toText/fromText, text patterns, ordering; 4-6x faster than the JIT. Remaining: Dict and MutMap, show, Text.sha256, Text.utf8, Text.fromCodes, structural equality of data.

> claude: The Text work above landed as D115 (renumbered from D113 after a concurrent decision).

## Native: effect handlers in the C back end by evidence passing, with stack switching for general resumptions (`e1cf2c6c`)

- state: todo
- priority: medium
- labels: native, perf

## Replication keeps the first scheme of a shared hash; merge schemes as the store does since D116 (`4c9147ce`)

- state: todo
- priority: medium
- labels: codebase, bug

Replicate.import writes metadata only when none exists (D91), so a pulled codebase can hold a narrower scheme for a hash two names share than the pusher's store does after D116. Merge the scheme with Codebase.mergeMeta on import.

## Run the DEUS skill through the Composer assistant with a live model (`91b838f4`)

- state: todo
- priority: medium
- labels: js, composer, llm

The tools searchDefinitions and viewDefinition were checked with composer.invoke only; the test identity had no account. Add an autocue step where the assistant answers a DEUS question with the tools.

## Specs in the codebase: the Codebase, Compile, Explorer and Export specs fail 'deus mdl' from the codebase export (32 of 76 blocks pass) because their test helpers (Codebase.Spec.inStore, Compile.Spec.prelude, Export.Spec.deus) are not in it; Array.Spec and Checking.Spec pass (`2a2b87a2`)

- state: todo
- priority: medium
- labels: spec

## TS kernel JIT: Ref.set journals a closure on every write; journal only when a deoptimisation can replay the entry (Array.set no longer journals, D96) (`a1b73fb8`)

- state: todo
- priority: medium
- labels: perf
- links `Array.set` (#b3d7fa0dc1)

## Tested theorems: 'by test' evaluates the conclusion even when a hypothesis is false, because implies is strict; skip (and count) cases whose hypotheses fail, so 'by test' works on bounded statements like the Array laws (D96) (`7ef8bf45`)

- state: todo
- priority: medium
- labels: prover
- links `Check.generate` (#ba17124ee9)

## Type checker: a test comparing a partial application with == passes the checker and returns false (Compile.Spec.apiReportsDeclarationsAsGaps after withHost gained a parameter); updates should reject it (`84ec6ef7`)

- state: todo
- priority: medium
- labels: types, devex

Found when D114 added a printer parameter to Cli.withHost: the spec failed at run time, not at update.

## Type headers print an ability by its IRI's last segment, so MdlHost (urn:deus:mdl:Host) prints as Host; print the ability's own name (`ab1ed867`)

- state: todo
- priority: medium
- labels: view, types

Since D108. Features.Spec's api block has to say {Host}.

## TypeScript bindings: export polymorphic functions with codec parameters (`b6907aeb`)

- state: todo
- priority: medium
- assignee: claude
- labels: interop, typescript

Follow-up of 17d50ae5: a function generic in a (firstOf : List a -> Option a) is skipped today. Export it as a generic TS function that takes the codec of each type variable, as generic types already do.

## TypeScript bindings: pass functions across (callbacks and closures) (`1474b99e`)

- state: todo
- priority: medium
- assignee: claude
- labels: interop, typescript

Follow-up of 17d50ae5: a parameter or result of function type is skipped. A TS callback could cross as a handle the kernel calls back through an ability; a DEUS closure as a handle TS can apply. Needs an embedding-ABI extension (functions only leave the kernel today, as {"$fn":true}).

## deus mdl --coverage: public definitions no api block names, and tests or theorems no req names (`908495a0`)

- state: todo
- priority: medium
- assignee: claude
- labels: mdl, spec

## Browser page: keep the in-memory file system in IndexedDB so a playground codebase survives a reload (`62be7dc4`)

- state: todo
- priority: low
- assignee: claude
- labels: browser

## Parse the TypeScript-like dialect back into Core (`be4c4645`)

- state: todo
- priority: low
- labels: dialects
- links `Ts.definition` (#e5f668ab9e)

> claude: Filed by the TS-like dialect thread (D70).

## TypeScript bindings: run in-process on the TypeScript kernel too (`353444f7`)

- state: todo
- priority: low
- assignee: claude
- labels: interop, typescript

Follow-up of 17d50ae5: bindings run on the wasm kernel only. The TS kernel (src/kernel) would give synchronous calls with no wasm, but its host handler cannot suspend a run for an async TS handler.

## TypeScript kernel in the browser: its JIT runs eval about 1.4x faster than the wasm kernel; needs a synchronous sha256 and an injectable host (no node: imports) (`6e4360bd`)

- state: todo
- priority: low
- assignee: claude
- labels: browser, perf, kernel

## law statement: compare compiled propositions instead of printed text, so any spelling of the claim is accepted (`0d7b0142`)

- state: todo
- priority: low
- assignee: claude
- labels: mdl, spec

## Explorer: show spec documents (prose, blocks in order, verdicts) from the codebase (`3e686896`)

- state: todo
- priority: none
- labels: explorer, spec

Follow-up to 50e58574 (D96): deus view <Doc> renders a document from block metadata; the explorer lists blocks only.

## deus task set ignores an unknown field (--status) instead of refusing it (`cb6c9a43`)

- state: todo
- priority: none
- labels: cli, bug

Found while closing cf5e187f: deus task set <id> --status done printed the task unchanged. It should name the known fields (title, state, priority, assignee, labels, parent, details).

## The R2 codebase remote (r2://agent-artifacts/deus/explorer-demo, main) and the git export are separate lineages: deus merge origin.main reports 373 conflicting names, so threads cannot pull, merge and push main as the primary VCS yet (`72207dc1`)

- state: canceled
- priority: urgent
- assignee: claude
- labels: dogfood, codebase

Wrong premise: explorer-demo is the explorer site's remote, not the codebase's. The shared codebase remote is r2://agent-artifacts/deus/toolchain (D101), seeded by the explorer-publish thread.

> claude: Also: from this container (claude/project-thread-abg4l3) the network policy refused uploads to the R2 host, so the analytics work went to git only; deus pull worked earlier in the same session.

## Analytics store: event types defined in the codebase, flat event rows (scalars and pinned refs), push-only sync as Parquet beside the codebase, queryable with Basin SQL (`87707577`)

- state: done
- priority: high
- assignee: claude
- labels: analytics, dogfood

Done in this change: @[event] structures (Analytics.Spec R-1, R-2), a local store under events/ (R-3, R-4), a Parquet writer and reader (L-1, L-2, R-5), push-only sync to events/<Type>/<hash>/<batch>.parquet (R-7, R-8), deus event types|record|import|list|stats|push|backfill, TestRun from deus test/check, AgentWrote from add/update --by, AgentChange and AgentStage backfills, CiRun from scripts/analytics-ci.mjs, scripts/analytics-publish.py for Iceberg (local catalog run end to end). Open: 1ad89782 (CI reads with pyarrow), c5955f97 (Basin, needs go-ahead), 821dd13d (statistics), 381f55f3 (explorer).

## Back up the codebase to GitHub as text (`0c53d3bd`)

- state: done
- priority: high
- assignee: claude
- labels: dogfood, replication
- links change #7b79105804

deus export: source per namespace, tasks and history as text, committed to the repo.

> claude: deus export packages/reflect/deus-lang/codebase writes code/, tasks.sexp, TASKS.md and HISTORY.md; a restore into an empty codebase gives the same 1380 names and hashes.

## Bindings: pretty TypeScript API (.js + .d.ts), spec-first in BINDINGS.mdl (`27d2d190`)

- state: done
- priority: high
- assignee: claude
- labels: interop, typescript
- links change #a1cc2bcbf9

Dmytro: 'we need generated pretty ts apis with .d.ts'. Top-level functions, constructor objects, handler interfaces, configure/load, Throw -> DeusThrow by default. Written spec-first per Dmytro's process: docs/spec/BINDINGS.mdl (requirements, API, theorems), then implementation and tests (D87).

> claude: Done: docs/spec/BINDINGS.mdl first (R-1..R-11, ten theorems), then the generator. The first deus check found distinct() colliding on (text, text, text1, text2); fixed. Tests: strict tsc on a consumer with @ts-expect-error probes, every export run, theorems checked in CI.

## Bring the codebase up to date with the toolchain sources; the export had raw hashes (`b2166fc8`)

- state: done
- priority: high
- assignee: claude
- labels: codebase, dogfood
- links change #21fbd2e94f

Dmytro: track tasks in codebase and make sure its up to date. The export on #13952 could not be restored: Cli and Replicate referred to old versions of Update.propagate, Project.reachable and five others, which print as raw hashes. Restored by naming them, then updated with every source under deus/ and platform/, including the codebase UI (dfaad231).

## Codebase UI on par with Unison Share: finder, namespaces, hover previews, diffs (`7ff351a9`)

- state: done
- priority: high
- assignee: claude
- labels: explorer, dogfood
- links change #62dcbb107d

Dmytro: one of the most impactful things you can do rn is a really good codebase ui, take unison as gold standard, check your work yourself. Also fixes builtin pages (#Bool) returning 404 and bucket uploads sending .js/.css as text/plain.

## Codebase UI on par with Unison Share: finder, namespaces, hover previews, diffs (`dfaad231`)

- state: done
- priority: high
- assignee: claude
- labels: explorer, dogfood
- links change #cf0f719d6e

Dmytro: one of the most impactful things you can do rn is a really good codebase ui, take unison as gold standard, check your work yourself. Also fixes builtin pages (#Bool) returning 404 and bucket uploads sending .js/.css as text/plain.

## Composer assistant skills for writing DEUS and using the codebase (`5d6c67b4`)

- state: done
- priority: high
- labels: js, composer, llm

> claude: Done (D102): skill org.dxos.deus.skill.deus with a DEUS syntax guide and the operations searchDefinitions and viewDefinition; both return correct text through composer.invoke. Not run through the assistant's model: the test identity has no account (401/403).

## Composer plugin in DEUS: a mini codebase explorer with ECHO access, loaded by URL (`771e6f9e`)

- state: done
- priority: high
- labels: js, composer

Surfaces and ECHO access written in DEUS, compiled with --js, loaded into Composer by URL; autocue demo.

> claude: Done (D102): examples/composer loads by URL in a production Composer; creates a DEUS codebase object, searches 1922 definitions, reads source with Uses/Used by, pins on the ECHO object. Autocue flow examples/composer/autocue/deus-plugin.mjs passes all 7 steps.

> claude: Its decision was renumbered D104 in the merge (D102 and D103 were taken).

> claude: Renumbered again: the decision is D106.

## Declarations without a body: def f with a full signature and no implementation (`cf5e187f`)

- state: done
- priority: high
- assignee: claude
- labels: language, spec
- links `Resolve.stub` (#7f17ed75ac)

From Dmytro: I think deus should allow declaring a definition with a type but no impl. Spec: docs/spec/COMPILE.mdl R-10 to R-16 (D94).

## Dogfood the spec process: .mdl spec, then APIs and laws, then code, proofs and tests; backfill the toolchain's subsystems (`6ffdc230`)

- state: done
- priority: high
- assignee: claude
- labels: dogfood, spec, mdl
- links change #10e77371ec

From Dmytro: how much of .mdl are you dogfooding? the general process should be mdl spec > apis + theorems > impls and proofs and tests. maybe backfill this for existing code and keep using this process as you go, eval it. See docs/SPEC-PROCESS.md (D92).

## Embed DEUS in browser apps on the wasm kernel: deus build --browser, an in-memory IO host, the toolchain as a playground (`3b617154`)

- state: done
- priority: high
- assignee: claude
- labels: wasm, browser, embedding
- links change #96cf462d73

Dmytro: explore embedding deus into browser apps via wasm (like codebase viewer for example)

## Explorer accounts: GitHub sign-in, writes limited to active dxos org members, read-only when signed out (`3bb7f0f7`)

- state: done
- priority: high
- assignee: claude
- labels: explorer, writing
- parent: 861438d2
- links change #c3aa27a438

## Explorer accounts: GitHub sign-in, writes limited to active dxos org members, read-only when signed out (`4909bee3`)

- state: done
- priority: high
- assignee: claude
- labels: explorer, writing
- parent: 861438d2
- links change #68dcd2f5f1

## Explorer accounts: GitHub sign-in, writes limited to active dxos org members, read-only when signed out (`a00fa56e`)

- state: done
- priority: high
- assignee: claude
- labels: explorer, writing
- parent: 861438d2
- links change #c432032637

## Explorer accounts: GitHub sign-in, writes limited to active dxos org members, read-only when signed out (`fb964840`)

- state: done
- priority: high
- assignee: claude
- labels: explorer, writing
- parent: 861438d2
- links change #feaea530df

## Explorer as an SPA showing several definitions at once (`84014a86`)

- state: done
- priority: high
- assignee: claude
- labels: review, explorer
- links `Explorer.generate` (#c3e00dc212)

## Explorer comments on definitions, changes and tasks, stored in the codebase (`22a99190`)

- state: done
- priority: high
- assignee: claude
- labels: explorer, writing
- parent: 861438d2
- links change #feaea530df

## Explorer comments on definitions, changes and tasks, stored in the codebase (`81438cac`)

- state: done
- priority: high
- assignee: claude
- labels: explorer, writing
- parent: 861438d2
- links change #68dcd2f5f1

## Explorer comments on definitions, changes and tasks, stored in the codebase (`b827edb2`)

- state: done
- priority: high
- assignee: claude
- labels: explorer, writing
- parent: 861438d2
- links change #c3aa27a438

## Explorer comments on definitions, changes and tasks, stored in the codebase (`d1534a34`)

- state: done
- priority: high
- assignee: claude
- labels: explorer, writing
- parent: 861438d2
- links change #c432032637

## Explorer: show events and their counts per definition from events.json (Analytics.siteJson) (`381f55f3`)

- state: done
- priority: high
- assignee: claude
- labels: explorer, analytics

Done as task ca75d545 (D110, e98a2e51) by the explorer thread: events.json, an Events card, and tallies on definition and change cards.

## Exports from several containers overwrite each other's history and tasks (`a93aee73`)

- state: done
- priority: high
- assignee: claude
- labels: dogfood, export, replication
- links change #8159bef4fa

Each thread exports codebase/ from its own ~/.deus, so the last export wins: history.sexp loses the other containers' entries, and tasks.sexp reverts tasks another container changed. Needed: fullLog dedup by causal hash plus importing codebase/history.sexp before export, and a field-wise task merge on import (Tasks.merge exists for branches).

## Feature maps in the codebase alongside tasks: a tree of features with status, linking specs, requirements, definitions and tasks; CLI, a backfilled map of the toolchain, shown in the explorer (`8a24ab99`)

- state: done
- priority: high
- assignee: claude
- labels: features, codebase

> claude: Done as D115: Features.Spec, the feature extension, deus features [--json], and Toolchain.Features (25 features). Showing it in the explorer is task 381a725d.

## File tasks from the explorer with image attachments stored as codebase assets (`16d433b5`)

- state: done
- priority: high
- assignee: claude
- labels: explorer, writing
- parent: 861438d2
- links change #c3aa27a438

## File tasks from the explorer with image attachments stored as codebase assets (`747a4182`)

- state: done
- priority: high
- assignee: claude
- labels: explorer, writing
- parent: 861438d2
- links change #68dcd2f5f1

## File tasks from the explorer with image attachments stored as codebase assets (`77740edd`)

- state: done
- priority: high
- assignee: claude
- labels: explorer, writing
- parent: 861438d2
- links change #feaea530df

## File tasks from the explorer with image attachments stored as codebase assets (`d2d4e786`)

- state: done
- priority: high
- assignee: claude
- labels: explorer, writing
- parent: 861438d2
- links change #c432032637

## JS back end: deus build --js, direct style, source maps (D94) (`86ef7d80`)

- state: done
- priority: high
- labels: js, backend
- links change #a3b91d88c1

deus build --js: one function per definition named after it, direct-style handlers, source maps; spec-first in docs/spec/JS.mdl.

## JS interop: Js.import bindings with codecs from the signature (D94) (`78c17e2d`)

- state: done
- priority: high
- labels: js

platform/js/js.deus: Js.import bindings, codecs chosen from the signature (JS.mdl#foreign-imports).

## Keep ordinary comments, so the codebase can be the source of truth for the toolchain (`b09507db`)

- state: done
- priority: high
- labels: dogfood, design
- links change #c1f5fb9764

Only doc comments survive add; the -- comments that explain why are lost, so deus/*.deus cannot yet be regenerated from the codebase. Store them as metadata and print them back.

> claude: Design question before building: storing each definition's source text in its metadata keeps comments, but that text depends on its file's namespace and open lines, and goes stale when a dependency is renamed. A workable rule: print the stored text only while every name in it still resolves to the hash it had when added, and keep namespace and opens with it; otherwise print from Core as now.

> claude: Written up as P8 in docs/PROPOSALS.md, four options; recommending B (source text as metadata while it still resolves, export rebuilds the files). Waiting on a choice before building.

> claude: Character literals are lost too: '"' is stored and printed as 34. Source text as metadata (P8 B) would keep both.

> claude: Built as comments on Core, the user's choice (D66): lead and notes metadata, restored by the printer. Character literals still print as numbers; filed separately.

## Namespace trees, deus migrate and full-history compaction (`a7a44f7d`)

- state: done
- priority: high
- assignee: claude
- labels: replication, design
- links change #a37df20cc0

Namespace snapshots are trees (D72), deus migrate rewrites flat history, the remote keeps the whole history and --keep is gone (D73), bundles stay columnar text (D74). Merged into #13952.

## Native compilation: a C back end compiled by clang/LLVM, and benchmarks of every back end (`7ca05fc5`)

- state: done
- priority: high
- labels: native, perf
- links change #9aa115afc5

deus build --c compiles the wasm subset to C (deus/cgen.deus); clang -O2 is within 1.4x of or faster than wasm in V8 and 12-26x faster than the JIT. Numbers and roadmap in docs/spec/NATIVE.md (D80).

## Native compilation: a C back end compiled by clang/LLVM, and benchmarks of every back end (`babdb4f2`)

- state: done
- priority: high
- labels: native, perf
- links change #83dbe4c096

deus build --c compiles the wasm subset to C (deus/cgen.deus); clang -O2 is within 1.4x of or faster than wasm in V8 and 12-26x faster than the JIT. Numbers and roadmap in docs/spec/NATIVE.md (D79).

## Native deus fails with DEUS_HOME is not set (`0f23f671`)

- state: done
- priority: high
- assignee: claude
- labels: review, bug
- links `Build.kernel` (#3a3356fef8)

## Native: Perceus reference counting with reuse for the C back end, so compiled programs free memory (`62d1bdda`)

- state: done
- priority: high
- labels: native, perf
- links change #dbf6867c1b

Done for the C back end (D86, docs/spec/NATIVE.md#memory). The wasm back end follows as its own task.

## Native: Perceus reference counting with reuse for the C back end, so compiled programs free memory (`932f4034`)

- state: canceled
- priority: high
- labels: native, perf

> claude: Duplicate of 62d1bdda: an export overwrite dropped this task, its thread filed it again, and the D89 restore brought both back.

## Native: reference counting with reuse in the wasm back end (D86's scheme) (`ef46861c`)

- state: done
- priority: high
- labels: native, perf, wasm
- links change #9081760a10

## Pure Array.set that writes in place when the array is unique (Lean 4 / Koka FBIP): Rc::get_mut in the Rust kernel, the reference count in compiled code, a copy on the TypeScript kernel (D83) (`95ca184f`)

- state: done
- priority: high
- labels: perf
- links `Array.set` (#b3d7fa0dc1)
- links change #034fda7dc8

## React bindings: hooks as an ability, a todo app in DEUS (D94) (`c06f5905`)

- state: done
- priority: high
- labels: js, react

platform/js/react.deus: a Hooks ability handled by React's hooks; examples/react/todo.deus, verified in Chromium.

## Reference forms: name IRI <project>/<name>, pinned <project>/<name>#<hash>, bare #<hash>; deus view accepts all three and an ambiguous #prefix is an error, not the first match (`3c8a311c`)

- state: done
- priority: high
- assignee: claude
- labels: analytics, codebase
- links change #d3d028011c

## Restoring the git export loses history, so the next export rewrites HISTORY.md (`5a02d566`)

- state: done
- priority: high
- assignee: claude
- labels: dogfood, replication
- links change #1778b66c03

A fresh container restored codebase/ (deus add code; task import) and got one new history; R2 credentials were absent, so pull was not an option. Export history as a restorable chain (causal nodes plus the namespace snapshot each names, as text), or append to HISTORY.md instead of replacing it.

## Sorting case study: does immutability make DEUS slow, and does it need mutable memory (`8aa78a39`)

- state: done
- priority: high
- assignee: claude
- labels: research
- links change #448eda5928

Measured in docs/IMMUTABILITY.md (D83): seven sorts on both kernels, wasm, C and JS. Adds a mutable Array primitive (both kernels, wasm, C), Ref in the compiled back ends, and fixes a Rust-kernel stack overflow when dropping long Ref chains.

## Specs live in the codebase: documents keep their prose, deus view and deus mdl take a document, docs/spec/*.mdl removed (`50e58574`)

- state: done
- priority: high
- assignee: claude
- labels: spec, mdl, codebase

From Dmytro: about mdl-first approach --- I want agents to record specs in codebase, not in github. and overall, most development at this point should be happening via-codebase. D99.

## Task viewer in the codebase explorer (`553faf09`)

- state: done
- priority: high
- assignee: claude
- labels: explorer

## The CLI defaults origin and the R2 endpoint for the toolchain codebase (`4b1eb1a9`)

- state: done
- priority: high
- assignee: claude
- labels: replication, cli
- links change #7886bef5ce

Dmytro: push the toolchain codebase to r2://agent-artifacts/deus/toolchain and make it the CLI default. Seeded the remote from the export; origin and the endpoint default for the toolchain project.

## The explorer History view hides the history imported from an export (`12663f55`)

- state: done
- priority: high
- assignee: claude
- labels: explorer, bug
- links change #112a8df7a8

After a restore, History showed only init, add code specs, task import and history import N changes, so the hosted explorer looked as if nobody updated the codebase. List the full log, as deus log does.

> claude: meta.json now carries the full log (up to 1000); a change with no causal node in the store is marked imported and shown greyed without a page. A restored toolchain codebase lists about 500 changes instead of 4.

## The prover ignores tactic names it does not know (`bf5681bf`)

- state: done
- priority: high
- assignee: claude
- labels: bug, proofs, spec
- links change #e7f95e998b

From docs/spec/README.md, Known divergences.

## Toolchain R2 codebase mistypes pattern variables: deus update of a match on some g fails there (`c62198a1`)

- state: done
- priority: high
- labels: codebase, bug
- links change #1883dc98b6

In a codebase pulled from origin.main #102beac5d7, deus add of 'def tt (h : Text) (xs : List Int) : Int := match List.head? xs with | some g => g + 1 | none => 0' fails with 'type mismatch: Int vs List Int'; it adds cleanly to a fresh init and to a restore of the git export. Updating deus/cgen.deus fails the same way at CGen.binders. Until fixed, threads update from the git export and cannot push to R2.

> claude: Cause: bundles never carried the builtin objects (#List, #Option…), so a pulled store had none and the checker typed every constructor pattern as unknown, binding no subpattern and shifting later variables onto earlier slots. Fixed in D112: closureOf adds the builtins, import accepts one only as a declaration of its own identity where none is held, and unknown constructors bind every subpattern. The R2 remote now holds the builtins.

## Type checker hangs on a type error in a large recursive group or a closed-row callback instead of reporting it (`1854b55d`)

- state: done
- priority: high
- labels: checker, bug

Bisected while writing jsgen.deus: (1) closed-row {IO} callbacks passed where {Throw Text | r} is expected; (2) a let-bound function used at two rows; (3) a ++/:: precedence type error in a big recursive group. Each made deus compile deus run for minutes instead of reporting; deus add into a scratch codebase reports the same errors fast.

> claude: Cause: JIT replays (D113). A type error throws from deep inside the checker's List.forEach callback, so each group's forEach replayed. Fixed in the kernel: with a type error in Print.printer, deus compile deus reports it in 6 s instead of 78 s.

## TypeScript interop: generate typed TypeScript bindings for DEUS namespaces (`17d50ae5`)

- state: done
- priority: high
- assignee: claude
- labels: interop, typescript
- links change #7510a284be

From Dmytro: explore interop with ts and generating typescript binding types.

> claude: Done (D81): deus bindings <prefix> -o <dir> writes <stem>.ts (types, codecs, handler types, an embedded image), deus-runtime.ts and deus_kernel.wasm. TypeScript calls DEUS functions; DEUS calls TypeScript by performing abilities the TS handlers answer. Tested by src/bindings/bindings.test.ts on examples/geometry.deus, strict tsc included.

## TypeScript interop: generate typed TypeScript bindings for DEUS namespaces (`207cac21`)

- state: done
- priority: high
- assignee: claude
- labels: interop, typescript
- links change #e6755a8eeb

From Dmytro: explore interop with ts and generating typescript binding types.

> claude: Done (D80): deus bindings <prefix> -o <dir> writes <stem>.ts (types, codecs, handler types, an embedded image), deus-runtime.ts and deus_kernel.wasm. TypeScript calls DEUS functions; DEUS calls TypeScript by performing abilities the TS handlers answer. Tested by src/bindings/bindings.test.ts on examples/geometry.deus, strict tsc included.

## TypeScript interop: generate typed TypeScript bindings for DEUS namespaces (`db71c327`)

- state: done
- priority: high
- assignee: claude
- labels: interop, typescript
- links change #c564461f42

From Dmytro: explore interop with ts and generating typescript binding types.

> claude: Done (D79): deus bindings <prefix> -o <dir> writes <stem>.ts (types, codecs, handler types, an embedded image), deus-runtime.ts and deus_kernel.wasm. TypeScript calls DEUS functions; DEUS calls TypeScript by performing abilities the TS handlers answer. Tested by src/bindings/bindings.test.ts on examples/geometry.deus, strict tsc included.

## codebase/ export has a raw #ebad142960 reference the parser rejects, so it cannot be restored (`b8b3aab7`)

- state: done
- priority: high
- assignee: claude
- labels: bug, dogfood, export

Reported by the explorer thread on #13952's branch (code/Cli.deus line 45). The printer writes unnamed references as #hash.

> claude: The explorer thread repaired the committed export (62a3bad2, its task b2166fc8). The exporter now names unnamed callees Unnamed.h<hash> (D77), with a round-trip test, so it cannot write #hash references again.

## deus compile runs for minutes instead of reporting a type error (Array.set's result passed to List.forEach; siteJson's nested tuple matches) (`a99bf01d`)

- state: done
- priority: high
- assignee: claude
- labels: bug, devex, perf

> claude: Cause: JIT replays (D113). A type error throws from deep inside the checker's List.forEach callback, so each group's forEach replayed. Fixed in the kernel: with a type error in Print.printer, deus compile deus reports it in 6 s instead of 78 s.

## deus export drops attributes, .mdl specs, the project file and some doc comments (`5fe4c8b1`)

- state: done
- priority: high
- assignee: claude
- labels: bug, dogfood, spec

From docs/spec/README.md, Known divergences.

## deus view output is cut off when piped (`4a833ce9`)

- state: done
- priority: high
- assignee: claude
- labels: dogfood, bug
- links `Cli.view` (#566910f645)

Viewing about 1000 definitions into a pipe stopped after about 1150 lines; into a file it is complete. The kernel probably exits before stdout drains.

> claude: Cause: the TypeScript host wrote stdout with one writeSync, which a full pipe cuts short (EAGAIN). src/kernel/host.ts now writes until every byte is out. Checked: 485919 bytes through a pipe whose reader waits 2 s, identical to the file; before, 65536.

## deus view output not formatted correctly, and no colours (`7c7b9ca0`)

- state: done
- priority: high
- assignee: claude
- labels: review, cli
- links `Print.definition` (#44b701111a)

> claude: Binder names now follow Resolve.strip's order; colours on a terminal (D61). Long lines are not yet broken.

## devex: deus mdl over all specs takes 34 s (`7f677d04`)

- state: done
- priority: high
- labels: devex, perf
- links change #93f3e01096

Every agent runs it before each commit; cache unchanged specs by hash.

> claude: deus mdl 36 s to 7 s (D114): one printer per run instead of two per described name, and checkTheorem builds its printer only to describe a failure. Output byte-identical (mdl --json).

## devex: update of printed (deus view) source is 9x slower than the same code as source (82 s vs 9 s); typecheck re-checks group members ~50x (`44892ca0`)

- state: done
- priority: high
- labels: devex, perf

Compile.typecheck checks members 82745 times for 1616 members on printed source vs 1625 on cat.deus. Found while measuring agent wall time.

> claude: Cause: JIT replays. Each group's List.forEach ran compiled, a callback's nested callee performed an operation near the end, and the whole forEach replayed (360 replays, 75 s). Fixed in the kernel (D113): calls passing a callback that deoptimized twice run on the machine. 85 s to 10.5 s.

## view escapes control characters as decimal, so an update rehashes (\u{1b} prints \u{27}) (`11b93dc9`)

- state: done
- priority: high
- assignee: claude
- labels: bug, spec

From docs/spec/README.md, Known divergences.

## wasm compares constructed values by address: some x == some x is 0 (`40cb2f16`)

- state: done
- priority: high
- assignee: claude
- labels: bug, wasm, spec
- links change #c08af3d400

From docs/spec/README.md, Known divergences.

## Backfill the explorer's writing and console into EXPLORER.mdl (APIs, requirements, laws) (`c50cd76e`)

- state: done
- priority: medium
- assignee: claude
- labels: explorer, spec
- parent: 861438d2
- links change #9cee717581

## Builtins are URIs at the embedding boundary (urn:deus:builtin:IO) (`279f2266`)

- state: done
- priority: medium
- assignee: claude
- labels: kernel, embedding

Dmytro asked whether builtins should be proper URIs. D68, eaafb41d.

## Character literals print as numbers ('"' becomes 34) (`0d21d8d5`)

- state: done
- priority: medium
- assignee: claude
- labels: dogfood, cli
- links change #6d6826c8bd

Lexer turns a character literal into an int token; keep the form as a note-like metadata entry so view prints it back.

## Explorer graph view: open definitions as code cards in a force-directed graph, beside the list (`55a3e9d5`)

- state: done
- priority: medium
- assignee: claude
- labels: explorer
- parent: 861438d2
- links change #3899aa8081

## Explorer overview: count tiles and recent changes should be clickable (`20dbe121`)

- state: done
- priority: medium
- assignee: claude
- labels: explorer
- parent: 861438d2

Dmytro: those should be clickable. Tiles open k:<kind> lists (k:checks failing first), the open-tasks tile opens the board, change messages open their change.

## Explorer report tool: signed-in members file a screenshot of the current view as a task (`e4a19978`)

- state: done
- priority: medium
- assignee: claude
- labels: explorer, writing
- parent: 861438d2
- links change #458d0633bd

## Explorer shows events: events.json, an Events card, and counts on definition and change cards (`ca75d545`)

- state: done
- priority: medium
- assignee: claude
- labels: explorer, analytics
- parent: 861438d2

> claude: Done (D108): spec Explorer.Spec R-14, R-15; Explorer.generate writes events.json and meta.events; the app's Events card and per-card counts, checked in a browser on desktop and phone.

## Explorer: a live console that runs eval, view and test against the site's codebase in the page (wasm kernel + seed + codebase snapshot, about 900 KB gzipped) (`d2328509`)

- state: done
- priority: medium
- assignee: claude
- labels: explorer, browser, wasm
- links change #0f3089d483

deus explore could ship deus_kernel.wasm, the seed and a JSON snapshot of the codebase directory; platform/browser/playground.mjs --codebase shows the shape. A definition card could get Run and Eval.

## JS back end refuses multi-shot handlers by name: a test for the refusal (`508d9443`)

- state: done
- priority: medium
- labels: js

JS.mdl R-2 is a gap until a test compiles such a handler and checks the message.

> claude: Done: JsGen.Spec.refusesMultiShotHandlers and JsGen.Spec.refusesInlineImports compile each case over the spec prelude and check the message; JsGen.Spec R-2 and R-3 cite them, and deus mdl JsGen.Spec reports no gaps.

## Native: 32-bit values with a tag bit in wasm built through C (halve block size) (`38603468`)

- state: canceled
- priority: medium
- labels: native, perf, wasm

Canceled (D102): DEUS Int is 32 bits with wrapping, so a tag bit would need 33; 64-bit values in wasm stay.

## Native: a C runtime for Text, maps and the other primitives, ported from the Rust kernel (`434a6dbc`)

- state: canceled
- priority: medium
- labels: native, perf

> claude: Duplicate of 72a1f2fb: an export overwrite dropped this task, its thread filed it again, and the D89 restore brought both back.

## Native: closure conversion and partial application in the C back end (`610b2785`)

- state: done
- priority: medium
- labels: native, perf
- links change #0ab73f8ca1

## Native: closure conversion and partial application in the C back end (`d807958c`)

- state: canceled
- priority: medium
- labels: native, perf

> claude: Duplicate of 610b2785: an export overwrite dropped this task, its thread filed it again, and the D89 restore brought both back.

## Native: effect handlers in the C back end by evidence passing, with stack switching for general resumptions (`c338b56e`)

- state: canceled
- priority: medium
- labels: native, perf

> claude: Duplicate of e1cf2c6c: an export overwrite dropped this task, its thread filed it again, and the D89 restore brought both back.

## Native: structural equality and ordering of data in the C back end (`f9cd5624`)

- state: done
- priority: medium
- labels: native, perf
- links change #c9c3e09be7

eq, compare and < on constructed values are refused in C (and wasm compares only some data types); the runtime can walk blocks by kind as the kernels' equal and compare do.

## One specification per format under docs/spec (`1a316e76`)

- state: done
- priority: medium
- assignee: claude
- labels: docs, spec

Done by the Format spec docs thread in b0a392d6: CORE, CODEBASE-STORE, CODEBASE-BINARY, CODEBASE-TEXT, EMBEDDING, WASM, MDL, LANGUAGE and more, with the known divergences in docs/spec/README.md.

## Parquet writer: min/max column statistics, so Basin SQL can prune files (pyiceberg warns they are missing) (`821dd13d`)

- state: done
- priority: medium
- assignee: claude
- labels: analytics, perf
- links change #f49a4c7913

## RC and the pure Array: once blocks carry reference counts (62d1bdda, cf0e3937), make the copying Array.set write in place at count 1 and Array.copy a share; the static pass in deus/unique.deus keeps removing the check where it proves uniqueness (D86) (`82d2d7a2`)

- state: done
- priority: medium
- labels: perf, native
- links `Unique.rewriteAll` (#9a8d82961a)

Done in D95: the C back end's Array.set writes in place at a count of one (deus_array_unique) and copies a shared or borrowed array; --wasm keeps the static pass.

## Readers do not verify hashes of bundles and objects; a stray file under bundles/ fails a pull (`7afeaa0c`)

- state: done
- priority: medium
- assignee: claude
- labels: bug, replication, spec
- links change #1efeb3fb7d

From docs/spec/README.md, Known divergences.

## Render the codebase in a TypeScript-like dialect (`655b148a`)

- state: done
- priority: medium
- labels: feature, dialects
- links change #02ade21de7

> claude: Dmytro: render the shared codebase format in other dialects, DEUS stays primary. First dialect: TypeScript-like, view and explorer only; parsing back is a follow-up.

## Self-hosting test takes 74 s since the round trip covers everything (`5d370204`)

- state: done
- priority: medium
- assignee: claude
- labels: dogfood, perf
- links change #69a3390756

view of 1061 definitions plus update of all of them; profile which half dominates.

> claude: view built a printer per definition; sharing one took viewing 1061 definitions from 45 s to 2 s, output identical.

## Test that the JS back end refuses Js.import inside an expression (`05658284`)

- state: done
- priority: medium
- labels: js

JsGen.gather throws '<name> uses Js.import inside an expression'. Add a test beside the multi-shot refusal test (task 508d9443).

> claude: Done: JsGen.Spec.refusesMultiShotHandlers and JsGen.Spec.refusesInlineImports compile each case over the spec prelude and check the message; JsGen.Spec R-2 and R-3 cite them, and deus mdl JsGen.Spec reports no gaps.

## Text.fromCodes loses the high bits of code points above U+FFFF in the TypeScript kernel (`2bbc3445`)

- state: done
- priority: medium
- assignee: claude
- labels: bug, kernel, spec
- links change #fa20112443

From docs/spec/README.md, Known divergences.

## Theorem view prints P -> Q as prim "implies" (P) (Q) (`4f7f9e40`)

- state: done
- priority: medium
- assignee: claude
- labels: bug, print
- links change #8cb84289e1

Found writing law statements (D91): deus view Sort.insertSorted.

## Type ascriptions are erased before checking; a row on a definition without binders is not checked (`a03fdfb6`)

- state: done
- priority: medium
- assignee: claude
- labels: bug, types, spec
- links change #a40db3f119

From docs/spec/README.md, Known divergences.

## TypeScript bindings: export polymorphic functions with codec parameters (`091e43c0`)

- state: canceled
- priority: medium
- assignee: claude
- labels: interop, typescript

Follow-up of db71c327: a function generic in a (firstOf : List a -> Option a) is skipped today. Export it as a generic TS function that takes the codec of each type variable, as generic types already do.

> claude: Duplicate of b6907aeb: an export overwrite dropped this task, its thread filed it again, and the D89 restore brought both back.

## TypeScript bindings: export polymorphic functions with codec parameters (`e84ff062`)

- state: canceled
- priority: medium
- assignee: claude
- labels: interop, typescript

Follow-up of 207cac21: a function generic in a (firstOf : List a -> Option a) is skipped today. Export it as a generic TS function that takes the codec of each type variable, as generic types already do.

> claude: Duplicate of b6907aeb: an export overwrite dropped this task, its thread filed it again, and the D89 restore brought both back.

## TypeScript bindings: pass functions across (callbacks and closures) (`de710f29`)

- state: canceled
- priority: medium
- assignee: claude
- labels: interop, typescript

Follow-up of db71c327: a parameter or result of function type is skipped. A TS callback could cross as a handle the kernel calls back through an ability; a DEUS closure as a handle TS can apply. Needs an embedding-ABI extension (EMBEDDING.md has {"$fn":true} output only).

> claude: Duplicate of 1474b99e: an export overwrite dropped this task, its thread filed it again, and the D89 restore brought both back.

## TypeScript bindings: pass functions across (callbacks and closures) (`ef597118`)

- state: canceled
- priority: medium
- assignee: claude
- labels: interop, typescript

Follow-up of 207cac21: a parameter or result of function type is skipped. A TS callback could cross as a handle the kernel calls back through an ability; a DEUS closure as a handle TS can apply. Needs an embedding-ABI extension (functions only leave the kernel today, as {"$fn":true}).

> claude: Duplicate of 1474b99e: an export overwrite dropped this task, its thread filed it again, and the D89 restore brought both back.

## deus explore is quadratic in names: aliases scan the whole namespace per definition (`a75452c4`)

- state: done
- priority: medium
- assignee: claude
- labels: dogfood, perf
- links `Explorer.generate` (#b304532cfd)
- links change #87b9ac35c4

Profile: Map.foldr 2.0M and Entry.hash 1.7M entries of 8 s, from Codebase.namesOf per definition. Invert the namespace once.

## wasm: structural equality on constructed values (`186feaf2`)

- state: done
- priority: medium
- assignee: claude
- labels: wasm
- links change #4b89319b5e

D69 refuses == on data; generate per-type compare functions from the type objects so it compiles.

## BINDINGS.mdl: turn the requirements table into req blocks so deus mdl checks its evidence links (`b4d7a440`)

- state: done
- priority: low
- assignee: claude
- labels: mdl, spec, interop

## Docs disagree with the code in eight places listed in docs/spec/README.md (`11a42afd`)

- state: done
- priority: low
- assignee: claude
- labels: docs, spec
- links change #387eb2652a

From docs/spec/README.md, Known divergences.

## Native: reuse freed blocks over 256 words (long arrays) in the C back end (`f7d39ad6`)

- state: done
- priority: low
- labels: native, perf
- links change #eddca32cd2

## Type display names a type by its IRI's tail (task:Task) instead of its name (Task) (`f6a2c2ff`)

- state: done
- priority: low
- assignee: claude
- labels: bug, types

Found writing api blocks (D91): deus view Export.taskMarkdown shows task:Task -> Text.

## TypeScript bindings: run in-process on the TypeScript kernel too (`e69b5384`)

- state: canceled
- priority: low
- assignee: claude
- labels: interop, typescript

Follow-up of 207cac21: bindings run on the wasm kernel only. The TS kernel (src/kernel) would give synchronous calls with no wasm, but its host handler cannot suspend a run for an async TS handler.

> claude: Duplicate of 353444f7: an export overwrite dropped this task, its thread filed it again, and the D89 restore brought both back.

## TypeScript bindings: run in-process on the TypeScript kernel too (`eea32f23`)

- state: canceled
- priority: low
- assignee: claude
- labels: interop, typescript

Follow-up of db71c327: bindings run on the wasm kernel only. The TS kernel (src/kernel) would give synchronous calls with no wasm, but its host handler cannot suspend a run for an async TS handler.

> claude: Duplicate of 353444f7: an export overwrite dropped this task, its thread filed it again, and the D89 restore brought both back.

## Break long lines in deus view output (`d7eba020`)

- state: done
- priority: none
- labels: cli
- parent: 7c7b9ca0
- links `Print.definition` (#44b701111a)
- links change #f7f6be3863

## Builtins should come by default on init (`915c9c9e`)

- state: done
- priority: none
- assignee: claude
- labels: review, cli
- links `Cli.init` (#b5c69be877)

## Explain how deus add deus resolves its path (`4483b915`)

- state: done
- priority: none
- assignee: claude
- labels: review, docs

## Explorer: show the source of a change, not only its message (`1ce541ac`)

- state: done
- priority: none
- assignee: claude
- labels: dogfood, explorer
- links change #e48cf63f71

History rows link nowhere; a change page could list the definitions it added or replaced.

## Gitignore .deus and keep one codebase in the home directory (`57a25668`)

- state: done
- priority: none
- assignee: claude
- labels: review, cli
- links `Cli.codebaseDir` (#a169a27519)

## Host the explorer on a Worker kept current from R2 (`ad0006da`)

- state: done
- priority: none
- assignee: claude
- labels: review, explorer
- links `Cli.push` (#69ccb8bb8b)

> claude: Deployed platform/explorer-worker to a temporary account; deus push refreshes the bucket it reads.

## Inductive constructors lose their field names when printed (`4bf3eed4`)

- state: done
- priority: none
- assignee: claude
- labels: dogfood, cli
- links `View.typeDecl` (#dab6051210)
- links change #e2a4045a8a

inductive Result (e a : Type) where | ok (value : a) prints as | ok a.

## Task changes do not record who made them as provenance (`3d6508e4`)

- state: done
- priority: none
- assignee: claude
- labels: dogfood, tasks
- links `Tasks.save` (#55c07ae1f6)
- links change #f48010e0fa

deus task new --by claude puts the author on the task but not on the change, so HISTORY.md shows task changes without (by ...).

> claude: This comment is the first task change with provenance.

## deus run takes the codebase only from the environment (`9caae4c1`)

- state: done
- priority: none
- assignee: claude
- labels: dogfood, cli
- links `Cli.run` (#5a32b74cc4)
- links change #ed7e98a85a

Every argument after the name goes to the program, so --codebase cannot be given.

