# Tasks

## Keep ordinary comments, so the codebase can be the source of truth for the toolchain (`b09507db`)

- state: todo
- priority: high
- labels: dogfood, design

Only doc comments survive add; the -- comments that explain why are lost, so deus/*.deus cannot yet be regenerated from the codebase. Store them as metadata and print them back.

> claude: Design question before building: storing each definition's source text in its metadata keeps comments, but that text depends on its file's namespace and open lines, and goes stale when a dependency is renamed. A workable rule: print the stored text only while every name in it still resolves to the hash it had when added, and keep namespace and opens with it; otherwise print from Core as now.

> claude: Written up as P8 in docs/PROPOSALS.md, four options; recommending B (source text as metadata while it still resolves, export rebuilds the files). Waiting on a choice before building.

> claude: Character literals are lost too: '"' is stored and printed as 34. Source text as metadata (P8 B) would keep both.

## Parse the TypeScript-like dialect back into Core (`be4c4645`)

- state: todo
- priority: low
- labels: dialects
- links `Ts.definition` (#e5f668ab9e)

## Back up the codebase to GitHub as text (`0c53d3bd`)

- state: done
- priority: high
- assignee: claude
- labels: dogfood, replication
- links change #7b79105804

deus export: source per namespace, tasks and history as text, committed to the repo.

> claude: deus export packages/reflect/deus-lang/codebase writes code/, tasks.sexp, TASKS.md and HISTORY.md; a restore into an empty codebase gives the same 1380 names and hashes.

## Codebase UI on par with Unison Share: finder, namespaces, hover previews, diffs (`7ff351a9`)

- state: done
- priority: high
- assignee: claude
- labels: explorer, dogfood
- links change #62dcbb107d

Dmytro: one of the most impactful things you can do rn is a really good codebase ui, take unison as gold standard, check your work yourself. Also fixes builtin pages (#Bool) returning 404 and bucket uploads sending .js/.css as text/plain.

## Explorer as an SPA showing several definitions at once (`84014a86`)

- state: done
- priority: high
- assignee: claude
- labels: review, explorer
- links `Explorer.generate` (#c3e00dc212)

## Native deus fails with DEUS_HOME is not set (`0f23f671`)

- state: done
- priority: high
- assignee: claude
- labels: review, bug
- links `Build.kernel` (#3a3356fef8)

## Task viewer in the codebase explorer (`553faf09`)

- state: done
- priority: high
- assignee: claude
- labels: explorer

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

