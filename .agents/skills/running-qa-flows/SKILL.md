---
name: running-qa-flows
description: >-
  Execute a `flow QA-n` block from a `.mdl` spec against a running Composer — establish its
  preconditions, drive each step through the agent debug port, and report a per-step pass/fail
  table. Use when asked to run a plugin's QA flows, verify a `## QA` section, or check a change
  end to end against the real app rather than a test runner. For ad-hoc probing of a live page use
  `composer-debug`; this skill is for executing a written plan.
---

# Running QA flows

A `flow` is a written test plan that a human and an agent execute from the same source. The human
reads `do:`; you invoke `invoke:` and evaluate `assert:`. Both judge `expect:`.

The language is defined in [`packages/reflect/deus/lang/qa.mdl`](../../../packages/reflect/deus/lang/qa.mdl).
Flows live in the `## QA` section of a `PLUGIN.mdl`, or in `packages/apps/composer-app/APP.mdl`
for journeys that cross plugins.

## Consent

A flow mutates by definition, so the read-only default in `composer-debug` does not apply. Consent
is at **flow granularity**: the user approves a named flow, you run all of its steps.

1. Name the flow and summarise what it will change before starting. Do not run an unapproved flow.
2. Never run a flow against the user's own Composer profile without saying so — prefer a dev
   server you started, whose profile is disposable.
3. All three stages run unless `--stage` narrows it (see §6).

## 1. Read the flow

Read the `flow` block itself first — `given`, and the `before` / `test` / `after` lists. Each stage is an array of steps, numbered by position from 1; a step carrying an `id:` is referenced by that instead. For
each step read `do` / `invoke` / `expect` / `assert` and any `note`. A `note` is a constraint on
how the step must be run, not commentary: ignoring one produces a false failure. Restate what the
flow will change before asking for consent.

## 2. Get a running app with the port open

Start your own server rather than asking the user to flip a switch:

```bash
moon run composer-app:serve-qa
```

`DX_DEBUG_PORT=true` (set by that task) mints a session, starts the port as the app boots, and
publishes it. Read it back:

```bash
cat temp/debug-port.json     # { session, pid, port, url }
```

Set `DX_DEBUG_PORT_SESSION=<uuid>` instead to choose the id yourself, which skips the read-back —
do that whenever you can set the env of the process you launch.

Through the Browser pane, `preview_start` with the `composer-qa` launch configuration does the
same on port 5182.

Then drive it exactly as `composer-debug` describes — same script, same wire protocol:

```bash
node .agents/skills/composer-forensics/scripts/composer-recovery.js --session <uuid> '<snippet>'
```

**A page reload stops the port**, and a vite restart after a large merge leaves the module graph
stale — restart the server rather than reloading, and re-read the sidecar for the new session.

## 3. Establish `given`

Every precondition, before step 1. If one cannot be met, **abort and say which** — a flow run
against unmet preconditions reports failures that belong to the fixture, not the application.

**Check that the flow's own artifacts are absent, whether or not `given` says so.** A previous run
whose `after` stage was skipped leaves objects behind, and an existence-shaped assert
(`some((o) => o.name === 'QA Notes')`) is then already true before step 1 — the step reports pass
having done nothing.

**Never delete an artifact this run did not create.** A same-named object may be the user's, and a
name match is not evidence of ownership. Abort and say what is in the way; the user decides whether
to remove it. Only artifacts captured during the current run are yours to clean up (§6).

Prefer identity-shaped asserts (`some((o) => o.id === $created.object.id)`), which discriminate even
on a dirty fixture; where you meet an existence-shaped one, fix it per §7.

A fresh dev profile boots with an identity and a default space already created. Verify rather than
assume:

```js
return {
  identity: !!dxos.halo.identity.get(),
  spaces: dxos.client.spaces.get().map((s) => ({ id: s.id, state: s.state.get(), name: s.properties?.name })),
};
```

`SpaceState.SPACE_READY === 3`. To create an identity where there is none:
`await dxos.client.halo.createIdentity({ displayName: 'QA' })`.

## 4. Run the steps

**Always invoke through the operation invoker with an explicit `spaceId`.** Do not branch on the
op's `requires:` — an operation's declaration cannot see what services its downstream calls need,
so `requires:` predicts nothing reliably. One helper, used for every step:

```js
const invokeOp = async (key, input, space) => {
  const mgr = composer.manager;
  const sets = mgr.capabilities.getAll({ identifier: 'org.dxos.app-framework.capability.operationHandler' });
  const matches = sets.flatMap((set) =>
    set.definitions().filter((d) => String(d.meta.key).replace(/^dxn:/, '') === key),
  );
  if (matches.length !== 1) {
    throw new Error(`expected exactly one operation for ${key}, found ${matches.length}`);
  }
  const invoker = mgr.capabilities.get({ identifier: 'org.dxos.app-framework.capability.operationInvoker' });
  const { data, error } = await invoker.invokePromise(matches[0], input, { spaceId: space.id });
  if (error) {
    throw new Error(String(error));
  }
  return data;
};
```

