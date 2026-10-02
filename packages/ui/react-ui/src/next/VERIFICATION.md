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

| ID   | Bug                                                                                                                                     | Screenshot                     | Repro                                                                                                                                       | Status | Fix        |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------- |
| V002 | Navtree not compact like main (caret cell, indent, icon)                                                                                | `V002-navtree-properties.webp` | app home; Tree story `Test` geometry                                                                                                        | fixed  | 54c81f0ad1 |
| V003 | Disclosure (caret) button must always be half a block wide                                                                              | —                              | Tree story `Test` asserts half-block caret cell                                                                                             | fixed  | 54c81f0ad1 |
| V005 | Navtree item menu clipped under the sidebar                                                                                             | `V005-navmenu-clipped.png`     | app: navtree item ⋮                                                                                                                         | fixed  | 953fc36cf5 |
| V006 | L0 (hamburger) menu does not appear                                                                                                     | `V006-l0-menu.png`             | app: `click:button >> nth=0`                                                                                                                | fixed  | 953fc36cf5 |
| V007 | Plank heading sigil menu crashed (`Menu.Item` without `item`)                                                                           | —                              | app: click the README heading icon                                                                                                          | fixed  | 55f9a378a2 |
| V024 | Navtree section labels (CONTENT, SYSTEM) should look like `Field.Label` (size, case, colour, weight) instead of large tracked uppercase | `V024-navtree.png`             | app home; Tree `Groups` story; compare computed font with `Field.Label`                                                                     | open   |            |
| V025 | Navtree icons look more muted (or smaller) than on main; compare hue intensity and icon size with the previous version                  | `V024-navtree.png`             | app home vs preview.composer.space; measure icon size and computed colour                                                                   | open   |            |
| V031 | Article menus are not visible (dropdowns opened from an article/plank toolbar)                                                          | —                              | app: open README, open each toolbar dropdown (paragraph style, view mode, more) and the plank menu; check the popup renders above the plank | open   |            |
| V032 | R0 (right rail) sidebar open/close button is not horizontally centred in the rail (the icons above it are)                              | `V032-r0-sidebar.png`          | app: measure the toggle's centre vs the rail's centre and vs the other rail icons                                                           | open   |            |
| V046 | Menu popovers should have arrows (Next `Menu.Content` defaults `arrow={false}`; flip the default, check submenus and context menus)     | —                              | Menu story asserts `.nx-arrow` present; app: navtree ⋮, L0 menu                                                                             | open   |            |
| V050 | Plank header (top rail) icon buttons — fullscreen, close, split — have a gap between them; they should sit edge to edge                 | (inline, not saved)            | app: plank header right-hand buttons; measure gaps                                                                                          | open   |            |
| V051 | Rename-article popover (from the plank heading icon) is broken: empty popover with only a tiny control                                  | (inline, not saved)            | app: click the plank heading icon → Rename                                                                                                  | open   |            |

### Shell: Main (focus)

