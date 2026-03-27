# Design

We are designing the process model for the AI Agent runtime.

DXOS is a decentralized, local-first architecture for building collaborative applications where data is stored and processed on user devices,
synchronized peer-to-peer, and structured as a shared graph of objects with conflict-free merging.
It emphasizes offline capability, data ownership, and composability, with optional coordination layers rather than centralized backends.

## Design Goals

- **Clean layering.**
  The Process → Conversation → Feed stack separates lifecycle (Process), intelligence (Conversation), and persistence (Feed) into distinct concerns.
  This mirrors the existing `AiSession` / `AiConversation` / `Queue` split in the codebase and provides a clear path to formalize it.
- **Uniform execution model.**
  Framing both Agents and Triggers as Process variants avoids a separate execution model for reactive vs. interactive workflows.
  A Trigger that fires-and-forgets is just a Process that runs one Operation and exits.
- **Sub-process spawning.**
  Allowing Conversations to branch into child Processes gives a natural model for delegation (e.g., research sub-agent) and maps well to the existing `parentMessage` tracking in the execution graph.
- **Location transparency.**
  Specifying that Processes can run locally or in a Durable Object is the right call — it keeps the model portable and lets deployment topology be an operational concern.

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
  - An event might trigger a Process, which runs an operation and then immediately exist.
  - An event might trigger a Process, which binds a Feed to a Conversation.
- Agents are implemented as a Conversation bound to a Feed, a set of Tools, and some base instructions.

## Example Scenarios

- A user configures an input Feed to give instructions to an Agent, which may spawn sub-agents to manage complex tasks.
- A user configures a Trigger to invoke an Operation to summarize new Email messages.
- A user configures a Trigger to invoke an Operation to do research when a Calendar Event is updated.
- A user configures a Trigger to spawn an Agent to manage a plan for the day at the start of the day.

## Issues

- Error/retry
- Lifecycle (incl. cancellation)
- Credentials/permissions (escalation requests)
- Planning artifacts
- Rollback/idempotency
- Feed compaction/summarization
- Multi-user
- Subfeeds/Document threads
- Limits (e.g., sub-process depth)

## Phase 1

- [ ] Critique the design above.
- [ ] Outline thoughts on issues.

### Recommendations for Phase 2

- Define the Process state machine explicitly (states, transitions, persistence points).
- Specify the Feed/Queue data model — what entry types are allowed, ordering guarantees, compaction strategy.
- Define the sub-process protocol — Feed isolation, result shape, depth limits, cancellation propagation.
- Enumerate Trigger event sources and define the binding/lifecycle semantics.
