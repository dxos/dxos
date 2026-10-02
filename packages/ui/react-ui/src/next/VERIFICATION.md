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

| ID   | Area              | Bug                                                                                                         | Screenshot                                          | Repro                                                                 | Status             | Fix        |
| ---- | ----------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------- | ------------------ | ---------- |
| V001 | plugin-registry   | Registry rendered the pilot list rows instead of main's card grid                                           | `V001-registry-now.webp`, `V001-registry-main.webp` | app `goto:/w/dxos:registry/category/bundled`                          | fixed              | a27e1dbe04 |
| V002 | navtree           | Navtree not compact like main (caret cell, indent, icon)                                                    | `V002-navtree-properties.webp`                      | app home; Tree story `Test` geometry                                  | fixed              | 54c81f0ad1 |
| V003 | Tree              | Disclosure (caret) button must always be half a block wide                                                  | —                                                   | Tree story `Test` asserts half-block caret cell                       | fixed              | 54c81f0ad1 |
| V004 | object properties | Properties companion shows the red `asChild` slot warning; panel gutter should default `sm`                 | `V002-navtree-properties.webp`                      | app `/w/<space>/object/<id>/companion/settings`; Panel story          | fixed              | d78065078c |
| V005 | menus             | Navtree item menu clipped under the sidebar                                                                 | `V005-navmenu-clipped.png`                          | app: navtree item ⋮                                                   | fixed              | 953fc36cf5 |
| V006 | menus             | L0 (hamburger) menu does not appear                                                                         | `V006-l0-menu.png`                                  | app: `click:button >> nth=0`                                          | fixed              | 953fc36cf5 |
| V007 | menus             | Plank heading sigil menu crashed (`Menu.Item` without `item`)                                               | —                                                   | app: click the README heading icon                                    | fixed              | 55f9a378a2 |
| V008 | editor            | Slash menu: space to the right of the scrollbar                                                             | `V008-slash-menu.png`                               | app: README, new line, type `/`                                       | fixed              | 29ab5b104f |
| V009 | settings          | Settings content should be `dx-document` width with auto margins                                            | `V009-settings.webp`                                | app `goto:/w/dxos:settings/plugin/settings:org.dxos.plugin.assistant` | fixed (unverified) | b56bdb5450 |
| V010 | settings          | Settings fonts too small (main: lg title)                                                                   | `V009-settings.webp`                                | same                                                                  | fixed (unverified) | b56bdb5450 |
| V011 | settings          | Gap between settings rows / description and control should be much larger                                   | `V009-settings.webp`                                | same                                                                  | fixed (unverified) | b56bdb5450 |
| V012 | settings          | Switch sits mid-row instead of at the end of the control track                                              | `V009-settings.webp`                                | same                                                                  | fixed (unverified) | b56bdb5450 |
| V013 | settings / Select | "Chat view" Select shows the field description instead of the value                                         | `V009-settings.webp`                                | same                                                                  | open               |            |
| V014 | panels            | Other document panels main gives `dx-document` should cap their width too (48 sites on main)                | `V009-settings.webp`                                | per site                                                              | open               |            |
| V015 | stories           | Drop `rail` from react-ui stories that wrap plain content (gutter follow-up)                                | —                                                   | story geometry tests                                                  | open               |            |
| V016 | Card              | Card `TileGrid` story: footer 33px from the card bottom                                                     | —                                                   | storybook Card `TileGrid`                                             | open               |            |
| V017 | stories           | Next Menu `Test` submenu position depends on viewport; ActionToolbar `EmbeddedMenu` expects `aria-haspopup` | —                                                   | storybook                                                             | open               |            |
