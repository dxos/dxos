# Tasks

## Embed files in the codebase, never in git, and make artifacts cached constants (`88004c30`)

- state: todo
- priority: high
- assignee: claude
- labels: dogfood, artifacts

From Dmytro: an artifact is a constant whose value is cached, e.g. deusCli := Deus.toBinary Cli.main; evaluating it once caches the result in the artifacts layer by the hash of the expression.

## Native: Perceus reference counting with reuse for the C back end, so compiled programs free memory (`62d1bdda`)

- state: todo
- priority: high
- labels: native, perf

## QA flows for web apps: scripted user journeys checked in simulation, on a real server and in a browser (`9428f054`)

- state: doing
- priority: high
- assignee: claude
- labels: qa, web
- links `Qa.check` (#8fbd9f94b9)

From Dmytro: figure out QA flows for web apps, using what dxos does (.mdl QA tests, composer-qa, autocue).

> claude: First arm built (D65): qa blocks in MDL with do/expect/send/assert steps, run by deus mdl in Web.simulateMany; examples/notes.mdl has two flows. Next: the same steps against deus serve (--integration) and in a browser.

> claude: Simulation is done (D65, qa blocks run by deus mdl). Left: run the same flows against deus serve and in a browser.

## The codebase explorer app needs to be much better (`861438d2`)

- state: doing
- priority: high
- assignee: claude
- labels: explorer

From Dmytro. Measure it against share.unison-lang.org: search, navigation, dependency links, history.

> claude: The Codebase explorer UI thread built a Unison-style UI (finder, namespace pages, definition and change cards, keyboard), verified with Playwright; merging into #13952 from PR #13975. It also fixes the builtin page 404 and the content types.

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

## Character literals print as numbers ('"' becomes 34) (`0d21d8d5`)

- state: todo
- priority: medium
- assignee: claude
- labels: dogfood, cli

Lexer turns a character literal into an int token; keep the form as a note-like metadata entry so view prints it back.

## Embedding kernel re-reads the whole image on every deus_start (about 60 ms for the seed): keep a loaded image and call entries on it (`d780de91`)

- state: todo
- priority: medium
- assignee: claude
- labels: wasm, perf, embedding

## Explorer: a live console that runs eval, view and test against the site's codebase in the page (wasm kernel + seed + codebase snapshot, about 900 KB gzipped) (`d2328509`)

- state: todo
- priority: medium
- assignee: claude
- labels: explorer, browser, wasm

deus explore could ship deus_kernel.wasm, the seed and a JSON snapshot of the codebase directory; platform/browser/playground.mjs --codebase shows the shape. A definition card could get Run and Eval.

## Native: a C runtime for Text, maps and the other primitives, ported from the Rust kernel (`72a1f2fb`)

- state: todo
- priority: medium
- labels: native, perf

## Native: closure conversion and partial application in the C back end (`610b2785`)

- state: todo
- priority: medium
- labels: native, perf

## Native: effect handlers in the C back end by evidence passing, with stack switching for general resumptions (`e1cf2c6c`)

- state: todo
- priority: medium
- labels: native, perf

## Readers do not verify hashes of bundles and objects; a stray file under bundles/ fails a pull (`7afeaa0c`)

- state: todo
- priority: medium
- assignee: claude
- labels: bug, replication, spec

From docs/spec/README.md, Known divergences.

## Type ascriptions are erased before checking; a row on a definition without binders is not checked (`a03fdfb6`)

- state: todo
- priority: medium
- assignee: claude
- labels: bug, types, spec

From docs/spec/README.md, Known divergences.

## wasm: structural equality on constructed values (`186feaf2`)

- state: todo
- priority: medium
- assignee: claude
- labels: wasm

D69 refuses == on data; generate per-type compare functions from the type objects so it compiles.

## Browser page: keep the in-memory file system in IndexedDB so a playground codebase survives a reload (`62be7dc4`)

- state: todo
- priority: low
- assignee: claude
- labels: browser

## Docs disagree with the code in eight places listed in docs/spec/README.md (`11a42afd`)

- state: todo
- priority: low
- assignee: claude
- labels: docs, spec

From docs/spec/README.md, Known divergences.

## Parse the TypeScript-like dialect back into Core (`be4c4645`)

- state: todo
- priority: low
- labels: dialects
- links `Ts.definition` (#e5f668ab9e)

> claude: Filed by the TS-like dialect thread (D70).

## TypeScript kernel in the browser: its JIT runs eval about 1.4x faster than the wasm kernel; needs a synchronous sha256 and an injectable host (no node: imports) (`6e4360bd`)

- state: todo
- priority: low
- assignee: claude
- labels: browser, perf, kernel

## Back up the codebase to GitHub as text (`0c53d3bd`)

- state: done
- priority: high
- assignee: claude
- labels: dogfood, replication
- links change #7b79105804

deus export: source per namespace, tasks and history as text, committed to the repo.

> claude: deus export packages/reflect/deus-lang/codebase writes code/, tasks.sexp, TASKS.md and HISTORY.md; a restore into an empty codebase gives the same 1380 names and hashes.

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

## Explorer as an SPA showing several definitions at once (`84014a86`)

- state: done
- priority: high
- assignee: claude
- labels: review, explorer
- links `Explorer.generate` (#c3e00dc212)

## Explorer comments on definitions, changes and tasks, stored in the codebase (`b827edb2`)

- state: done
- priority: high
- assignee: claude
- labels: explorer, writing
- parent: 861438d2
- links change #c3aa27a438

## Exports from several containers overwrite each other's history and tasks (`a93aee73`)

- state: done
- priority: high
- assignee: claude
- labels: dogfood, export, replication
- links change #8159bef4fa

Each thread exports codebase/ from its own ~/.deus, so the last export wins: history.sexp loses the other containers' entries, and tasks.sexp reverts tasks another container changed. Needed: fullLog dedup by causal hash plus importing codebase/history.sexp before export, and a field-wise task merge on import (Tasks.merge exists for branches).

## File tasks from the explorer with image attachments stored as codebase assets (`16d433b5`)

- state: done
- priority: high
- assignee: claude
- labels: explorer, writing
- parent: 861438d2
- links change #c3aa27a438

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

## Native deus fails with DEUS_HOME is not set (`0f23f671`)

- state: done
- priority: high
- assignee: claude
- labels: review, bug
- links `Build.kernel` (#3a3356fef8)

## Restoring the git export loses history, so the next export rewrites HISTORY.md (`5a02d566`)

- state: done
- priority: high
- assignee: claude
- labels: dogfood, replication
- links change #1778b66c03

A fresh container restored codebase/ (deus add code; task import) and got one new history; R2 credentials were absent, so pull was not an option. Export history as a restorable chain (causal nodes plus the namespace snapshot each names, as text), or append to HISTORY.md instead of replacing it.

## Task viewer in the codebase explorer (`553faf09`)

- state: done
- priority: high
- assignee: claude
- labels: explorer

## The prover ignores tactic names it does not know (`bf5681bf`)

- state: done
- priority: high
- assignee: claude
- labels: bug, proofs, spec
- links change #e7f95e998b

From docs/spec/README.md, Known divergences.

## codebase/ export has a raw #ebad142960 reference the parser rejects, so it cannot be restored (`b8b3aab7`)

- state: done
- priority: high
- assignee: claude
- labels: bug, dogfood, export

Reported by the explorer thread on #13952's branch (code/Cli.deus line 45). The printer writes unnamed references as #hash.

> claude: The explorer thread repaired the committed export (62a3bad2, its task b2166fc8). The exporter now names unnamed callees Unnamed.h<hash> (D77), with a round-trip test, so it cannot write #hash references again.

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

## Builtins are URIs at the embedding boundary (urn:deus:builtin:IO) (`279f2266`)

- state: done
- priority: medium
- assignee: claude
- labels: kernel, embedding

Dmytro asked whether builtins should be proper URIs. D68, eaafb41d.

## One specification per format under docs/spec (`1a316e76`)

- state: done
- priority: medium
- assignee: claude
- labels: docs, spec

Done by the Format spec docs thread in b0a392d6: CORE, CODEBASE-STORE, CODEBASE-BINARY, CODEBASE-TEXT, EMBEDDING, WASM, MDL, LANGUAGE and more, with the known divergences in docs/spec/README.md.

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

## Text.fromCodes loses the high bits of code points above U+FFFF in the TypeScript kernel (`2bbc3445`)

- state: done
- priority: medium
- assignee: claude
- labels: bug, kernel, spec
- links change #fa20112443

From docs/spec/README.md, Known divergences.

## deus explore is quadratic in names: aliases scan the whole namespace per definition (`a75452c4`)

- state: done
- priority: medium
- assignee: claude
- labels: dogfood, perf
- links `Explorer.generate` (#b304532cfd)
- links change #87b9ac35c4

Profile: Map.foldr 2.0M and Entry.hash 1.7M entries of 8 s, from Codebase.namesOf per definition. Invert the namespace once.

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

