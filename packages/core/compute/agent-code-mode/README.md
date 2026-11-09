# @dxos/agent-code-mode

Code mode for agent turns. The model carries one tool, `eval`, and does its work by writing a
program against the workspace instead of calling one tool per action. Only what the program prints
comes back to it.

## Where it runs

- **Composer**: the default turn engine for chats and agents; `Settings.disableCodeMode` turns it
  off (plugin-assistant `F-5.4`, `F-5.5`, decision `D-18`). The app supplies the engine: the Effect
  dialect, with the code in a Web Worker on its own ECHO client (`composer-app/src/plugin-defs.tsx`).
  Without the chunk or a client it falls back to tool calling, never to running code in the page.
- **`dx eval`**: runs one program in either dialect. `dx eval --instructions` prints what an agent
  is told, with the profile's types and operations.
- **`assistant-evals`**: `code-mode.eval.ts` runs the same tasks with tool calling and both dialects.

## One turn

[`makeCodeModeTurnProducer`](./src/producer.ts) stands in for the tool-calling producer of an agent
process; the process's queue, alarms and hydration are unchanged. Before every model call it:

1. Re-reads the conversation's skills (one enabled mid-request shows up here) and connects their MCP
   servers.
2. Turns their tools into the operation list (`projectOperations`): each operation's name,
   description and input schema, the `Operation` definition behind it (none for an MCP tool), and a
   function that runs it through the same handlers as a tool call.
3. Builds the system prompt: the dialect's instructions (its API, the registered types, the
   operations), then the skills' own instructions and the conversation's objects, as tool calling
   does. In discovery mode it states the API and one skill, Discovery, instead (see below).
4. Calls the model. A text answer ends the request; an `eval` call runs in the sandbox and the loop
   repeats, up to `maxTurns`.

## The `eval` tool

- **Input** is `code`; the **result** is what the code printed, cut at 8,000 characters
  (`maxOutput`).
- **A throw** fails the call with what was printed before it and a short error (long serialized
  values cut, a hint for common mistakes), so the model reads it and writes different code.
- **`print(obj)`** shows an object as a card: type, id, label and fields, references as
  `→ type id "label"`. A card can also count the object's relations, children and referrers, with
  the code that fetches each (`print` in the Effect dialect, `describe` in the plain one).
- **In the chat**, each `eval` call is labelled after the operations its code names, and its result
  records which operations ran (`ToolResult.invocations`: keys and failures, not outputs).
  `ensureReplySent` reads that record to see a reply sent from code. The model never sees it.

## Dialects

### Plain ([`dialect-plain.ts`](./src/dialect-plain.ts))

The body of an async function, over a small facade: `query`, `make`, `add`, `update`, `remove`,
`ref`, `flush`, `relations`, `children`, `referrers`, `describe`, `print`. Every operation and MCP
tool is a function on `ops`: `await ops['name'](input)`. The prompt gives each input as the JSON
schema tool calling validates. Every binding takes and returns plain data, which is what lets a
sandbox with no database run it.

### Effect ([`dialect-effect.ts`](./src/dialect-effect.ts))

The body of an `Effect.gen`, written against the real modules: `Database`, `Filter`, `Query`, `Obj`,
`Ref`, `Relation`, `Type`, `Operation` and `Effect`, plus `print`. An operation is resolved by its key
and invoked as any DXOS code does:

```js
const Score = yield* Database.resolve('dxn:com.example.operation.score');
const score = yield* Operation.invoke(Score, { title: 'Write the docs' });
```

MCP tools are `yield* Tools['name'](input)`. Inputs are given in TypeScript-like form, such as
`{ task: Ref<com.example.type.task> }`. The longer reference is a `DOCS` object the code reads on
demand ([`src/docs`](./src/docs)), including the generated `catalog/types.md` and
`catalog/operations.md`. Composer and `dx eval` use this dialect.

## Sandboxes

| Sandbox                                 | Where the code runs                                                                                     | Contained?                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `Sandbox.inProcess` (the default)       | The host's own thread.                                                                                  | No. A timeout abandons the code, which keeps running.                            |
| `WorkerSandbox`, `WorkerSandboxBrowser` | A Node worker thread or a Web Worker, on its own ECHO client; operations run back on the host.          | Bounded, not contained: a timeout kills the worker, which has the host's rights. |
| `WorkerdSandbox`                        | A Cloudflare Worker Loader isolate, reaching only the host; plain dialect, every call made on the host. | Yes: the only security boundary here.                                            |

## What the model is told

Two modes, chosen by `discovery` on `makeCodeModeTurnProducer`. In both, the model can call the
operations of the conversation's enabled skills and nothing else: `ops` and `Database.resolve` know
only those, and a skill enabled mid-request adds its operations on the next model call.

### Listed (the default)

- **Types**: every registered type and its fields. A union of more than four tagged variants is
  shortened to its tags, with a note to print an existing value to see a variant's fields.
- **Operations**: every operation of the enabled skills, in full, before every model call.
- **Skills**: each enabled skill's instructions; with the skill manager bound, a list of every skill
  in the registry.

So the prompt grows with every enabled skill and every registered type.

### Discovery (`discovery: true`)

The prompt states one skill, Discovery ([`discovery.ts`](./src/discovery.ts)), with its three
operations: no other skill's instructions, no other operation, no types. The model looks the rest up
from code:

| Operation         | Listing                                                                                   | Lookup                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `loadSkill`       | No key: the skills it can use, enabled here or enableable by an agent (`agentCanEnable`). | `key`: the skill's instructions and operations. A skill not yet enabled is enabled by loading it.   |
| `queryOperations` | `query` searches those skills' operations by what they do; `skill` narrows to one.        | `keys`: each operation's input and the code that calls it, in the dialect's form.                   |
| `queryTypes`      | `query` searches the registered types.                                                    | `typenames`: their fields.                                                                          |

- A skill that is neither enabled nor enableable never shows up, and nor do its operations.
- The prompt no longer grows with skills or types. The cost is a lookup call at the start of a
  request.
- The turn answers these operations itself, from what it already holds, so no host registers a
  handler for them; `serveLocally` routes the Effect dialect's `Operation.invoke` to them.
- It is the shape `@dxos/mcp-server` already gives MCP clients (`queryOperations`, `loadSkill`).

## Code map

| File                                                   | Holds                                                                              |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `producer.ts`                                          | The turn loop and `projectOperations`.                                             |
| `eval-tool.ts`                                         | The `eval` tool: running code, the output cap, error text, call labels, recording. |
| `Dialect.ts`, `dialect-plain.ts`, `dialect-effect.ts`  | Each dialect's bindings and prompt.                                                |
| `fields.ts`, `describe.ts`, `format.ts`                | The types section, object cards, printing.                                         |
| `discovery.ts`                                         | The Discovery skill and its operations.                                            |
| `Sandbox.ts`, `WorkerSandbox*.ts`, `WorkerdSandbox.ts` | Where code runs.                                                                   |
| `docs/`                                                | The Effect dialect's `DOCS`.                                                       |

## Tests

`code-mode.test.ts` drives real agent turns from recorded model responses under `.store/`:
`DX_RUN_MODEL_FIXTURE_TESTS=1` replays them, and `DX_UPDATE_MODEL_FIXTURES=1` with
`DX_ANTHROPIC_API_KEY` re-records a whole file. `discovery.test.ts` and `producer.test.ts` drive
turns with a scripted model, and the other tests need no model.
