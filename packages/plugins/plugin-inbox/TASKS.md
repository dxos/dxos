# plugin-inbox — Tasks

## Mailbox reply & triage

Reply drafting plus signals to decide which messages are worth replying to.
`Message.properties` is an open `Record(String, Any)`, so per-message signals
can be recorded there without a schema change. The Gmail sync mapper
(`operations/google/gmail/mapper.ts`) has the raw headers at map time.

### Tasks

- [ ] **Operation to unsubscribe**
  - A DXOS Operation that unsubscribes from a message's list using the
    `List-Unsubscribe` header (mailto: or one-click HTTPS POST per RFC 8058,
    honoring `List-Unsubscribe-Post`).
  - Reads the signal recorded on `properties.listUnsubscribe` (see detection
    task); surfaced as a message action.
  - Network action → confirm before sending (see safety rules).
- [ ] **Auto/bulk detection → gate draft creation**
  - [x] Sync mapper detects a no-reply sender and reads the `List-Unsubscribe`
        header, recording `properties.noReply` / `properties.listUnsubscribe`
        (`Mailbox.isNoReplyAddress`, `mapper.ts`).
  - [x] Shared `Mailbox.isReplyable(message)` helper (false when no-reply or
        unsubscribe present; falls back to sender address for older fixtures).
  - [x] Wire `isReplyable` into the draft flow — harness `pipelines/draft.ts`
        skips non-replyable mail (no LLM call, `skipped: true`); 21/110 fixture
        messages skip via the sender-address fallback. Product draft flow TBD.
- [ ] **User-editable Instructions inform reply drafting**
  - [x] Reuse the existing `@dxos/compute` `Instructions` type (`text` markdown +
        `skills` + `objects`) — did not define a new one.
  - [x] Added optional `instructions: Ref(Instructions)` to the `Mailbox` schema
        (select a shared Instructions or create per-mailbox, via the Form picker).
  - [x] Draft prototype threads an `instructions` string (`pipelines/draft.ts`
        `DraftOptions`, `DRAFT_INSTRUCTIONS` env) into the prompt.
  - [ ] Reply generator reads `mailbox.instructions?.target` and merges its
        `text` + `skills` into the session/system prompt (skills resolved to their
        tool/prompt contributions, as Routines do). Needs the product reply flow.

### References

- Draft-reply benchmark + illocution (speech-act) classification: `packages/stories/stories-brain` (`pipelines/draft.ts`, `pipelines/questions.ts`).
- Sync stats + body-part coverage: `operations/google/gmail/sync.ts`.

## Refactoring

See [`AUDIT.md`](AUDIT.md) for the full decomposition plan (mail stays as plugin-inbox;
calendar + contacts move out; provider + apis split; shared card-focused `@dxos/react-ui-card`).

- [x] Rename `GooglePeople` => `GoogleContacts` (namespace/dir alias only; internal `Person` /
      `batchGetPeople` kept — they mirror Google's real People API). Aligns with `contacts/` ops +
      `GOOGLE_CONTACTS_CONNECTOR_ID`.
- [x] Rename the two Stack forms to match the conceptual model (`src/components/AUDIT.md`):
      `MessageStack` => `InboxStack`, `MessageThread` (API in the `ConversationStack/` dir) =>
      `ConversationStack`. Both are Stack forms with different (Card vs ad-hoc) grid Tiles.
- [x] Move `useInjectedMailboxActions` + `useMailboxExtractorActions` from
      `components/Mailbox/` to `hooks/` (they're capability-fed hooks, not components).
- [ ] Unify the avatar: one shared `Avatar` primitive (actor/name → single hue derivation),
      route all four summary sites through it (3 currently hand-roll `DxAvatar`). **No
      `MessageSummary` composite** — the four layouts are deliberately distinct
      (`src/components/AUDIT.md`).
- [ ] Extract `@dxos/react-ui-card` — the shared low-level card vocabulary (`Row`, `CardTile`,
      `Avatar`). Blockers: `Row` couples to `#hooks` (`useActorContact`), `#meta` (i18n),
      `../../util` (`hashString`) — relocate those into the package. Reuse react-ui's
      `Card.Menu` / `Avatar` / `SystemIconButton.Star` and react-ui-menu; don't re-extract.
- [ ] Different form layout for `EditMessage` (`components/EditMessage/`).
