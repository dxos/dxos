# @dxos/agent-code-mode

Code mode for agent turns. The model carries one tool, `eval`, and does its work by writing a
program against the workspace instead of calling one tool per action. Only what the program prints
comes back to it.

## Where it runs

- **Composer**: the default turn engine for chats and agents; `Settings.disableCodeMode` turns it
  off (plugin-assistant `F-5.4`, `F-5.5`, decision `D-18`). The app supplies the engine: the Effect
  dialect, with the code in a Web Worker on its own ECHO client (`composer-app/src/plugin-defs.tsx`).
  Without the chunk or a client it falls back to tool calling, never to running code in the page.
- **`dx eval`**: runs one program in either dialect. `dx eval --instructions` prints the API
  reference with the profile's types and operations listed, which an agent looks up through the
  Skill Manager instead.
- **`assistant-evals`**: `code-mode.eval.ts` runs the same tasks with tool calling and both dialects.

## One turn

[`makeCodeModeTurnProducer`](./src/producer.ts) stands in for the tool-calling producer of an agent
process; the process's queue, alarms and hydration are unchanged. Before every model call it:

1. Re-reads the conversation's skills (one enabled mid-request shows up here) and connects their MCP
   servers.
2. Turns their tools into the operation list (`projectOperations`): each operation's name,
   description and input schema, the `Operation` definition behind it (none for an MCP tool), and a
   function that runs it through the same handlers as a tool call. The Skill Manager's operations
   join them.
3. Builds the system prompt: the dialect's API, the Skill Manager with its operations, the
   conversation's MCP tools, and its objects and instructions. No other skill, operation or type is
   listed.
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
tool is a function on `ops`: `await ops['name'](input)`, by the `tool` name `queryOperations`
gives. Every binding takes and returns plain data, which is what lets a sandbox with no database run
it.

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

## What the model is told: the Skill Manager

Code mode always states one skill, the Skill Manager (`@dxos/assistant-toolkit`'s
`SkillManagerSkill.makeForCodeMode()`), and its operations, and nothing else that is available: no
other skill's instructions, no other operation, no types. Listing every skill, operation and type,
each operation as a tool, is what tool calling does, which runs when code mode is off
(`Settings.disableCodeMode`); there the same skill lists every skill in its instructions.

The model looks the rest up from code:

| Operation         | Listing                                                                                   | Lookup                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `querySkills`     | Every skill, saying whether it is enabled here and whether an agent may enable it.        | `keys`: the skill's instructions and its operations.                       |
| `queryOperations` | `query` searches the operations of the skills it can use by what they do; `skill` narrows. | `keys`: each operation's input, refs as `Ref<typename>`.                   |
| `queryTypes`      | `query` searches the registered types.                                                    | `typenames`: their fields.                                                 |
| `enableSkills`    |                                                                                           | Enables skills an agent may enable; their operations from the next call.  |

- The model can call the Skill Manager's operations, the enabled skills' operations and the
  conversation's MCP tools, and nothing else: `ops` and `Database.resolve` know only those.
- The conversation's MCP tools are stated in the prompt, since no skill names them.
- These are ordinary operations answered by the host's handlers, the same ones tool calling uses,
  so every host that runs code mode must register the Skill Manager's handlers.
- The prompt does not grow with skills or types. The cost is a lookup call at the start of a
  request.
- A type's union of more than four tagged variants is shortened to its tags, with a note to print
  an existing value to see a variant's fields. The type and input labels come from
  `@dxos/assistant/Describe`, which the Skill Manager's lookups share.

## Code map

| File                                                   | Holds                                                                              |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `producer.ts`                                          | The turn loop and `projectOperations`.                                             |
| `eval-tool.ts`                                         | The `eval` tool: running code, the output cap, error text, call labels, recording. |
| `Dialect.ts`, `dialect-plain.ts`, `dialect-effect.ts`  | Each dialect's bindings and prompt.                                                |
| `describe.ts`, `format.ts`                             | Object cards and printing.                                                         |
| `Sandbox.ts`, `WorkerSandbox*.ts`, `WorkerdSandbox.ts` | Where code runs.                                                                   |
| `docs/`                                                | The Effect dialect's `DOCS`.                                                       |

## Tests

`code-mode.test.ts` drives real agent turns from recorded model responses under `.store/`:
`DX_RUN_MODEL_FIXTURE_TESTS=1` replays them, and `DX_UPDATE_MODEL_FIXTURES=1` with
`DX_ANTHROPIC_API_KEY` re-records a whole file. `producer.test.ts` and `describe.test.ts` drive turns
with a scripted model, and the other tests need no model. The Skill Manager's lookups are
tested in `@dxos/assistant-toolkit` (`skill-manager/lookup.test.ts`).
