# Manual Testing Plan

Everything built across Phases 0-5 is verified by build, lint and unit tests only. These are the steps
that convert that into "seen working".

**Status: run on 2026-08-14** against a live Composer (`localhost:5173`) holding a real Gmail-synced
mailbox, driven through the agent debug port rather than by hand. Folder sizes are quoted below only
where a verdict turns on them; addresses and display names are redacted. Per-step verdicts are inline below; the run's findings and what it says about automating
this are in [Results](#results-2026-08-14) and [Automating this](#automating-this-via-the-debug-port).

**If running by hand, use a warm browser.** An automation browser starts with an empty OPFS, pays a
full ECHO init, and trips the fixed 30s startup budget at `useApp.tsx:236` — see the blocker section in
[`TASKS.md`](TASKS.md). Nothing is wrong with the code; the profile is the variable. The debug-port
route below sidesteps this entirely, because it attaches to a browser that is already warm.

Work them in order: B through E all need the mailbox rendering, which A establishes.

Each step names where to look, what to do, and what should happen.

Setup: storybook against the `@dxos/fixtures` mailbox corpus (391 real messages), served by the
`.storybook/main.mts` vite middleware.

### A. Inbox + Starred navtree folders

- [x] **A1** — Expand a mailbox in the navtree. Expect SEVEN children in this order: Inbox, Starred,
      **Important**, All Mail, Sent, Drafts, Subscriptions. (This said six and omitted Important until
      the 2026-08-14 run; the code has had seven since the folders landed.)
- [x] **A2** — Icons are distinct: Inbox is a tray, Starred a star, Important a bookmark, All Mail a
      stack. No two siblings share an icon.
- [x] **A3** — Click Inbox. Expect only messages carrying the `inbox` tag. NOTE: on a corpus where sync
      never applied `inbox`, this is legitimately EMPTY — check the tag chips on a message before
      calling it a bug.
- [x] **A4** — Click Starred. Expect only starred messages. Star one from the list and confirm it
      appears without a reload (membership is reactive). Assert against the TagIndex's own count, not
      just "looks like a shorter list".
- [x] **A5** — Click the mailbox row itself. It already carried `filter:#inbox`, so it should match the
      Inbox child — Gmail's behaviour, not a duplicate-node bug.

### B. Archive from the conversation menu

- [x] **B1** — Open a message, expand it, open the `⋮` menu. Expect: Reply / Forward / AI reply — divider
      — **Archive, Delete** — divider — extract actions — Open — contributed actions.
- [x] **B2** — Archive and Delete are in the SAME section, with no divider between them.
- [x] **B3** — Click Archive on a message that is in the inbox. Expect the message's `inbox` tag chip to
      disappear.
- [x] **B4** — Reopen the menu on that message. The entry now reads **Move to Inbox** with a tray icon.
- [x] **B5** — Click Move to Inbox. The `inbox` chip returns.
- [ ] **B6** — Archiving from a dedicated MessageArticle plank CLOSES the plank. Restoring does NOT
      close anything.
- [ ] **B7** — Archiving from the conversation inside MailboxArticle should NOT close the mailbox.

### C. Archive from the mailbox tile menu

- [x] **C1** — In the mailbox list, open a tile's `⋮`. Expect Archive above Ignore sender / Create
      Project.
- [ ] **C2** — Label flips to Move to Inbox for an already-archived message, same as B4.
- [ ] **C3** — Archive from the tile while the Inbox folder filter is active: the row should leave the
      list reactively.
- [ ] **C4** — Only the acted-on tile re-renders (membership is a per-message atom family, not a list
      query). Watch for the whole list flashing.

### D. Recipients row

- [x] **D1** — Expand a message with a To header. Expect a row whose first column carries the standard
      person AVATAR for a single recipient (the generic glyph was replaced), or a `ph--users--regular`
      group icon when there are several, aligned with the tags/attachments rows.
- [x] **D2** — The row shows ONLY the address — `someone@example.com`,
      never `"SOME ONE" <someone@example.com>`.
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
- [x] **E5** — The avatar column does not resize as the create button appears.
- [x] **E6** — In the CONVERSATION view, the sender avatar is vertically centred on the sender's NAME,
      not on the whole title block. Check a message whose title wraps to two lines: the avatar must
      stay level with the first line, not drift to the middle. **FAILED as written and is now fixed** —
      the mailbox card was NOT already correct either. The offset comes from the two together:
      `dx-avatar` is `display: contents` and its frame is `inline-flex`, so inside `ContactAvatar`'s
      block wrapper the frame sat on the text baseline and the line box added descender space beneath
      it. Fixed by making that wrapper a grid container in `react-ui-card`. Verified by
      measurement: conversation −8px → 0, tile −3px → 0.

### F. Row story star

- [x] **F1** — `ui/react-ui-card/Row` → Default. Click the star. It toggles filled ↔ outline and the
      label alternates star/unstar. (Verified headlessly on :9013; confirm visually.)

---

## Results (2026-08-14)

Run against the live Composer over the debug port. Of 27 steps, 12 passed outright, 2 failed, 1 was a
stale expectation in this document (A1, since corrected above), and 12 did not yield a verdict —
partial, blocked, not run, unreachable in this mailbox, or inconclusive. See the table.

| Step   | Verdict          | Note                                                                                                                             |
| ------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| A1     | **doc stale**    | SEVEN children, not six — the doc omits **Important**. Order otherwise as written.                                               |
| A2     | pass             | All seven icons distinct (tray / star / bookmark-simple / stack / paper-plane / pencil / envelope).                              |
| A3     | pass             | Every message carrying `inbox` renders in the folder.                                                                            |
| A4     | pass             | Row count matches the TagIndex's `Starred` set exactly.                                                                          |
| A5     | pass             | Mailbox row and Inbox child render an identical list at different URLs.                                                          |
| B1     | partial          | Order correct. "AI reply" absent because `plugin-brain` is disabled — the contribution degrades cleanly.                         |
| B2     | pass             | Archive and Delete adjacent, no divider between them.                                                                            |
| B3-B5  | pass             | Archive → chip gone, count N→N−1; label flips to "Move to Inbox"; restore → N. State left as found.                              |
| B6, B7 | not run          | Plank-closing behaviour.                                                                                                         |
| C1     | **FAIL → fixed** | Archive was missing entirely. `ConversationTile` never destructured `enableArchive`, and every live tile is a conversation tile. |
| C2-C4  | blocked          | By C1. Re-run now that it is fixed.                                                                                              |
| D1, D2 | pass             | Person avatar in the gutter; a `"DISPLAY NAME" <addr>` header renders as the bare address.                                       |
| D3, D4 | unreachable      | No multi-recipient and no missing-`To` message in the sample harvested. `parseAddressList` already unit-tests both shapes.       |
| E1     | unreachable      | The space holds zero `Person` objects, so no contact can resolve.                                                                |
| E2     | inconclusive     | The reveal is CSS `:hover`, which a synthetic event cannot trigger.                                                              |
| E3, E4 | not run          | E3 creates data in the user's space.                                                                                             |
| E5     | pass             | Avatar column stayed 24px wide across the hover.                                                                                 |
| E6     | **FAIL → fixed** | See above.                                                                                                                       |
| F1     | pass             | Verified headlessly earlier.                                                                                                     |

### Defects the plan did not ask about

Three of the five defects found were outside every step above — they surfaced because driving the real
app shows you everything on screen, not just the thing you set out to check:

1. **`@dxos/react-ui`'s translations were never registered**, so `system-button.star.label` and
   `toolbar-menu.label` rendered raw as the accessible name of every icon-only button, app-wide. Every
   sibling namespace (`-card`, `-form`, `-table`, …) is re-exported by some plugin; the base one is not.
2. **A message whose sender has neither name nor address collapsed the date to the row's start** —
   `justify-between` with a conditionally-rendered name leaves one child. One message in the sample.
3. **`FormFieldSetContainer` resolved its styles once at module scope**, pinning the `default` variant,
   so a `settings` form's nested groups lost the gap between sub-fields.

---

## Automating this via the debug port

The 27 steps above were written as a human checklist. Running them through the debug port showed which
of them actually need a human, and the split is sharp.

### What the port does better than a human

- **It reads the model, not the pixels.** the `Starred` row count is only meaningful next to
  the TagIndex's own count of 3. One snippet gets both, so the assertion is "the view matches the data"
  rather than "three rows looked right". Same for B3-B5, where the archive round-trip was asserted on
  the tag index (N → N−1 → N), not on a chip appearing to vanish.
- **It makes state changes safely reversible.** The archive test mutated real mail and put it back in
  the same snippet, with the count proving restoration. A human doing this by hand has no such receipt.
- **It measures.** E6 is a 4-8px offset — precisely the kind of thing eyes disagree about and
  `getBoundingClientRect` does not. Every alignment fix here was accepted only when the delta read 0.
- **It escapes the cold-profile blocker.** The long-standing storybook timeout is an empty-OPFS problem;
  attaching to a browser that is already warm sidesteps it. This is the single biggest unlock — that
  blocker had made every step in this file unrunnable by an agent.

### What still needs a human

- **`:hover`.** E2's create-contact button is revealed by a CSS `:hover` rule, and no synthesized
  pointer event triggers one. Either a real input device or a test-only class is required.
- **"Does it look right".** The port confirms a number; only a person notices that an avatar reads as
  belonging to the wrong line. Both alignment bugs in this run were reported by the user from a
  screenshot and only then measured.
- **Data the corpus lacks.** D3/D4 and E1 failed for want of a multi-recipient message and a `Person`
  object, not for want of tooling.

### The actual conclusion: most of this belongs in unit tests

The steps that automated cleanly are mostly the ones that did not need a browser at all. The folder
list (A1/A2) is a pure function of the graph builder; the menu composition (B1/B2, C1) is a pure
function of props. **C1 — the real bug — is a three-line unit test on `ConversationTile`'s `menuItems`
that no browser is needed for, and it would have caught a defect that shipped.** The port is the right
tool for the layout and the ECHO-integration questions, and the wrong tool for the rest.

Recommended split:

| Concern                             | Where it belongs                                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| Folder set, order, icons (A1/A2)    | Unit test over the app-graph builder's contributed nodes.                                          |
| Menu composition (B1/B2, C1/C2)     | Unit test per tile component over `menuItems` for each flag/tag combo.                             |
| Recipient formatting (D2/D3/D4)     | Already unit-tested (`parseAddressList`); add one render test for the avatar-vs-group-icon branch. |
| Archive/star round-trip (B3-B5)     | Integration test over `SystemTags.toggleTag` + the TagIndex.                                       |
| Alignment (E6), i18n keys resolving | Debug port or a real browser — genuinely needs layout.                                             |
| Hover affordances (E1-E4)           | Playwright, which drives a real pointer.                                                           |

Two cheap, high-value additions that need no new infrastructure:

1. **An i18n completeness check.** Defect 1 is mechanical: walk the rendered DOM (or the resource
   bundles at build time) for text matching `^[a-z-]+(\.[a-z-]+)+$` and fail. It would have caught the
   missing namespace the moment it appeared, and it generalizes to every plugin.
2. **A "no bare `justify-between` with a conditional child" habit** is not lintable, but defect 2 is
   exactly the empty-state case a story is for — a `GroupedWithoutSender` story alongside the existing
   `GroupedWithoutThreads` would have shown it.

### Practical notes for the next run

- **Never reload the tab.** A reload ends the port session, and if the user has stepped away it cannot
  be restarted. Editing a watched source file is enough to trigger HMR — which is useful (fixes appear
  live) but leaves the port slow to answer for a few seconds; raise
  `COMPOSER_RECOVERY_CONNECT_TIMEOUT` to ~90s rather than assuming the session died.
- **Radix menus need real pointer events.** `.click()` does not open them; dispatch
  `pointerdown`/`pointerup` then `click`, and re-check `[role="menu"]` before asserting — the first
  attempt often lands before the trigger is listening.
- **Navtree rows have three buttons.** `querySelector('button')` grabs the caret; the one that
  navigates is `[data-testid="treeItem.heading"]`.
- **`dx-avatar` has no box.** It is `display: contents`; measure the inner `.dx-avatar` span.
- **Message data is reachable off React fibers** when a query would need an Effect runtime: walk up from
  `[data-testid="inbox.conversation.row"]` to the first fiber whose `memoizedProps.messages` is set.
