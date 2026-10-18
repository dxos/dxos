# Usability probe: a front-end developer on `@dxos/web` (2026-10-17 01:30 UTC)

A Haiku agent, briefed as a front-end developer deciding whether to adopt DEUS for UI work, made fifteen
visits through the hub and `@dxos/web`: JSX, React components, spec documents, tests, tasks and history.

## What it found working

Definitions link both ways (specified in, dependencies, users); spec requirements name the check that proves
them, with its result; open gaps are shown and link to a task; the glossary is short; task pages keep history.

## What it found wrong, and what changed

| Finding                                                                               | Change                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The UI specs said `building` until task b2404fd2, which is done                       | `TodoApp.Spec` F-1 is `shipped` (the Chromium test proves it); React and Js stay `building` under a new open task, bfe80272, that names what is left; Composer and DeusPlugin point at 19c052f1. `deus mdl`: 53 ok, no known gaps |
| No running UI on the site; this was the change it wanted most                         | The todo app, built from `examples/react` by `scripts/build-worker.mjs --live`, runs at `/demo/todo/`; the hub and `TodoApp.Spec` link it beside its source                                                                       |
| The hub showed `@dxos/examples` red, 33/34                                            | The failing check was `Sort.wrongClaim`, false on purpose; it is `@[refuted]`, so it passes while the prover refuses it                                                                                                           |
| Several sidebar rows read just "Spec"                                                 | They sit under their namespace in the tree; each row now has its full name as a tooltip                                                                                                                                           |
| The hub and `@dxos/web` offer different starting points (the Tour, TodoApp)           | Not changed: one is the language, the other UI work; the hub now names both                                                                                                                                                       |
| History shows experiment commits ("add greet.deus") and a scratch path in one message | Not changed: history is what happened; the scratch path came from an import before messages used file names                                                                                                                       |
| "370/370 checks pass" while `Compile.Spec` R-9 is proved by nothing yet               | Not changed: checks and requirements are different counts; the spec page shows the gap                                                                                                                                            |