**Match the key exactly — never by suffix.** `endsWith('create')` matches both
`org.dxos.operation.markdown.create` and `org.dxos.operation.markdown.createDraft`, which is the
precise ambiguity the `key:` field exists to remove; a suffix match silently reintroduces it and
takes whichever came first. Failing on anything but exactly one match turns a renamed or duplicated
key into an error rather than a wrong operation.

**Coalesce adjacent steps that thread a live object.** The port serializes between snippets, so an
ECHO object captured in one step cannot reach the next as a proxy. When a step's `capture:` feeds
the following step's `invoke:`, run both in one snippet. Step granularity belongs to the human;
batching is yours.

**Judge the effect, not the return value.** A successful invocation routinely did less than the
step intended — a `create` operation is a factory and places nothing. Evaluate `assert:` if the
step has one; otherwise judge `expect:` from a database query or the DOM. `space.db.query(…).run()`
resolves to an array, not `{ objects }`.

**Select a document in the navtree before editing it.** Opening the plank is what binds the editor
to that document; an edit invoked against a document the navtree has not selected lands in the
database without the surface the human is looking at ever showing it.

**A link to another object is a DXN, not a path.** `Obj.getURI(object)` yields
`echo://<spaceId>/<objectId>`, which is exactly what the link query and the "Inline link" command
write. A root-relative `/<objectId>` renders as an ordinary http hyperlink and resolves to nothing —
and an assert that only looks for the link label will not catch it, so match the scheme.

**Opening an object** needs a navigation path, and you must build it — `space.addObject` returns
`{ id, object }` and no `subject`:

```js
const path = `root/${space.id}/content/collections/${object.id}`;
await composer.invoke('org.dxos.operation.appToolkit.open', { subject: [path] });
```

For a view-holding object the last-but-one segment is the view's target type rather than
`collections`; read it off an existing navtree entry rather than guessing.

## 5. Report

A table, one row per step, most useful column last:

```text
QA-1  Create, place, open and edit a document          4/4 pass
  1       Create the document          pass
  2       Place it in the collection   pass    (coalesced with 1)
  3 open  Open it                      pass
  4       Fix the typo                 FAIL    expected "There is a typo.", DOM still has "tyop"
```

One row per step, in `test` order, labelled with the step's `name`. Report a failure as
`QA-<flow>.<step>` — the position (`QA-1.4`), or the step's `id` where it declares one
(`QA-1.open`), preferring the id since it survives a step being inserted ahead of it. This is
Execution Rule 9 in the dialect; the two must not diverge. Give the observed value next to the
expected one, and never report a step as passing because the invocation returned without throwing.

## 6. Stages

A flow has three step lists, run in order: **`before`** builds the fixture, **`test`** is the test, **`after`** tears it down. Keep the distinction when reporting — a `before` failure is a
broken fixture, a `test` failure is a defect in the application.

`--stage=before|test|after` runs one of them. Omitted, all three run in order. `after` removes **only what this run created** — the objects it captured, by identity. It is a
step list like any other, run through operations, not raw database calls. The
difference is not pedantry: `space.db.remove` deletes the object but leaves a plank pointing at it,
and **the user cannot close a plank whose object no longer exists**. `space.removeObjects` unlinks
from the collection and closes what was open, reporting it as `wasActive`.

**A partial run is a normal request** — `--stage=before` stands a fixture up to look at,
`--stage=after` tears one down, `--stage=test` re-tests against a fixture already standing.
Whenever a stage is skipped:

1. Say so in the report, next to the result rather than buried after it.
2. List exactly what remains, by name.
3. Give the command that removes it later — `--stage=after`.

The next full run's `given` will fail on those leftovers (§3), which is intended: a flow should
refuse to run against its own residue rather than assert vacuously against it.

## 7. Feed findings back

A flow that was wrong about the app is a finding, not a failure to hide. When a run contradicts
the spec — an output schema that changed, a step that needs coalescing, an operation whose key
moved — update the flow to the verified form and record what changed. The spec is the artifact;
the run is how it earns its accuracy.

## Checklist

```markdown
- [ ] Flow read in full (including every `note`) and approved by the user before running
- [ ] `given` verified, not assumed; the flow's own artifacts confirmed absent; aborted if unmet
- [ ] Every step invoked through the invoker with a spaceId, matching the key exactly
- [ ] Steps threading a live object coalesced into one snippet
- [ ] Each step judged on its effect (db or DOM), never on a return value
- [ ] Per-step pass/fail table reported, failures by QA-n.m (or by step `id` where declared)
- [ ] Stages run in order; any skipped stage stated with what remains
- [ ] `after` run through operations (never `db.remove`)
- [ ] Flow updated where the run contradicted it
```
