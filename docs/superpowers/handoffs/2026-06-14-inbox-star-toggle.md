# Handoff: shared star toggle button (inbox events + messages)

Date: 2026-06-14
Worktree: `/Users/burdon/Code/dxos/dxos/.claude/worktrees/wizardly-lehmann-7712e4`
Branch: `claude/wizardly-lehmann-7712e4` (PR #11820 — the ViewState work; CI green)

## Goal

Add an interactive **star toggle** to the first column of inbox event rows, replacing the
static checkmark, show it in the EventStack tile too, and factor the button into one shared
component used by both the event and message components.

Original request (verbatim):

> - move the location of the star to the first column of the event
> - replaces the current checkmark
> - show in the eventstack tile also
> - factor out common toggle button with Message/MessageStack

## Current state (verified)

- There is **no star anywhere in `plugin-inbox`** today. The "current checkmark" is the static
  leading icon `ph--check--regular` in the event heading row.
- Neither `Event` (`@dxos/types` `Event.Event`) nor `Message` (`Mailbox`/`Message`) has a
  `flagged`/`starred` field. `Message` has a `MessageState` enum (NONE/ARCHIVED/DELETED/SPAM)
  and a tag/label index; events have no flag concept.
- A reusable `ToggleIconButton` already exists and is the right primitive to build on:
  `packages/ui/react-ui/src/components/Button/ToggleIconButton.tsx` — props `{ active, icon,
activeIcon, ...IconButtonProps }`. Use `icon='ph--star--regular'`, `activeIcon='ph--star--fill'`,
  `iconOnly`, `square`, `variant='ghost'`, and a `label` (Star/Unstar).

## Files to touch

- `packages/plugins/plugin-inbox/src/components/Event/EventDetails.tsx`
  - Heading mode (line ~58–62): replace `<Card.Row icon='ph--check--regular'>` so the first
    column renders the shared star toggle instead of the static check icon.
  - Text mode (line ~63–67, used by the EventStack tile): currently has **no** icon — add the
    star toggle as the row's `icon` so the tile shows it in column 1 too.
- `packages/plugins/plugin-inbox/src/components/EventStack/EventStack.tsx`
  - `EventTile` (line ~103–124) renders `<EventDetails event={event} title='text' .../>`. The
    text-mode change above gives it the star automatically; verify it appears and is clickable
    without stealing the tile's current/select click (stop propagation on the toggle).
- `packages/plugins/plugin-inbox/src/components/MessageStack/MessageStack.tsx`
  - `MessageTile` (line ~248–310) / `MessageStackTile` (line ~209–236): place the same shared
    star toggle in the leading position. Today column 1 is a `DxAvatar` in `Card.IconBlock`;
    decide whether the star replaces or sits alongside the avatar (see open question 2).
- New shared component (suggested): a small `StarToggle` in
  `packages/plugins/plugin-inbox/src/components/` (e.g. `Star/StarToggle.tsx`) wrapping
  `ToggleIconButton`, taking `{ active, onToggle, label? }`. Export via the component barrel.
  Both `Card.Row icon={...}` and `Card.IconBlock` accept a JSX element, so the same component
  drops into events and messages.

## Card layout notes

- `Card.Row` (non-fullWidth) is a 3-col subgrid: **column 1 = `icon`** (string → `Card.Icon`,
  or any JSX), columns 2–3 = children. Passing the star toggle as the `icon` prop puts it in
  the first column — exactly where the checkmark is now.
- `Card.IconBlock` is the message-tile leading slot in `Card.Header`.

## Open questions to resolve BEFORE coding (these block the data model)

1. **What does the star persist?** (same for events and messages) — pick one:
   - (a) a `flagged`/`starred` boolean added to the object (schema change; cross-device via ECHO),
   - (b) a reserved tag/label using the inbox's existing tag mechanism (messages already tagged;
     events have no tag index — would need one),
   - (c) a **device-local `ViewState` slice** (`starred`, `local` backend, keyed by object id) —
     no schema change, consistent with PR #11820's mechanism, but device-specific.
     The user was asked this and dismissed the question — re-confirm before implementing.
2. **Message tile leading slot:** does the star **replace** the avatar in column 1, or sit next
   to it (avatar stays as identity, star added as a trailing/leading action)? The request says
   "replaces the current checkmark" for events; the message side wasn't specified.
3. **Click semantics:** the toggle must `event.stopPropagation()` so starring doesn't also
   trigger the row's current/select handlers (`setCurrentId`/`setSelected`).

## Acceptance criteria

- One shared toggle component built on `ToggleIconButton`, used by the event header, the
  EventStack tile, `MessageTile`, and `MessageStack`.
- Event first column shows the star (filled when active) in place of `ph--check--regular`.
- Star persists per the decision in open question 1 and survives the relevant scope (reload /
  device / cross-device).
- `moon run plugin-inbox:build` + `:lint` green; story coverage in `Event.stories.tsx` /
  `MessageStack.stories.tsx` updated to show the toggle; translations added for the Star/Unstar
  labels.

## Run/verify

- moon needs proto on PATH: `export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH"`.
- Build: `moon run plugin-inbox:build`; lint: `moon run plugin-inbox:lint -- --fix`; storybook
  test: `moon run plugin-inbox:test-storybook`.
- A storybook server may already run on :9009 — never kill it; reuse or use another `--port`.