| ID   | Bug                                                                                                                           | Screenshot            | Repro                                                                                               | Status | Fix |
| ---- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------- | ------ | --- |
| V033 | Sidebar focus ring is clipped (the focused navigation sidebar's ring is cut off at its edges)                                 | `V033-main-focus.png` | app: focus the sidebar; Next Main story: ring fully inside the sidebar box                          | open   |     |
| V034 | Tab from the sidebar should move focus to the article, but the article shows no focus indicator                               | —                     | app: focus sidebar, press Tab; assert `document.activeElement` is the article and it draws the ring | open   |     |
| V035 | A second Tab moves focus somewhere else, also with no visible indicator (identify the target; every tab stop must show focus) | —                     | app: Tab twice; log `document.activeElement` and its computed focus style                           | open   |     |

### Article toolbars

| ID   | Bug                                                                                                                                             | Screenshot                  | Repro                                                               | Status | Fix |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------- | ------ | --- |
| V036 | Article toolbars should be 40px tall (`lg`?) — check against main's toolbar height                                                              | —                           | app: README toolbar height; ActionToolbar story at the article size | open   |     |
| V037 | Mic button + chevron (split/dropdown button): no gap between the icon button and its chevron; also a stray arrow tip shows under the mic button | `V036-mic-split-button.png` | app: README toolbar mic control; story for the split-button pattern | open   |     |

### Debug panel (companion)

| ID   | Bug                                                                                                                                                      | Screenshot                    | Repro                                                                                                  | Status | Fix |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------ | ------ | --- |
| V038 | JSON toolbar overflows/scrolls horizontally: the JSONPath input is cut off at the start and the depth NumberInput's value is not visible (only −/+ show) | `V038-debug-json-toolbar.png` | app: README → companion Debug tab; JSON viewer story: toolbar fits, input shrinks, depth value visible | open   |     |

### Card popovers (preview)

| ID   | Bug                                                                                                | Screenshot              | Repro                                                                                 | Status | Fix |
| ---- | -------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------- | ------ | --- |
| V040 | Card in the preview popover has no grid (rails/gutters) — should be a gridded Next Card as on main | `V040-card-popover.png` | app: README, hover/activate an inline object link (e.g. "New document"); Card stories | open   |     |
| V041 | Card popover needs a min width                                                                     | `V040-card-popover.png` | same; assert popover width ≥ card min width                                           | open   |     |
| V042 | Card popover needs a min height                                                                    | `V040-card-popover.png` | same; assert popover height ≥ card min height                                         | open   |     |
| V043 | Card popover is missing its menu (card actions menu)                                               | `V040-card-popover.png` | same; assert the card menu trigger exists and opens                                   | open   |     |
| V044 | Card in the popover is scaled; scaling must only apply when cards are in the companion             | `V040-card-popover.png` | same; assert no transform/scale on the popover card; companion card still scales      | open   |     |

### Search companion

| ID   | Bug                                                                                                         | Screenshot              | Repro                                                                                 | Status | Fix |
| ---- | ----------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------- | ------ | --- |
| V047 | Search panel toolbar input should be full width, with a search icon as its end adornment (Input `end` slot) | `V047-search-panel.png` | app: R0 rail → Search; plugin-search story: input spans the toolbar, end icon present | open   |     |

### Cards (all)

| ID   | Bug                                                                                                                                                                                                                                 | Screenshot                    | Repro                                                                                              | Status | Fix |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------- | ------ | --- |
| V048 | Search result card shows the red `asChild` slot warning (its child is not composable or drops the slot's props)                                                                                                                     | `V048-search-result-card.png` | app: Search companion, query `re`; assert no `.dx-slot-warning`                                    | open   |     |
| V049 | Next Card's `grid` defaults to false, but every object card (search results, previews, companion, popovers) should use the grid — set it at the object-card surface, not per call site; the title row also shows an empty icon cell | `V048-search-result-card.png` | app: search result, preview popover (V040), companion card; Card story for the object-card surface | open   |     |

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

| ID   | Bug                                                                                                                                                                | Screenshot                    | Repro                                                                              | Status   | Fix        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ---------------------------------------------------------------------------------- | -------- | ---------- |
| V009 | Settings content should be `dx-document` width with auto margins                                                                                                   | `V009-settings.webp`          | app `goto:/w/dxos:settings/plugin/settings:org.dxos.plugin.assistant`              | verified | b56bdb5450 |
| V010 | Settings fonts too small (main: lg title)                                                                                                                          | `V009-settings.webp`          | same                                                                               | verified | b56bdb5450 |
| V011 | Gap between settings rows / description and control should be much larger                                                                                          | `V009-settings.webp`          | same                                                                               | verified | b56bdb5450 |
| V012 | Switch sits mid-row instead of at the end of the control track                                                                                                     | `V009-settings.webp`          | same                                                                               | verified | b56bdb5450 |
| V013 | "Chat view" Select shows the field description instead of the value                                                                                                | `V009-settings.webp`          | same                                                                               | open     |            |
| V026 | Section title in the settings toolbar ("Assistant") should be larger and more prominent                                                                            | `V026-settings-top.webp`      | app settings page; compare with main                                               | open     |            |
| V027 | Settings toolbar buttons should sit at the right edge (is there a separator/spacer, and is it working?)                                                            | `V026-settings-top.webp`      | app settings page; Toolbar `Separator variant='gap'` story                         | open     |            |
| V028 | Input controls (Select triggers etc.) inside raised surfaces (settings cards, dialogs) have no contrast against the surface                                        | `V026-settings-top.webp`      | app settings; Dialog and Field-row stories: control bg ≠ surface bg                | open     |            |
| V029 | Settings body is cut off at the bottom after scrolling (last card clipped, no bottom inset)                                                                        | `V026-settings-scrolled.webp` | app settings: scroll to the end; Form `Settings` story at small height             | open     |            |
| V030 | Right-align all settings controls in the control track (Selects, inputs, toggles at their own width at the end, as main's `justify-end`)                           | `V026-settings-top.webp`      | app settings; Form `Settings` story asserts control right edge == track right edge | open     |            |
| V045 | Settings description text should be `text-base` (now `text-sm`; supersedes the earlier text-sm decision for settings rows)                                         | `V026-settings-top.webp`      | app settings; Form `Settings` story asserts description font-size == text-base     | open     |            |
| V052 | Settings section subtitle (Fieldset description, e.g. "Display settings for this space.") should be `text-base`                                                    | (inline)                      | app: space settings; Form `Settings` story asserts section description font size   | open     |            |
| V053 | Picker buttons (icon/emoji + chevron, hue swatch + chevron) should be a MenuButton variant: the leading icon keeps its natural padding beside a half-width chevron | (inline)                      | app: space settings icon and hue pickers; MenuButton story                         | open     |            |
| V054 | Hue picker popover should be a grid of swatches as before (now one column that scrolls)                                                                            | (inline)                      | app: space settings → hue; HuePicker story                                         | open     |            |

### Editor

| ID   | Bug                                             | Screenshot            | Repro                           | Status | Fix        |
| ---- | ----------------------------------------------- | --------------------- | ------------------------------- | ------ | ---------- |
| V008 | Slash menu: space to the right of the scrollbar | `V008-slash-menu.png` | app: README, new line, type `/` | fixed  | 29ab5b104f |

### Dialogs (all)

| ID   | Bug                                                                                                                                                   | Screenshot                          | Repro                                                                                          | Status                                                                                                                                                                                           | Fix |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- |
| V022 | Footer (action bar) needs more padding below it, roughly equal to the side gutter                                                                     | `V022-create-repository-dialog.png` | app: Create Repository dialog; Next Dialog story geometry (footer bottom inset == side gutter) | open                                                                                                                                                                                             |     |
| V023 | Esc must cancel (close) dialogs                                                                                                                       | `V022-create-repository-dialog.png` | Next Dialog story play: open, press Escape, assert closed; app: any dialog                     | repro — Create Object dialog only: Escape reaches the document undefaulted but zag never dismisses (About dialog and the ObjectFormDialog story close); suspect another dismissable layer on top |     |
| V039 | About dialog: the Close button is undersized and sits in the corner; it should be a regular-size button in a proper bottom action bar (Dialog.Footer) | `V039-about-dialog.png`             | app: L0 menu → About Composer                                                                  | open                                                                                                                                                                                             |     |

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
