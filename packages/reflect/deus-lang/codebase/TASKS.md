# Tasks

## Keep ordinary comments, so the codebase can be the source of truth for the toolchain (`b09507db`)

- state: todo
- priority: high
- labels: dogfood, design

Only doc comments survive add; the -- comments that explain why are lost, so deus/*.deus cannot yet be regenerated from the codebase. Store them as metadata and print them back.

## Self-hosting test takes 74 s since the round trip covers everything (`5d370204`)

- state: todo
- priority: medium
- labels: dogfood, perf

view of 1061 definitions plus update of all of them; profile which half dominates.

## Explorer: show the source of a change, not only its message (`1ce541ac`)

- state: todo
- priority: none
- labels: dogfood, explorer

History rows link nowhere; a change page could list the definitions it added or replaced.

## Inductive constructors lose their field names when printed (`4bf3eed4`)

- state: todo
- priority: none
- labels: dogfood, cli
- links `View.typeDecl` (#dab6051210)

inductive Result (e a : Type) where | ok (value : a) prints as | ok a.

## deus run takes the codebase only from the environment (`9caae4c1`)

- state: todo
- priority: none
- labels: dogfood, cli
- links `Cli.run` (#5a32b74cc4)

Every argument after the name goes to the program, so --codebase cannot be given.

## Back up the codebase to GitHub as text (`0c53d3bd`)

- state: done
- priority: high
- assignee: claude
- labels: dogfood, replication
- links change #7b79105804

deus export: source per namespace, tasks and history as text, committed to the repo.

> claude: deus export packages/reflect/deus-lang/codebase writes code/, tasks.sexp, TASKS.md and HISTORY.md; a restore into an empty codebase gives the same 1380 names and hashes.

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

## Task changes do not record who made them as provenance (`3d6508e4`)

- state: done
- priority: none
- assignee: claude
- labels: dogfood, tasks
- links `Tasks.save` (#55c07ae1f6)
- links change #f48010e0fa

deus task new --by claude puts the author on the task but not on the change, so HISTORY.md shows task changes without (by ...).

> claude: This comment is the first task change with provenance.

