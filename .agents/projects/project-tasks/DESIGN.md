# Project Tasks — Design

Agent delegation and task management over the two-forms task model: markdown
checklists are the fluid form, `Task`/`TaskSet` the durable form, and promotion
links them — delegation IS promotion (a delegated unit of work becomes a durable
agent `Task` parented to the project's `TaskSet`; the supervisor reconciles
children and checks off the checklist line on completion).

## Findings

### Anthropic tool-schema validation (2026-08-25)

The Anthropic API rejects tool `input_schema`s containing an empty `{}` or
typeless subschema ("Empty schema that accepts any JSON value is not
supported" / "Schema type is missing"). Two layers conspired to produce one:

1. `routineOutputSchema` returned `Schema.Any` for a routine with undeclared
   output (`Instructions.make` defaults `output` to `Schema.Void`), and
   `Schema.Any` serializes to `{}`. Every delegated sub-agent takes this path —
   the delegation strategy synthesizes Instructions with no output — so every
   live delegation died at the sub-agent's first model call.
2. Replacing `Any` with a concrete union was not sufficient: a *static*
   `Tool.make` is serialized through the provider's structured-output
   transformer (`toCodecAnthropic`), which rewrites `Record` and
   `ObjectKeyword` members into "[key, value] pairs" encodings whose value
   member is again a typeless `{description: 'JSON value'}` node.

Resolution: `completeJob` is a `Tool.dynamic` — a dynamic tool's JSON schema
reaches the provider verbatim (`Tool.getJsonSchema` returns it before any
transformer runs), and the handler decodes the unvalidated input against the
same untransformed schema. This is the same contract `projectFunctionToTool`
already keeps for operation tools, and for the same reason (its comment
documents the advertised-vs-validated divergence).

Testing note: a `'{}'` substring check on the serialized schema is too weak —
the transformer's typeless nodes carry annotations. The regression test walks
every node and requires one of `type | anyOf | oneOf | enum | const | $ref`.

### Failure fold-back

`onComplete` posted `Cause.pretty(exit.cause)` — including stack traces — as an
assistant message. The conversation now gets `Cause.prettyErrors(...).message`
joined; the full pretty cause stays in `log.warn`. AI-service failures arrive
as defects (`Layer.orDie`), so the message extraction must handle defects, which
`prettyErrors` does.

### Storybook coverage map (2026-08-25)

- Delegation demos: `Chat.stories.tsx` `WithSubAgents` (live), `WithSubAgentsTest1`
  (live play, out of CI), `WithSubAgentsTest2` (scripted, in CI, asserts the
  checklist promotion loop); `TaskList` `WithDelegatedAgent`; `TracePanel`
  `WithSubAgentFixture` (captured live trace).
- TaskSet demos: `TaskSetArticle` `Default`/`Behavior`; `ProjectArticle`
  `Default`/`Sections`/`Updates`.
- Gap: no story renders the durable TaskSet beside a delegating chat; the
  delegation stories assert against the markdown checklist (Outline) only.

## Open questions

1. Should the joined story live in stories-assistant (chat + TaskSetArticle
   surface) or plugin-projects (ProjectArticle with a live chat)?
2. Promote-task verb shape — a `TaskOperation` the agent can call outside
   delegation, or extend `DelegateTask` with an assignee-less mode?
