---
'@dxos/plugin-inbox': minor
'@dxos/react-ui': minor
'@dxos/react-ui-card': patch
---

Inbox surface: virtual folders, archive, and sender enrichment.

**Inbox and Starred folders** join All Mail / Sent / Drafts / Subscriptions as mailbox child nodes, reusing the existing `properties.filter` + `systemTag` path — no new query machinery.

**Archive** is available from both the conversation menu and the mailbox tile menu, grouped with Delete since both take a message out of the reading flow. Archiving from a dedicated message view closes the plank; restoring does not.

Archive is modelled as the `inbox` system tag coming **off**, never a separate `archived` tag: Gmail models INBOX as a label and JMAP as a mailbox role, both already mapped by the providers, so one toggle serves both directions and no filter-complement operator is needed. Note that tag changes are not yet pushed back to the provider, so **a Gmail sync will restore an archived message** — pushing them is tracked separately.

**Conversation menu** gains "Create Project" (the `CreateProjectFromMessage` operation previously had no UI) and sender enrichment. The latter arrives through a new `InboxCapabilities.SenderAction` capability rather than a direct import, because plugin-crm already depends on plugin-inbox; `createInvocations` returns a list so a contributor can express a composite (research, then image) without fusing it into one operation.

**Pipeline actions are hidden until a connection is configured** — previously Enrich was offered on a mailbox with nothing to enrich.

**`RecordArticle` gains a toolbar** sourced from the subject's own app-graph node, so any plugin can contribute type-specific actions to it; plugin-crm contributes Enrich for `Person` and `Organization`. `Card.Action` gains a `leading` slot so a row standing for a person can show their avatar instead of a generic glyph.

**Removed:** `InboxOperation.ProcessMailbox` and its routine template. Its cursor helpers were shared with `ClassifyMailbox` and survive at `operations/cursor.ts` with a now-required consumer id; `ResetProcessCursor` becomes the generic `ResetFeedCursor`, also with a required `cursorId`. `CrmOperation.ProcessMailbox` is unrelated and unaffected.
