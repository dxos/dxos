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
3. `cleanup:` is part of the flow. If you skip it, say so.

## 1. Get a running app with the port open

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

## 2. Establish `given`

Every precondition, before step 1. If one cannot be met, **abort and say which** — a flow run
against unmet preconditions reports failures that belong to the fixture, not the application.

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

## 3. Run the steps

**Always invoke through the operation invoker with an explicit `spaceId`.** Do not branch on the
op's `requires:` — an operation's declaration cannot see what services its downstream calls need,
so `requires:` predicts nothing reliably. One helper, used for every step:

```js
const invokeOp = async (keySuffix, input, space) => {
  const mgr = composer.manager;
  const sets = mgr.capabilities.getAll({ identifier: 'org.dxos.app-framework.capability.operationHandler' });
  let def;
  for (const set of sets) {
    const found = set.definitions().find((d) => String(d.meta.key).endsWith(keySuffix));
    if (found) {
      def = found;
      break;
    }
  }
  if (!def) {
    throw new Error(`operation not found: ${keySuffix}`);
  }
  const invoker = mgr.capabilities.get({ identifier: 'org.dxos.app-framework.capability.operationInvoker' });
  const { data, error } = await invoker.invokePromise(def, input, { spaceId: space.id });
  if (error) {
    throw new Error(String(error));
  }
  return data;
};
```

**Coalesce adjacent steps that thread a live object.** The port serializes between snippets, so an
ECHO object captured in one step cannot reach the next as a proxy. When a step's `capture:` feeds
the following step's `invoke:`, run both in one snippet. Step granularity belongs to the human;
batching is yours.

**Judge the effect, not the return value.** A successful invocation routinely did less than the
step intended — a `create` operation is a factory and places nothing. Evaluate `assert:` if the
step has one; otherwise judge `expect:` from a database query or the DOM. `space.db.query(…).run()`
resolves to an array, not `{ objects }`.

**Opening an object** needs a navigation path, and you must build it — `space.addObject` returns
`{ id, object }` and no `subject`:

```js
const path = `root/${space.id}/content/collections/${object.id}`;
await composer.invoke('org.dxos.plugin.layout.operation.open', { subject: [path] });
```

For a view-holding object the last-but-one segment is the view's target type rather than
`collections`; read it off an existing navtree entry rather than guessing.

## 4. Report

A table, one row per step, most useful column last:

```
QA-1  Create, place, open and edit a document          4/4 pass
  1  Create the document              pass
  2  Place it in the collection       pass    (coalesced with 1)
  3  Open it                          pass
  4  Fix the typo                     FAIL    expected "There is a typo.", DOM still has "tyop"
```

Report a failure by flow and step number (`QA-1.4`) with the observed value next to the expected
one. Never report a step as passing because the invocation returned without throwing.

## 5. Feed findings back

A flow that was wrong about the app is a finding, not a failure to hide. When a run contradicts
the spec — an output schema that changed, a step that needs coalescing, an operation whose key
moved — update the flow to the verified form and record what changed. The spec is the artifact;
the run is how it earns its accuracy.

## Checklist

```markdown
- [ ] Flow named and approved by the user before running
- [ ] `given` verified, not assumed; aborted if unmet
- [ ] Every step invoked through the invoker with a spaceId
- [ ] Steps threading a live object coalesced into one snippet
- [ ] Each step judged on its effect (db or DOM), never on a return value
- [ ] Per-step pass/fail table reported, failures by QA-n.m
- [ ] `cleanup` run, or its omission stated
- [ ] Flow updated where the run contradicted it
```
