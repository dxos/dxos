# plugin-inbox — manual test plan

Everything built across Phases 0-5 is verified by build, lint and unit tests only. These are the steps
that convert that into "seen working". None have been run, with one exception noted in F.

**Run these in a warm browser** against the storybook on :9009. An automation browser starts with an
empty OPFS, pays a full ECHO init, and trips the fixed 30s startup budget at `useApp.tsx:236` — see
the blocker section in [`TASKS.md`](TASKS.md). Nothing is wrong with the code; the profile is the
variable.

Work them in order: B through E all need the mailbox rendering, which A establishes.

Each step names where to look, what to do, and what should happen.

Setup: storybook against the `@dxos/fixtures` mailbox corpus (391 real messages), served by the
`.storybook/main.mts` vite middleware.

### A. Inbox + Starred navtree folders

- [ ] **A1** — Expand a mailbox in the navtree. Expect SIX children in this order: Inbox, Starred, All
      Mail, Sent, Drafts, Subscriptions.
- [ ] **A2** — Icons are distinct: Inbox is a tray, Starred a star, All Mail a stack. No two siblings
      share an icon.
- [ ] **A3** — Click Inbox. Expect only messages carrying the `inbox` tag. NOTE: on a corpus where sync
      never applied `inbox`, this is legitimately EMPTY — check the tag chips on a message before
      calling it a bug.
- [ ] **A4** — Click Starred. Expect only starred messages. Star one from the list and confirm it
      appears without a reload (membership is reactive).
- [ ] **A5** — Click the mailbox row itself. It already carried `filter:#inbox`, so it should match the
      Inbox child — Gmail's behaviour, not a duplicate-node bug.

### B. Archive from the conversation menu

- [ ] **B1** — Open a message, expand it, open the `⋮` menu. Expect: Reply / Forward / AI reply — divider
      — **Archive, Delete** — divider — extract actions — Open — contributed actions.
- [ ] **B2** — Archive and Delete are in the SAME section, with no divider between them.
- [ ] **B3** — Click Archive on a message that is in the inbox. Expect the message's `inbox` tag chip to
      disappear.
- [ ] **B4** — Reopen the menu on that message. The entry now reads **Move to Inbox** with a tray icon.
- [ ] **B5** — Click Move to Inbox. The `inbox` chip returns.
- [ ] **B6** — Archiving from a dedicated MessageArticle plank CLOSES the plank. Restoring does NOT
      close anything.
- [ ] **B7** — Archiving from the conversation inside MailboxArticle should NOT close the mailbox.

### C. Archive from the mailbox tile menu

- [ ] **C1** — In the mailbox list, open a tile's `⋮`. Expect Archive above Ignore sender / Create
      Project.
- [ ] **C2** — Label flips to Move to Inbox for an already-archived message, same as B4.
- [ ] **C3** — Archive from the tile while the Inbox folder filter is active: the row should leave the
      list reactively.
- [ ] **C4** — Only the acted-on tile re-renders (membership is a per-message atom family, not a list
      query). Watch for the whole list flashing.

### D. Recipients row

- [ ] **D1** — Expand a message with a To header. Expect a row whose first column carries the standard
      person AVATAR for a single recipient (the generic glyph was replaced), or a `ph--users--regular`
      group icon when there are several, aligned with the tags/attachments rows.
- [ ] **D2** — The row shows ONLY the address — `rich@braneframe.com`, never `"RICHARD S. BURDON"
<rich@braneframe.com>`.
- [ ] **D3** — A multi-recipient header renders each address comma-separated.
- [ ] **D4** — A message with no To header renders NO row (not an empty one).

### E. Conversation avatar contact affordance

- [ ] **E1** — Hover a sender avatar where the space HAS a Person. After ~400ms that contact's card
      opens.
- [ ] **E2** — Hover a sender with NO Person. The avatar gives way to a create-contact button; the card
      never opens and hovering writes nothing.
- [ ] **E3** — Click that button. A Person is created and the avatar reverts to the resolved state.
- [ ] **E4** — Move between two avatars quickly. No stale card opens for the avatar you left (the
      `useCardHover` cleanup — the case with no regression test yet).
- [ ] **E5** — The avatar column does not resize as the create button appears.

### F. Row story star

- [ ] **F1** — `ui/react-ui-card/Row` → Default. Click the star. It toggles filled ↔ outline and the
      label alternates star/unstar. (Verified headlessly on :9013; confirm visually.)

---
