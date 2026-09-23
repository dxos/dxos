# plugin-labeler — design

## Why

Inbox classification today costs one LLM turn per batch and spends most of its code defending
against the model: a strict structured-output attempt, a lenient fallback, a hand-written JSON
tokenizer to salvage `{...}` spans out of prose, and index-drift normalisation
(`plugin-inbox/src/operations/classify/classify-mailbox.ts`). The categories are also fixed in the
prompt, so a user's own labels play no part.

A decision model (`effect/unstable/ai/DecisionModel`) removes both problems. The questions are a
`Decision` definition, so there is nothing to parse and nothing to salvage; and a `classify` takes its
labels at call time, so the user's own tags are the vocabulary.

## What it asks

One call per message, three questions answered independently:

- `probability` — does this ask the recipient for a reply, a decision, or an action?
- `classify` — which of the space's user tags fits? Criteria are the tag labels the user wrote, plus
  `none`: a classification needs two labels, and without an out a one-tag space would file every
  message under it.
- `rate` — how soon does this need dealing with, on `Routine / Timely / Urgent`?

The state is the sender, the subject and a snippet — never the full body.

## Decisions

**The user's tags are the vocabulary.** `Tag.isUserTag` filters out canonical and provider tags:
those are owned by sync or by DXOS, and offering them as choices would let the model fight the
provider. With no user tags the label question is simply not asked, and the other two still run.

**Confidence is the auto-apply gate.** Each answer carries the model's confidence, so the plugin can
decline: below the threshold nothing is written. This is the property that makes it safe to run over
a whole inbox unattended, and it is what a text model cannot give you.

**Two plugin-owned tags, not free-form ones.** `Needs reply` and `Urgent` are found-or-created under
this plugin's foreign-key source, so a second run reuses them instead of duplicating.

**Idempotent by tag membership, not a cursor.** A message already carrying any tag this run could
apply is skipped. That makes a re-run cheap without the plugin owning a watermark, and it means a
user who removes a label gets it reconsidered on the next run — which is the behaviour someone who
just corrected the model expects.

**Writes tags, nothing else.** No summaries, no message mutation: the mailbox's tag index is the
only thing touched, so a wrong answer is one click to undo.

## Contributions

| Capability                           | What                                           |
| ------------------------------------ | ---------------------------------------------- |
| `InboxCapabilities.MailboxAction`    | "Label messages" in the mailbox toolbar menu.  |
| `InboxCapabilities.MailboxProcessor` | `label` pass in the cascade, after `contacts`. |
| `Capabilities.OperationHandler`      | `LabelMailbox`.                                |

## Not in scope

No UI of its own — the tags render in plugin-inbox, which already draws them. No settings surface
yet: the thresholds are operation input, so a caller can override them before there is a screen for
it.
