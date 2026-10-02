# Next cut-over — verification ledger

Visual and behavioural bugs found while verifying the cut-over (branch `claude/react-ui-next-design-4db6eb`, which
now contains the cut-over). The user reports bugs in batches; each gets an entry here, its screenshot under
`temp/verification/` (gitignored, local), and a way to reproduce it ourselves before it is closed.

**Spec:** `main` / preview.composer.space is the reference look and behaviour; a difference is a bug unless a
decision in AUDIT.md says otherwise.

**How to reproduce:**

- **Storybook** (http://localhost:9009): the story id, and a play-function assertion when the fix lands.
- **App** (http://localhost:5173, served from this worktree): the in-app Browser pane cannot run Composer's
  SharedWorker, so app checks run headless — `node <scratchpad>/app.mjs <out-dir> <steps…>` (steps:
  `goto:/path`, `click:<selector>`, `hover:<selector>`, `wait:<ms>`, `shot:<name>`, `eval:<js>`, `dark`) — and
  compare the screenshot with the reported one and with main.

**Status:** `open` (recorded) → `repro` (reproduced ourselves) → `fixed` (commit) → `verified` (user confirmed).

## Ledger

Grouped by screen or component; IDs are global and never reused.

### Shell: navtree, menus

| ID   | Bug                                                           | Screenshot                     | Repro                                           | Status | Fix        |
| ---- | ------------------------------------------------------------- | ------------------------------ | ----------------------------------------------- | ------ | ---------- |
| V002 | Navtree not compact like main (caret cell, indent, icon)      | `V002-navtree-properties.webp` | app home; Tree story `Test` geometry            | fixed  | 54c81f0ad1 |
| V003 | Disclosure (caret) button must always be half a block wide    | —                              | Tree story `Test` asserts half-block caret cell | fixed  | 54c81f0ad1 |
| V005 | Navtree item menu clipped under the sidebar                   | `V005-navmenu-clipped.png`     | app: navtree item ⋮                             | fixed  | 953fc36cf5 |
| V006 | L0 (hamburger) menu does not appear                           | `V006-l0-menu.png`             | app: `click:button >> nth=0`                    | fixed  | 953fc36cf5 |
| V007 | Plank heading sigil menu crashed (`Menu.Item` without `item`) | —                              | app: click the README heading icon              | fixed  | 55f9a378a2 |

### Plugin registry

| ID   | Bug                                                               | Screenshot                                          | Repro                                        | Status | Fix        |
| ---- | ----------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------- | ------ | ---------- |
| V001 | Registry rendered the pilot list rows instead of main's card grid | `V001-registry-now.webp`, `V001-registry-main.webp` | app `goto:/w/dxos:registry/category/bundled` | fixed  | a27e1dbe04 |

### Object properties / panels

| ID   | Bug                                                                                          | Screenshot                     | Repro                                                        | Status | Fix        |
| ---- | -------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------ | ------ | ---------- |
| V004 | Properties companion shows the red `asChild` slot warning; panel gutter should default `sm`  | `V002-navtree-properties.webp` | app `/w/<space>/object/<id>/companion/settings`; Panel story | fixed  | d78065078c |
| V014 | Other document panels main gives `dx-document` should cap their width too (48 sites on main) | `V009-settings.webp`           | per site                                                     | open   |            |

### Settings

| ID   | Bug                                                                       | Screenshot           | Repro                                                                 | Status             | Fix        |
| ---- | ------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------- | ------------------ | ---------- |
| V009 | Settings content should be `dx-document` width with auto margins          | `V009-settings.webp` | app `goto:/w/dxos:settings/plugin/settings:org.dxos.plugin.assistant` | fixed (unverified) | b56bdb5450 |
| V010 | Settings fonts too small (main: lg title)                                 | `V009-settings.webp` | same                                                                  | fixed (unverified) | b56bdb5450 |
| V011 | Gap between settings rows / description and control should be much larger | `V009-settings.webp` | same                                                                  | fixed (unverified) | b56bdb5450 |
| V012 | Switch sits mid-row instead of at the end of the control track            | `V009-settings.webp` | same                                                                  | fixed (unverified) | b56bdb5450 |
| V013 | "Chat view" Select shows the field description instead of the value       | `V009-settings.webp` | same                                                                  | open               |            |

### Editor

| ID   | Bug                                             | Screenshot            | Repro                           | Status | Fix        |
| ---- | ----------------------------------------------- | --------------------- | ------------------------------- | ------ | ---------- |
| V008 | Slash menu: space to the right of the scrollbar | `V008-slash-menu.png` | app: README, new line, type `/` | fixed  | 29ab5b104f |

### Dialogs (all)

| ID   | Bug                                                                               | Screenshot                          | Repro                                                                                          | Status | Fix |
| ---- | --------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------- | ------ | --- |
| V022 | Footer (action bar) needs more padding below it, roughly equal to the side gutter | `V022-create-repository-dialog.png` | app: Create Repository dialog; Next Dialog story geometry (footer bottom inset == side gutter) | open   |     |
| V023 | Esc must cancel (close) dialogs                                                   | `V022-create-repository-dialog.png` | Next Dialog story play: open, press Escape, assert closed; app: any dialog                     | open   |     |

### Create Object dialog

| ID   | Bug                                                                                                                                                                                  | Screenshot                      | Repro                                                                   | Status | Fix |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ----------------------------------------------------------------------- | ------ | --- |
| V018 | Dialog needs contrast from the background (surface hue and/or shadow)                                                                                                                | `V018-create-object-dialog.png` | app: navtree `+` → Create Object                                        | open   |     |
| V019 | Type list scrollbar is not at the right edge of the right gutter; it should land there naturally (no special case), so column/gutter inheritance into the dialog body is not working | `V018-create-object-dialog.png` | app: Create Object; measure thumb vs dialog edge; Dialog story geometry | open   |     |
| V020 | "Open plugin registry" should be in the dialog actions row (Dialog.Footer), with more padding below it                                                                               | `V018-create-object-dialog.png` | app: Create Object                                                      | open   |     |
| V021 | Arrow-key navigation through the type list: scrolling stalls at first; it should scroll as soon as the current item reaches the top/bottom edge                                      | —                               | app: Create Object, hold ↓ past the visible rows; Listbox story play    | open   |     |

### Stories and tests

| ID   | Bug                                                                                                         | Screenshot | Repro                     | Status | Fix |
| ---- | ----------------------------------------------------------------------------------------------------------- | ---------- | ------------------------- | ------ | --- |
| V015 | Drop `rail` from react-ui stories that wrap plain content (gutter follow-up)                                | —          | story geometry tests      | open   |     |
| V016 | Card `TileGrid` story: footer 33px from the card bottom                                                     | —          | storybook Card `TileGrid` | open   |     |
| V017 | Next Menu `Test` submenu position depends on viewport; ActionToolbar `EmbeddedMenu` expects `aria-haspopup` | —          | storybook                 | open   |     |
