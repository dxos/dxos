# Customer support demo

Status: approved. Rich accepted the first option of every item in [Decisions](#decisions) on
2026-11-26. The work is the registered project `support-demo`.

## Summary

Developers send messages about Cloudflare Workers. The system records who they are and what they
said, answers what it can from documents it already holds, and gives the rest to people.

- **A draft** is written when a question can be answered from a canonical document in the ECHO graph.
  The draft quotes the passage it relies on and links the document.
- **A task** is created for every request, and for every question that has no such passage.

The demo is one Storybook story of six columns: messages, the pipeline's progress on each message,
facts, CRM objects, draft responses and tasks. It joins pieces that already exist: `@dxos/pipeline`
stages, `@dxos/extractor-lib` identity matching, `@dxos/echo-memory` facts in the space's RDF store,
the `Message`, `Person`, `Organization`, `Task` and `TaskSet` types, and the `storybook-testing`
module layout.

## Data model

![Data model: a mailbox feeds messages; a message names its sender, a person employed by an organization; a draft replies to a message and cites a document; a task is created from a message; facts are statements, questions and requests read from a message.](diagrams/customer-support-data-model.dx.svg)

<details>
<summary>Diagram source</summary>

```diagram
diagram flow=down
group inbox "Inbox (feed)" {
  node Mailbox "Mailbox" ref="packages/plugins/plugin-inbox/src/types/Mailbox.ts"
  node Message "Message" ref="packages/sdk/types/src/types/Message.ts"
  node Draft "Draft (Message)" ref="packages/sdk/types/src/types/DraftMessage.ts"
}
group echo "ECHO graph (CRM)" {
  node Person "Person" ref="packages/sdk/types/src/types/Person.ts"
  node Organization "Organization" ref="packages/sdk/types/src/types/Organization.ts"
  node Document "Document" ref="packages/plugins/plugin-markdown/src/types/Markdown.ts"
  node TaskSet "TaskSet" ref="packages/sdk/types/src/types/TaskSet.ts"
  node Task "Task" ref="packages/sdk/types/src/types/Task.ts"
}
group rdf "RDF graph (memory)" {
  node Fact "Fact" ref="packages/core/echo/echo-memory/src/Fact.ts"
  node Statement "Statement"
  node Question "Question"
  node Request "Request"
}
edge Mailbox one-to-many Message "feed"
edge Message -> Person "sender"
edge Organization one-to-many Person "employs"
edge Draft -> Message "replies to"
edge Draft -> Document "cites"
edge TaskSet one-to-many Task "tasks"
edge Task -> Message "created from"
edge Fact -> Message "source"
edge Statement extends Fact
edge Question extends Fact
edge Request extends Fact
```

</details>

### Types that exist

Nothing here is new; the demo stores its data in the types the app already uses.

| Concept       | Type                                         | Where it is stored                                      |
| ------------- | -------------------------------------------- | ------------------------------------------------------- |
| Inbox         | `Mailbox` (`@dxos/plugin-inbox/Mailbox`)     | Space; owns a feed                                      |
| Message       | `Message.Message` (`@dxos/types`)            | The mailbox's feed, appended with `Feed.append`         |
| Person        | `Person.Person` (`@dxos/types`)              | Space                                                   |
| Organization  | `Organization.Organization` (`@dxos/types`)  | Space; `Person.organization` refers to it               |
| Document      | `Markdown.Document` (`@dxos/plugin-markdown`) | Space; every document in the space is canonical         |
| Draft         | `DraftMessage` (a `Message` with `properties.mailbox`) | Space; `parentMessage` is the message it answers |
| Task          | `Task.Task` in a `TaskSet.TaskSet` named "Support" | Space                                             |
| Fact          | `Fact.Fact` (`@dxos/echo-memory`)            | The space's memory (RDF), through `FactStoreRegistry`   |

### Fact kinds

A fact's kind is read from its `illocution`; nothing is added to `Fact.Fact`.

```ts
export const FactKind = Schema.Literals(['statement', 'question', 'request']);
export type FactKind = Schema.Schema.Type<typeof FactKind>;

/** Absent or assertive is a statement; a directive is a question when interrogative, else a request. */
export const kindOf = (fact: Fact.Fact): FactKind =>
  fact.illocution?.force !== 'directive'
    ? 'statement'
    : fact.illocution.mood === 'interrogative'
      ? 'question'
      : 'request';
```

| Kind      | `illocution`                                    | Example                                                           |
| --------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| Statement | absent, or `force: 'assertive'`                 | Lumen Labs `is migrating to` Durable Objects                      |
| Question  | `force: 'directive'`, `mood: 'interrogative'`   | Ada `asks` "What is the CPU time limit on the paid plan?"         |
| Request   | `force: 'directive'`, `mood: 'imperative'`      | Ben `requests` "Raise our account's Worker limit to 2,000"        |

Every fact's `attribution.source` is the message's URI and `attribution.agent` is the sender's
`mailto:` IRI, so a fact, its message and its person can be joined in SPARQL.

### Types the demo adds

These live in the stories package. All are Effect Schema, because they are the payloads of the
processor contracts.

```ts
/** One section of a canonical document. */
export const Passage = Schema.Struct({
  document: Schema.String, // The document's DXN.
  title: Schema.String,
  heading: Schema.String,
  text: Schema.String,
});

/** A passage offered as support for a question, with how well it covers the question. */
export const Evidence = Schema.Struct({
  passage: Passage,
  topics: Schema.Array(Schema.String), // The question's topics the document is about.
  coverage: Schema.Number, // 0..1; see the confidence rule.
});

/** What a draft cites. */
export const Citation = Schema.Struct({
  document: Schema.String,
  title: Schema.String,
  heading: Schema.String,
  quote: Schema.String,
});

export const TaskReason = Schema.Literals(['request', 'no-evidence', 'low-confidence', 'research-failed']);

/** The outcome for one question or request. A draft always carries at least one citation. */
export const Decision = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal('draft'),
    confidence: Schema.Number,
    citations: Schema.NonEmptyArray(Citation),
  }),
  Schema.Struct({
    kind: Schema.Literal('task'),
    confidence: Schema.Number,
    reason: TaskReason,
  }),
]);

export const StageId = Schema.Literals(['ingest', 'entities', 'facts', 'research', 'respond', 'triage']);
/** The same four values as `StatusListStatus` in `@dxos/react-ui-list`. */
export const StageStatus = Schema.Literals(['not-started', 'working', 'success', 'failed']);

/** One message's progress, held in memory and drawn as a card in the pipeline column. */
export const MessageRun = Schema.Struct({
  message: Schema.String, // The message id.
  title: Schema.String,
  stages: Schema.Array(Schema.Struct({ id: StageId, status: StageStatus, detail: Schema.optional(Schema.String) })),
});
```

A draft's citations are stored as a `Cites` relation from the draft to the document, carrying the
quote and heading (decision 5). The draft's body also ends with a "Source" line linking the document,
so the citation is visible wherever the draft is read.

## Pipeline

A `@dxos/pipeline` stream: one envelope per message, six `Stage.map` stages run in order with
`concurrency: 1`, so facts and objects written for one message are visible to the next. The stream is
run with `Pipeline.run`.

| #   | Stage      | Reads                                   | Writes                                                                | Provided by           |
| --- | ---------- | --------------------------------------- | --------------------------------------------------------------------- | --------------------- |
| 1   | `ingest`   | The message from the mailbox feed       | The envelope (text, subject, sender address)                          | The pipeline          |
| 2   | `entities` | The envelope; people and organizations in the space | `Person` and `Organization`, created or matched; the envelope's sender | Entities plugin |
| 3   | `facts`    | The message text; the sender            | Statement, question and request facts in the space's memory           | The pipeline          |
| 4   | `research` | The topics of each question; canonical documents | Evidence per question on the envelope; a `mentions` fact per topic | Research plugin    |
| 5   | `respond`  | Each question and its evidence          | A draft with its `Cites` relations, or a decision to make a task      | Responder plugin      |
| 6   | `triage`   | Each request; each question without a draft | A `Task` in the "Support" task set, linked to the message         | The pipeline          |

A stage that fails marks its row failed and the message continues: when `research` fails, `respond`
is skipped and stays not started, and `triage` makes a task with the reason `research-failed`. No
failure stops the stream.

## Plugins and their contracts

Three plugins each offer one processor. A processor is a contract in the shape the plugin services
design uses (`Service.make` on dxos/dxos#14693): a key, a version, and methods with payload and
success schemas. The pipeline holds only the contract; the plugin that implements it is found at run
time.

```ts
/** Matches a message's sender against the people and organizations in the space, creating what is missing. */
export const EntityExtractor = {
  key: 'org.dxos.stories.support.entityExtractor',
  version: '0.1.0',
  methods: {
    extract: {
      payload: Schema.Struct({ message: Schema.String }),
      success: Schema.Struct({
        person: Schema.optional(Schema.String),
        organization: Schema.optional(Schema.String),
        created: Schema.Array(Schema.String), // DXNs of objects made by this call.
        matched: Schema.Array(Schema.String), // DXNs of objects that already existed.
      }),
    },
  },
};

/** Returns what the space's canonical documents say about the topics a question mentions. */
export const Researcher = {
  key: 'org.dxos.stories.support.researcher',
  version: '0.1.0',
  methods: {
    research: {
      payload: Schema.Struct({ question: Schema.String }),
      success: Schema.Struct({ topics: Schema.Array(Schema.String), evidence: Schema.Array(Evidence) }),
    },
  },
};

/** Decides whether a question can be answered from its evidence, and writes the draft when it can. */
export const Responder = {
  key: 'org.dxos.stories.support.responder',
  version: '0.1.0',
  methods: {
    respond: {
      payload: Schema.Struct({ message: Schema.String, question: Schema.String, evidence: Schema.Array(Evidence) }),
      success: Schema.Struct({ decision: Decision, draft: Schema.optional(Schema.String) }),
    },
  },
};
```

| Plugin    | Contract          | Reuses                                                                                     |
| --------- | ----------------- | ------------------------------------------------------------------------------------------ |
| Entities  | `EntityExtractor` | `extractContact`, `personIdentitySpec`, `organizationIdentitySpec` (`@dxos/extractor-lib`) |
| Research  | `Researcher`      | `Markdown.Document` content; a topic list of Workers product names                         |
| Responder | `Responder`       | `DraftMessage.make`; the confidence rule below                                             |

How a plugin offers its processor is decision 1. The recommendation is a multi capability today
(the mechanism `InboxCapabilities.MailboxProcessor` already uses), with each contract written in
the plugin services shape, so moving to `Service.make` is a change of registration and not of
interface.

## Confidence rule

The rule is one pure function, `decide(question, evidence, options)`, with no I/O. It is what the
unit tests cover.

Definitions:

- **Terms.** `terms(text)` lowercases the text, splits on non-alphanumerics, drops stop words, and
  strips a plural `s`.
- **Topics.** A fixed list of Workers product names and their aliases ("Durable Objects" / "DO",
  "KV", "Cron Triggers", "R2", "D1", "Queues", "Hyperdrive", "Logpush", "Wrangler", …). A text's
  topics are the entries whose name or alias occurs in it.
- **Passage.** One heading of a canonical document with the text under it.
- **Canonical document.** A `Markdown.Document` in the space.
- **Coverage.** `|terms(question) ∩ terms(passage)| / |terms(question)|`.

Rule:

1. A request is never answerable. It becomes a task with the reason `request`, whatever the
   documents say.
2. Evidence for a question is every passage whose document shares at least one topic with the
   question. A question with no topic, or with no such passage, becomes a task with the reason
   `no-evidence`.
3. The question's confidence is the highest coverage among its evidence.
4. Confidence at or above the threshold (default `0.5`) gives a draft. It cites the highest-coverage
   passage: the document, the heading, and the passage text as the quote. Below the threshold the
   question becomes a task with the reason `low-confidence`.
5. A draft with no citation cannot be built: `Decision`'s draft member requires a non-empty
   `citations`.

"Answerable from the ECHO graph" therefore means: some passage of a document in the space is about
the question's topic and covers at least half of the question's terms. A message with a question and
a request produces both a draft and a task.

## Message generators

Each generator is one external person. It is an Effect fiber that appends its next scripted message
to the mailbox feed, on a schedule in the running story and on demand (`step`) in tests. Messages
are emitted in the fixed order of the corpus.

| Actor       | Address                    | Organization                        | Already in the space                     |
| ----------- | -------------------------- | ----------------------------------- | ---------------------------------------- |
| Ada Okafor  | `ada@lumenlabs.example`    | Lumen Labs                          | The person and the organization          |
| Ben Ruiz    | `ben@lumenlabs.example`    | Lumen Labs                          | The organization only                    |
| Chen Wei    | `chen@northwind.example`   | Northwind                           | Neither                                  |
| Dara Singh  | `dara@quantahealth.example` | Quantahealth                       | Neither                                  |
| Eli Novak   | `eli.novak@gmail.com`      | None (a free-mail address)          | Neither                                  |

The three cases of entity matching are all present: a person who is matched, a person who is created
and joined to an organization that is matched, and a person and organization that are both created.

### Canonical documents

Five documents, seeded into the space, each a few headed sections. Their content is taken from the
Cloudflare documentation as of 2026-11.

| Document                 | Sections                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| Workers platform limits  | CPU time (10 ms free; 30 s default and up to 5 min paid); memory (128 MB); subrequests (50 free; 10,000 default and up to 10 million paid) |
| Workers KV               | Consistency (eventual; a write can take up to 60 s to show elsewhere); limits (25 MiB value; one write a second per key) |
| Durable Objects          | Alarms (at least once; retried with backoff from 2 s, up to 6 times); storage (10 GB per object on the paid plan) |
| Cron Triggers            | Schedule (UTC); configuration (`triggers.crons`); local testing (`wrangler dev --test-scheduled`)  |
| Secrets                  | Adding a secret (`wrangler secret put`); local development (`.dev.vars`)                           |

### Seed corpus

| #   | From | Message                                                                                             | Outcome                                    |
| --- | ---- | --------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | Ada  | What is the CPU time limit for a Worker on the paid plan?                                           | Draft, citing Workers platform limits      |
| 2   | Chen | Why did our deploy fail at 14:02 yesterday with error 10021?                                        | Task: `no-evidence`                        |
| 3   | Ben  | Are Durable Object alarms guaranteed to run, and are they retried if the handler throws?            | Draft, citing Durable Objects              |
| 4   | Ben  | Please raise our account's Worker limit to 2,000.                                                   | Task: `request`                            |
| 5   | Chen | How long does a KV write take to be visible in other regions?                                       | Draft, citing Workers KV                   |
| 6   | Dara | Does Hyperdrive pool MySQL connections to an Aurora cluster?                                        | Task: `no-evidence`                        |
| 7   | Dara | Do Cron Triggers run in UTC or in local time?                                                       | Draft, citing Cron Triggers                |
| 8   | Ada  | We are moving our session store to Durable Objects. What is the storage limit per object? Please add Ben to our support plan. | Statement fact; draft; task: `request` |
| 9   | Eli  | What is the largest value I can store in KV?                                                        | Draft, citing Workers KV                   |
| 10  | Dara | Can you enable Logpush for our zone and send us your SOC 2 report?                                  | Task: `request`                            |
| 11  | Ada  | How many subrequests can a Worker make in one request?                                              | Draft, citing Workers platform limits      |
| 12  | Eli  | How do I test a Cron Trigger locally? (research is made to fail for this message)                   | `research` failed; task: `research-failed` |

Six questions are answerable, two are not, three messages carry requests, and one shows a failed
stage. Each corpus entry states its expected outcome, and a unit test checks every entry against
`decide`.

## The story

`stories/stories-support/Support`, in a new private package `@dxos/stories-support`
(`packages/stories/stories-support`). The layout is one `ModuleContainer.Root` of six columns, each
a module surface contributed by `ModuleSurfacesPlugin`, as in `stories-brain` and the plugin
services spike.

| Column    | Lists                                                    | Row                                                                    |
| --------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| Messages  | The mailbox feed, newest first                           | Sender and organization; the message's first line                      |
| Pipeline  | One card per message, newest first                       | A `StatusList` of the six stages                                       |
| Facts     | The facts in the space's memory                          | Subject, predicate, object; a tag for statement, question or request   |
| Objects   | People, organizations and documents in the space         | The object's label; a tag for its type                                 |
| Drafts    | Draft messages for the mailbox                           | "Re:" and the subject; the answer's first line and its source document |
| Tasks     | The "Support" task set                                   | The task's title; the reason and who asked                             |

Every list is `Listbox` rows from `@dxos/react-ui-list`. The Messages column's toolbar starts and
pauses the generators, appends one message (`Step`) and resets the space.

**Progress in the pipeline column.** A message's card appears with all six rows not started as soon
as the message is appended. The row of the stage being run is working; a finished stage is success
or failed. The card is the `StatusList` from `@dxos/react-ui-list` (dxos/dxos#14703), drawn from the in-memory `MessageRun`
(decision 6). In the running story each stage waits a short time so the working row can be seen; in
tests the wait is zero.

Stories:

- `Default`: the seeded space, generators paused. Start them, or step, to watch messages arrive.
- `Flow`: a play story. It steps message 1 and message 2 and asserts that message 1 ends with a
  draft that names "Workers platform limits" and message 2 ends with a task, and that both cards
  show their stages finished.

## What is real and what is mocked

| Part                          | In the story                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| Space, feed, ECHO types       | Real: a client and space from `StoryHarness`                                                   |
| Pipeline                      | Real: `@dxos/pipeline` `Stage.map` and `Pipeline.run`                                          |
| Entity matching               | Real: `extractContact` and the identity specs, against the people and organizations in the space |
| Fact store                    | Real: the space's memory, through plugin-brain's `FactStoreRegistry`                           |
| Fact extraction               | Mocked: a recorded extraction per corpus message; a sentence rule (`?` is a question, "please" or "can you" a request) for any other text. The real stage is `extractFactsStage` in `@dxos/pipeline-rdf`, which calls a model |
| Research                      | Mocked: term overlap against the documents in the space. No web search, no model               |
| Responder                     | Mocked: the confidence rule and a template that quotes the passage. No model                   |

Nothing in the story calls a model or the network, so it needs no credentials (decision 3).

Determinism:

- The corpus order, each message's timestamp and each fact's id (a hash of the message id and the
  fact's index) are fixed. Nothing reads the clock or a random source.
- The play story advances with `Step`, never a timer, and waits on rows by test id.
- The confidence rule and the corpus's expected outcomes are unit tests that need no browser.

## Decisions

Rich accepted the first option of each on 2026-11-26.

1. **How a plugin offers its processor.**
   1. A multi capability now, with each contract written in the plugin services shape. dxos/dxos#14693
      is not merged and its `Service` module is inside a stories package, so it cannot be imported.
   2. Stack this work on dxos/dxos#14693 and provide the processors with `Service.make` and
      `ServiceHost`.
   3. A plain capability with a TypeScript interface and no schemas.
2. **Register this as a project** (`/dxos:project new support-demo`).
   1. Yes: the demo will grow over several sessions.
   2. No.
3. **Models and search.**
   1. Deterministic processors now; a provider that calls a model is added later behind the same
      contracts.
   2. Use the real `extractFactsStage` and a model-written reply now, with memoized fixtures. This
      needs a live model run to record them.
4. **The inbox.**
   1. A `Mailbox` and its feed, as plugin-inbox stores mail, so the real mailbox views and the brain
      pipeline can be put on the same data later.
   2. Plain `Message` objects in the space.
5. **Where a draft's citations are stored.**
   1. A `Cites` relation from the draft to the document, defined in the stories package.
   2. A `citations` entry in the draft's `properties`.
6. **The pipeline card.**
   1. `StatusList` over in-memory run state. Stage runs are not work items and do not belong among
      the tasks.
   2. `TaskProgress` over a persisted `Task` per stage, in a task set of its own.

Defaults taken without asking: the package name `@dxos/stories-support`; the confidence threshold
`0.5`; every document in the space is canonical; a request always becomes a task.
