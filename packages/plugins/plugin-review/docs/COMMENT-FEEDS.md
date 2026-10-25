# Comment threads on feeds

Status: PROPOSED. Stage 1 is agreed; stages 2 and 3 are direction, not yet designed in detail.

## Problem

The comment agent only understands Markdown. A comment on a diagram gets the reply "my tools only
let me edit the markdown document", because plugin-review runs its own one-shot LLM call
(`src/capabilities/agent-runner.ts`) with a Markdown prompt, two text-edit tools, and no context
for any other subject type. It also imports `@dxos/plugin-markdown`, which `PLUGIN.mdl` F-7.1
forbids.

The assistant already does everything the comment agent needs: it binds a subject to a `Chat`, pulls
in that type's skills through `SubjectContext`, and runs turns through `AgentService`. The two
should share one conversation model instead of keeping two.

## Common denominator

Review and chat share the **feed of `Message`s**, not the `Chat`. Each conversation container is a
thin object that owns (or points at) a feed and adds only what its role needs.

| Container           | Adds to the feed                                      | Owner of the AI turn                                    |
| ------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| `Thread` (comments) | subject anchor (`AnchoredTo`), `status`, `agent` mode | plugin-assistant, via `CommentCapabilities.AgentRunner` |
| `Channel`           | `backend` (local feed, email, Bluesky, …)             | plugin-agent relays                                     |
| `Chat`              | `session` (model), `instructions`, `tasks`, `remote`  | `AgentService`                                          |

`Thread` and `Chat` stay separate types: merging them would put model and task fields on every
comment, and anchors on every chat.

## Types

![Comment thread and chat types](diagrams/comment-feeds.dx.svg)

- **Subject** — any ECHO object that can be commented on (`AppCapabilities.CommentConfig`).
- **AnchoredTo** — relation from a `Thread` to its subject, with an optional cursor range.
- **Thread** — owns its `Feed` (replaces `messages: Ref<Message>[]`); owns a hidden `Chat` when the
  agent is on.
- **Feed / Message** — the shared store; one feed per thread in stage 1.
- **Chat** — the hidden per-thread chat; points at the thread's feed without owning it, and is bound
  to the subject.
- **SubjectContext** — the assistant's per-type contributions that bind skills (the drawing skill for
  a diagram, the Markdown skill for a document).
- **AgentRunner** — capability defined by plugin-review, implemented by plugin-assistant; review
  never imports the assistant.
- **Review Settings** — `commentAgentMode` (`off` | `auto` | `mention`, default `mention`) decides
  which threads get the agent and when it answers.
- **Root feed** (stage 2, dashed) — one per subject; thread and chat feeds become its branches.

## Stage 1 — threads on feeds, assistant runs the turns

1. **`Thread` 0.3.0 owns a `Feed`.**
   - `messages` is replaced by `feed: Ref<Feed>` with `SetParent`, so deleting a thread deletes its
     feed.
   - The feed is created when a staged thread is first persisted.
   - An ECHO migration from 0.2.0 creates the feed and appends the existing messages in order.
2. **Operations write to the feed.**
   - `AddMessage` calls `Feed.append`.
   - `DeleteMessage` marks the message deleted rather than calling `Feed.remove`. A re-append for
     undo would take a new position (`Feed.append` assigns one from the position authority, with no
     way to re-insert), so a removed message would come back at the end.
   - `RestoreMessage` clears the mark.
3. **Readers query the feed.** `CommentsArticle`, `comment-sync`, `react-ui-thread`, plugin-sheet's
   `thread-ranges` and the debug snapshot switch from `thread.messages` to a reactive feed query,
   hiding deleted messages.
4. **`Chat.feed` may be unowned.** Ownership (`SetParent`) becomes optional so a chat can run on a
   feed another object owns. Assistant chats still own theirs.
5. **plugin-assistant contributes the comment runner.**
   - For a thread with the agent on, it creates the hidden `Chat` (parented to the thread, marked so
     chat lists skip it), points it at the thread's feed and binds the subject with
     `BindChatContext`.
   - Each turn runs through `RunPromptInChat`, and the reply lands in the thread's feed.
   - plugin-review keeps the trigger decision (`shouldTriggerAgent`) and deletes its own runner and
     its Markdown imports.
6. **The comment UI shows the final reply.** Tool calls and permission requests land in the feed;
   the comment UI hides them in stage 1.

## Stage 2 — one root feed per subject

Each subject gets a root feed it owns. Comment-thread feeds and companion-chat feeds become branches
under it, so "ask the assistant about this" can fork a branch from any message. Item-level forks
already exist inside a feed (`Feed.PARENT_KEY`, `Feed.history`); this stage adds the object-level
structure and a merged view across branches.

## Stage 3 — channels on the same model

plugin-agent's relay mirrors a channel thread into a `Chat` and copies messages
(`AgentChannels.conversationOf`). With unowned chat feeds it can run turns on the channel's feed
directly.

## Open items

1. How a message is marked deleted: a field on `Message`, or an appended retraction item, depending
   on whether feed items can be updated in place.
2. Whether the Markdown skill can replace an anchored range; today's `editAnchoredRange` tool has no
   equivalent there.
3. What marks a hidden chat so chat lists and search skip it (a `Feed.kind`, a `viewType`, or a meta
   key).
4. Cost of one feed and one agent session per thread in a busy document.
