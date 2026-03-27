# Design

We are designing the process model for the AI Agent runtime.

## Specification

- Processes are long-lived and can be resumed after a restart.
- Processes can run locally (in the browser) or remotely (in a Cloudflare Durable Object).
- Operations are short-lived functions that are invoked by a process.
- A Feed is an append-only log of messages.
- A Conversation is a process that reads from and writes to a Feed.
  - When a messages is read, it is processed by an LLM/model and the output is written to the Feed.
  - During processing, the Conversation may invoke Tools, which are implemented as Operations.
  - During processing, the Conversation may spawn an new Process (branching the current Conversation);
    - Once the sub-process completes it writes the result into the parent's Conversation.
- A Conversation may create a Plan Artifact that it uses to manage its state through successive Tool requests.
- Triggers define event subscriptions which may initiate a Process.
  - An event might trigger a Process, which runs an operation and then immeditely exist.
  - An event might trigger a Process, which binds a Feed to a Conversation.
- Agents are implemented as a Conversation bound to a Feed, a set of Tools, and some base instructions.

## Example Scenarios

- A user configures an input Feed to give instructions to an Agent, which may spawn sub-agents to manage complex tasks.
- A user configures a Trigger to invoke an Operation to summarize new Email messages.
- A user configures a Trigger to invoke an Operation to do research when a Calendar Event is updated.
- A user configures a Trigger to spawn an Agent to manage a plan for the day at the start of the day.

## Critique

### Strengths

1. **Clean layering.** The Process → Conversation → Feed stack separates lifecycle (Process), intelligence (Conversation), and persistence (Feed) into distinct concerns. This mirrors the existing `AiSession` / `AiConversation` / `Queue` split in the codebase and provides a clear path to formalize it.

2. **Uniform execution model.** Framing both Agents and Triggers as Process variants avoids a separate execution model for reactive vs. interactive workflows. A Trigger that fires-and-forgets is just a Process that runs one Operation and exits.

3. **Sub-process spawning.** Allowing Conversations to branch into child Processes gives a natural model for delegation (e.g., research sub-agent) and maps well to the existing `parentMessage` tracking in the execution graph.

4. **Location transparency.** Specifying that Processes can run locally or in a Durable Object is the right call — it keeps the model portable and lets deployment topology be an operational concern.

### Gaps and Ambiguities

#### Process Lifecycle

5. **No explicit state machine.** The spec says Processes are "long-lived" and "can be resumed" but doesn't define states (e.g., `idle`, `running`, `suspended`, `completed`, `failed`). Without this, it's unclear what "resumed" means — is it replaying the Feed from a checkpoint, or restoring in-memory state? The current `AiSession` has `_started`/`_ended` and a semaphore but no formal state model.

6. **Error and retry semantics are missing.** What happens when an Operation fails mid-Process? Is the Process marked failed? Can it retry? The current codebase has `AiAssistantError`/`AiModelError` but no retry policy. The design should specify whether Processes have at-least-once or at-most-once semantics and how failures propagate from child to parent Processes.

7. **Cancellation.** The current `AiConversation.createRequest` returns a cancelable Effect, but the design doesn't mention cancellation. Can a user cancel a running Process? What about a sub-process — does canceling a parent cascade?

#### Feed Semantics

8. **Feed vs. Queue.** The current implementation uses ECHO `Queue<Message | ContextBinding>` as the backing store. The design calls this a "Feed" — an append-only log. Are these the same thing? If so, the design should acknowledge that Feeds also carry non-message entries (context bindings, status events). If not, the relationship between Feed and Queue needs clarification.

9. **Feed ownership and sharing.** Can multiple Processes write to the same Feed? The design says "a Conversation reads from and writes to a Feed" — is there a 1:1 relationship, or can Feeds be shared (e.g., multiple agents collaborating on a shared log)? The example scenario ("a user configures an input Feed to give instructions to an Agent") implies the user and the Agent both write to the same Feed, which creates ordering and conflict concerns.

10. **Feed compaction / summarization.** The current implementation summarizes history when it exceeds 80k tokens. The design doesn't address this. An append-only log will grow unbounded — how does a long-lived Process manage context window limits? This is a practical concern that should be part of the model, not an implementation detail.

#### Sub-processes

11. **Result protocol.** "Once the sub-process completes it writes the result into the parent's Conversation." What is the shape of this result? A single message? A summary of the sub-process's Feed? The current implementation uses `ToolResult` blocks with `parentMessage` references — should this be formalized?

12. **Sub-process isolation.** Does a child Process get its own Feed, or does it share the parent's? If separate, how does the parent observe progress? If shared, how do you avoid interleaving messages from concurrent sub-processes?

13. **Sub-process depth limits.** Can a sub-process spawn its own sub-processes? If so, is there a depth limit? Unbounded recursion is a practical risk.

#### Triggers

14. **Event model is underspecified.** "Triggers define event subscriptions" — subscriptions to what? ECHO mutations? External webhooks? System events (timer, cron)? The design should enumerate the event sources or define an extension point.

15. **Trigger-to-Process binding.** The spec says a Trigger "may initiate a Process." Is the Process created fresh each time the Trigger fires, or can a Trigger resume an existing Process? The daily-plan scenario suggests a fresh Process per day, but other scenarios might want idempotent behavior (e.g., don't spawn a second summarizer if one is already running).

#### Agents

16. **Agent identity.** The design says Agents are "a Conversation bound to a Feed, a set of Tools, and some base instructions." But there's no mention of Agent identity, permissions, or capabilities. In the current codebase, Blueprints serve this role — the design should clarify whether Agents replace Blueprints or compose with them.

17. **Agent configuration.** The current system has `Project`, `Chat`, `ContextBinding`, and Blueprint enablement. Where do these fit in the new model? Is a Project a Process? Is a Chat a Feed? The mapping should be explicit to avoid two parallel abstractions.

#### Operations

18. **Operation vs. Tool.** The spec says "Tools are implemented as Operations" and "Triggers invoke Operations." Are Operations and Tools the same thing viewed from different perspectives? Or is an Operation a broader concept that includes non-tool work? The current codebase has `ToolDefinition` (from Blueprints) and separate `Operation` definitions in `@dxos/functions` — the design should clarify the relationship.

### Naming Suggestions

19. **"Feed" conflicts with existing DXOS terminology.** In HALO/ECHO, "feed" already refers to Hypercore feeds. Using the same term for this concept may cause confusion. Consider: `MessageLog`, `ConversationLog`, or just `Queue` (which is what the implementation uses).

20. **Typo:** "immeditely exist" → "immediately exit" (line 18).

### Recommendations for Phase 2

1. Define the Process state machine explicitly (states, transitions, persistence points).
2. Specify the Feed/Queue data model — what entry types are allowed, ordering guarantees, compaction strategy.
3. Define the sub-process protocol — Feed isolation, result shape, depth limits, cancellation propagation.
4. Enumerate Trigger event sources and define the binding/lifecycle semantics.
5. Map the new model onto existing types (`AiSession` → ?, `AiConversation` → ?, `Blueprint` → ?, `Queue` → Feed?).
6. Address error handling, retry, and idempotency at the Process level.

## Phase 1

- [x] Critique the design above.
