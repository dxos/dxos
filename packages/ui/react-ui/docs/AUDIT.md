# Raw DOM in plugin containers (audit)

**Status:** patterns **P1, P2, P3 are applied** — 127 raw DOM wrappers across 33 plugins are now
`Flex`, and `Flex` gained the props to express them. §8 records what changed. Every other section
reflects the tree **after** that migration; §1 carries the pre-migration baseline beside it so the
next pass has a number to beat.

This document inventories every raw HTML element rendered by a **plugin container**, records the
props each one carries, and groups them into the layout patterns a layout primitive absorbs.

The premise is the golden rule in the [`composer-ui`](../../../.agents/skills/composer-ui/SKILL.md)
skill — _"never introduce a wrapper `<div>` for styling"_ — which had no primitive worth pointing at
for the two most common cases: a row of things with a gap, and a column of things with a gap.
`Flex` and `Grid` did exist under [`src/primitives/`](./src/primitives), but `Flex` carried only
`column` and `grow`, so it could not express a gap, an alignment, or a justification — the three
things every wrapper in this corpus actually needed — and it had six consumers repo-wide. `Panel`,
`Column`, `Card`, `Toolbar`, and `ScrollArea` cover the _named_ shells; generic one-axis composition
was the gap.

---

## Method

- **Scope:** `packages/plugins/*/src/containers/**/*.tsx`, excluding `*.stories.tsx` and
  `*.test.tsx` — **270 files across 67 plugins**.
- **Extraction:** TypeScript AST walk (`ts.isJsxElement` / `ts.isJsxSelfClosingElement`), keeping
  every element whose tag name is an HTML tag. Each occurrence records tag, all JSX attributes and
  their values, spreads, child tags, and source position. String-literal and expression `className`
  values are both captured; `mx(…)` expressions are reduced to their string literals for token
  analysis.
- **Layout mode** is derived from the class list: `grid` (any `grid*`/`col-span*`),
  `flex-col` / `flex-row` (any `flex`/`items-*`/`justify-*`, split on `flex-col`), `contents`,
  `static` (classes but no display/layout classes), `none` (no `className` at all).
- **Out of scope:** `plugins/*/src/components/**` (the presentational layer), `packages/ui/**`
  itself, and apps. The container layer was chosen because it is where the skill's rules bind
  hardest and where surfaces are assembled.

## 1. Summary

| Measure                                                |  Before |   After |
| ------------------------------------------------------ | ------: | ------: |
| Container files scanned                                |     269 |     270 |
| Files containing at least one raw DOM element          |     113 |  **98** |
| Plugins containing at least one raw DOM element        |      46 |  **44** |
| Raw DOM elements                                       |     455 | **328** |
| …carrying a `className`                                |     415 |     288 |
| …that are **layout wrappers** (flex / grid)            | **191** |  **63** |
| …that are `display: contents`                          |       2 |       2 |
| …that are **typography or box-only leaves** (`static`) |     222 |     222 |
| …that are neither (`no className`)                     |      40 |      41 |
| Distinct `className` values                            |     274 |     189 |

**Where it stands.** The layout-wrapper population dropped by two thirds. What remains splits three
ways, and none of it is the same problem:

1. **23 flex-shaped sites the codemod deliberately left** — 17 on semantic elements (`<header>`,
   `<ul>`, `<li>`, `<a>`, `<section>`, `<form>`, `<span>`, `<button>`, `<dl>`), which need
   `<Flex asChild>`; 6 inside `mx(…)` conditionals or responsive variants, which need a human. §7.
2. **40 grid wrappers** — the P4–P6 work, untouched.
3. **222 `static` elements** — `<span className='text-sm text-description'>`. Not a layout problem
   at all: a missing typography primitive (P7), and now the single largest bucket by a wide margin.

## 2. Inventory

### 2.1 Element × layout mode

| Element     | flex-row | flex-col |   grid | contents |  static |   none |   Total |
| ----------- | -------: | -------: | -----: | -------: | ------: | -----: | ------: |
| `<div>`     |        1 |        5 |     38 |        2 |      72 |      9 | **127** |
| `<span>`    |        1 |        · |      · |        · |      70 |     17 |  **88** |
| `<p>`       |        · |        · |      · |        · |      36 |      3 |  **39** |
| `<a>`       |        1 |        · |      · |        · |       4 |      8 |  **13** |
| `<h2>`      |        · |        · |      · |        · |       8 |      · |   **8** |
| `<li>`      |        2 |        · |      · |        · |       1 |      3 |   **6** |
| `<h3>`      |        · |        · |      · |        · |       5 |      · |   **5** |
| `<section>` |        1 |        2 |      · |        · |       2 |      · |   **5** |
| `<ul>`      |        · |        3 |      · |        · |       2 |      · |   **5** |
| `<img>`     |        · |        · |      · |        · |       3 |      1 |   **4** |
| `<header>`  |        4 |        · |      · |        · |       · |      · |   **4** |
| `<h1>`      |        · |        · |      · |        · |       4 |      · |   **4** |
| `<dl>`      |        · |        1 |      2 |        · |       · |      · |   **3** |
| `<dt>`      |        · |        · |      · |        · |       3 |      · |   **3** |
| `<dd>`      |        · |        · |      · |        · |       3 |      · |   **3** |
| `<button>`  |        1 |        · |      · |        · |       2 |      · |   **3** |
| `<input>`   |        · |        · |      · |        · |       2 |      · |   **2** |
| `<form>`    |        1 |        · |      · |        · |       · |      · |   **1** |
| `<svg>`     |        · |        · |      · |        · |       1 |      · |   **1** |
| `<iframe>`  |        · |        · |      · |        · |       1 |      · |   **1** |
| `<pre>`     |        · |        · |      · |        · |       1 |      · |   **1** |
| `<nav>`     |        · |        · |      · |        · |       1 |      · |   **1** |
| `<canvas>`  |        · |        · |      · |        · |       1 |      · |   **1** |
| **Total**   |   **12** |   **11** | **40** |    **2** | **222** | **41** | **328** |

### 2.2 By plugin

| Plugin               | Files w/ raw DOM | Occurrences | flex | grid | static/none |
| -------------------- | ---------------: | ----------: | ---: | ---: | ----------: |
| `plugin-space`       |                9 |          35 |    1 |    8 |          26 |
| `plugin-support`     |                4 |          31 |    5 |    1 |          25 |
| `plugin-onboarding`  |                1 |          28 |    2 |    1 |          25 |
| `plugin-client`      |                5 |          26 |    1 |    2 |          23 |
| `plugin-assistant`   |                6 |          19 |    · |    · |          19 |
| `plugin-library`     |                4 |          18 |    4 |    · |          14 |
| `plugin-debug`       |                6 |          17 |    1 |    2 |          14 |
| `plugin-deck`        |                8 |          17 |    1 |    4 |          12 |
| `plugin-doctor`      |                1 |          14 |    2 |    · |          12 |
| `plugin-commerce`    |                3 |          13 |    1 |    2 |          10 |
| `plugin-devtools`    |                3 |          13 |    3 |    2 |           8 |
| `plugin-magazine`    |                2 |           7 |    · |    2 |           5 |
| `plugin-calls`       |                1 |           6 |    · |    1 |           5 |
| `plugin-inbox`       |                3 |           6 |    · |    1 |           5 |
| `plugin-studio`      |                3 |           6 |    · |    1 |           5 |
| `plugin-atproto`     |                2 |           5 |    · |    · |           5 |
| `plugin-code`        |                1 |           5 |    · |    5 |           · |
| `plugin-connector`   |                4 |           5 |    · |    · |           5 |
| `plugin-sequencer`   |                1 |           5 |    1 |    2 |           2 |
| `plugin-terra`       |                1 |           5 |    · |    · |           5 |
| `plugin-trip`        |                3 |           5 |    · |    2 |           3 |
| `plugin-script`      |                2 |           4 |    · |    · |           4 |
| `plugin-status-bar`  |                3 |           4 |    · |    · |           4 |
| `plugin-chess`       |                1 |           3 |    1 |    1 |           1 |
| `plugin-registry`    |                1 |           3 |    · |    · |           3 |
| `plugin-review`      |                1 |           3 |    · |    · |           3 |
| `plugin-voxel`       |                1 |           3 |    · |    · |           3 |
| `plugin-blogger`     |                1 |           2 |    · |    1 |           1 |
| `plugin-bookmarks`   |                1 |           2 |    · |    · |           2 |
| `plugin-chess-com`   |                1 |           2 |    · |    · |           2 |
| `plugin-meeting`     |                1 |           2 |    · |    · |           2 |
| `plugin-tasks`       |                2 |           2 |    · |    2 |           · |
| `plugin-crx`         |                1 |           1 |    · |    · |           1 |
| `plugin-explorer`    |                1 |           1 |    · |    · |           1 |
| `plugin-game`        |                1 |           1 |    · |    · |           1 |
| `plugin-ibkr`        |                1 |           1 |    · |    · |           1 |
| `plugin-illustrator` |                1 |           1 |    · |    · |           1 |
| `plugin-markdown`    |                1 |           1 |    · |    · |           1 |
| `plugin-navtree`     |                1 |           1 |    · |    · |           1 |
| `plugin-payments`    |                1 |           1 |    · |    · |           1 |
| `plugin-pipeline`    |                1 |           1 |    · |    · |           1 |
| `plugin-projects`    |                1 |           1 |    · |    · |           1 |
| `plugin-routine`     |                1 |           1 |    · |    · |           1 |
| `plugin-video`       |                1 |           1 |    · |    · |           1 |

## 3. Property table

Every distinct `className` signature still present, grouped by layout mode, with the elements it is
applied to, the other props those elements carry, the occurrence count, and one example site. The
`Other props` column is the full union across occurrences of that signature — it is what a primitive
would have to forward.

#### A. Flex — row — 12 occurrences, 12 distinct signatures

| `className`                                                                                                                                                                              | Elements  | Other props           |   n | Example                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------- | --: | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flex gap-2 items-center justify-end`                                                                                                                                                    | `form`    | `onSubmit`            |   1 | [plugin-client › AccountContainer/AccountContainer.tsx:133](packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx#L133)       |
| `flex gap-4 rounded-lg border border-separator p-4`                                                                                                                                      | `section` | —                     |   1 | [plugin-library › BookArticle/BookInfo.tsx:142](packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx#L142)                               |
| `flex items-center gap-0.5`                                                                                                                                                              | `span`    | `role` `aria-label`   |   1 | [plugin-library › BookArticle/BookInfo.tsx:231](packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx#L231)                               |
| `flex items-center gap-1 px-2 py-1 rounded-sm text-sm hover:bg-hover-surface`                                                                                                            | `a`       | `href` `target` `rel` |   1 | [plugin-support › DiscordPanel/DiscordComponent.tsx:163](packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx#L163)             |
| `flex items-center gap-2 px-2 py-1 rounded`                                                                                                                                              | `li`      | —                     |   1 | [plugin-support › DiscordPanel/DiscordComponent.tsx:186](packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx#L186)             |
| `flex items-center justify-between gap-1 px-2 dx-modal-surface`                                                                                                                          | `header`  | —                     |   1 | [plugin-support › DiscordPanel/DiscordComponent.tsx:132](packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx#L132)             |
| `flex items-center justify-between gap-1 px-4 py-3 dx-modal-surface border-b border-subdued-separator`                                                                                   | `header`  | —                     |   1 | [plugin-devtools › GithubPanel/GithubComponent.tsx:96](packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx#L96)                 |
| `flex items-center justify-between gap-2 p-2`                                                                                                                                            | `header`  | —                     |   1 | [plugin-doctor › DiagnosticsPanel/DiagnosticsPanel.tsx:187](packages/plugins/plugin-doctor/src/containers/DiagnosticsPanel/DiagnosticsPanel.tsx#L187)       |
| `flex items-center justify-center gap-1 text-sm text-description hover:text-white underline underline-offset-4 outline-none`                                                             | `button`  | `type`                |   1 | [plugin-onboarding › WelcomeContainer/Welcome/Welcome.tsx:720](packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx#L720) |
| `flex items-start gap-2 p-2`                                                                                                                                                             | `li`      | —                     |   1 | [plugin-doctor › DiagnosticsPanel/DiagnosticsPanel.tsx:216](packages/plugins/plugin-doctor/src/containers/DiagnosticsPanel/DiagnosticsPanel.tsx#L216)       |
| `mx( 'flex items-stretch relative py-1 ps-1 pe-2', variant === 'topbar' && 'fixed inset-x-0 top-[env(safe-area-inset-top)] h-(--dx-rail-size) border-b border-separator', classNames, )` | `header`  | —                     |   1 | [plugin-deck › Deck/Banner.tsx:21](packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx#L21)                                                         |
| `mx('absolute inset-0 flex items-center justify-center text-neutral-500 text-sm')`                                                                                                       | `div`     | —                     |   1 | [plugin-sequencer › ScoreArticle/ScoreArticle.tsx:518](packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx#L518)                 |

#### B. Flex — column — 11 occurrences, 8 distinct signatures

| `className`                                                                                   | Elements  | Other props |   n | Example                                                                                                                                                     |
| --------------------------------------------------------------------------------------------- | --------- | ----------- | --: | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flex flex-col p-1`                                                                           | `ul`      | —           |   3 | [plugin-devtools › GithubPanel/GithubComponent.tsx:159](packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx#L159)               |
| `flex flex-col gap-2 rounded-lg border border-separator p-4`                                  | `section` | —           |   2 | [plugin-library › BookArticle/BookInfo.tsx:193](packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx#L193)                               |
| `flex flex-col gap-1`                                                                         | `dl`      | —           |   1 | [plugin-commerce › ProviderArticle/ProviderArticle.tsx:79](packages/plugins/plugin-commerce/src/containers/ProviderArticle/ProviderArticle.tsx#L79)         |
| `flex flex-col md:gap-1 flex-row gap-0 sm:items-stretch`                                      | `div`     | —           |   1 | [plugin-onboarding › WelcomeContainer/Welcome/Welcome.tsx:784](packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx#L784) |
| `hidden @4xl:flex flex-col justify-center items-center overflow-hidden`                       | `div`     | —           |   1 | [plugin-chess › ChessArticle/ChessArticle.tsx:97](packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx#L97)                           |
| `mx('dx-expander flex flex-col gap-form-gap', singleColumn ? 'dx-card-max-width' : 'w-full')` | `div`     | —           |   1 | [plugin-space › RecordArticle/RecordArticle.tsx:86](packages/plugins/plugin-space/src/containers/RecordArticle/RecordArticle.tsx#L86)                       |
| `mx('flex flex-col gap-1 py-1', classNames)`                                                  | `div`     | —           |   1 | [plugin-debug › SpaceGenerator/SpaceGenerator.tsx:318](packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx#L318)                 |
| `mx('flex flex-col min-h-0 overflow-hidden')`                                                 | `div`     | —           |   1 | [plugin-devtools › RegistryPanel/RegistryPanel.tsx:141](packages/plugins/plugin-devtools/src/containers/RegistryPanel/RegistryPanel.tsx#L141)               |

#### C. Grid — 40 occurrences, 38 distinct signatures

| `className`                                                                                                                                                                                                                                               | Elements | Other props                      |   n | Example                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------- | --: | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `col-span-full grid grid-cols-subgrid gap-2 items-center text-sm`                                                                                                                                                                                         | `div`    | —                                |   3 | [plugin-space › SyncStatus/SyncStatus.tsx:103](packages/plugins/plugin-space/src/containers/SyncStatus/SyncStatus.tsx#L103)                                     |
| `dx-container grid grid-cols-[30rem_1fr] divide-x divide-separator`                                                                                                                                                                                       | `div`    | —                                |   1 | [plugin-code › CodeArticle/CodeArticle.tsx:228](packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx#L228)                                   |
| `dx-container grid grid-rows-[1fr_2fr] divide-y divide-subdued-separator`                                                                                                                                                                                 | `div`    | —                                |   1 | [plugin-code › CodeArticle/CodeArticle.tsx:229](packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx#L229)                                   |
| `dx-container grid min-h-0 overflow-hidden`                                                                                                                                                                                                               | `div`    | `role` `aria-label`              |   1 | [plugin-code › CodeArticle/CodeArticle.tsx:242](packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx#L242)                                   |
| `dx-container grid overflow-auto`                                                                                                                                                                                                                         | `div`    | `role` `aria-label`              |   1 | [plugin-code › CodeArticle/CodeArticle.tsx:230](packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx#L230)                                   |
| `dx-container grid overflow-hidden`                                                                                                                                                                                                                       | `div`    | `role` `aria-label`              |   1 | [plugin-code › CodeArticle/CodeArticle.tsx:238](packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx#L238)                                   |
| `grid grid-cols-[1fr_min-content]`                                                                                                                                                                                                                        | `div`    | `role`                           |   1 | [plugin-client › DevicesContainer/DevicesContainer.tsx:243](packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx#L243)           |
| `grid grid-cols-[1fr_min-content] my-2 gap-2`                                                                                                                                                                                                             | `div`    | `role`                           |   1 | [plugin-space › MembersContainer/MembersContainer.tsx:218](packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx#L218)             |
| `grid grid-cols-[3fr_1fr_1fr_1fr]`                                                                                                                                                                                                                        | `div`    | `key`                            |   1 | [plugin-calls › CallDebugPanel/CallDebugPanel.tsx:183](packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx#L183)                     |
| `grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm`                                                                                                                                                                                             | `dl`     | —                                |   1 | [plugin-commerce › SearchArticle/ResultDetail.tsx:76](packages/plugins/plugin-commerce/src/containers/SearchArticle/ResultDetail.tsx#L76)                       |
| `grid grid-cols-[auto_minmax(0,1fr)] w-full`                                                                                                                                                                                                              | `dl`     | —                                |   1 | [plugin-debug › StatsPanel/StatsPanel.tsx:58](packages/plugins/plugin-debug/src/containers/StatsPanel/StatsPanel.tsx#L58)                                       |
| `grid grid-cols-[min-content_1fr_min-content_min-content] gap-2`                                                                                                                                                                                          | `div`    | —                                |   1 | [plugin-space › SyncStatus/SyncStatus.tsx:94](packages/plugins/plugin-space/src/containers/SyncStatus/SyncStatus.tsx#L94)                                       |
| `grid grid-cols-[min-content_1fr_min-content_min-content] gap-2 gap-y-1`                                                                                                                                                                                  | `div`    | —                                |   1 | [plugin-space › SyncStatus/SyncStatus.tsx:101](packages/plugins/plugin-space/src/containers/SyncStatus/SyncStatus.tsx#L101)                                     |
| `grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-sm text-description overflow-hidden`                                                                                                                                                         | `div`    | —                                |   1 | [plugin-magazine › PostCard/PostCard.tsx:61](packages/plugins/plugin-magazine/src/containers/PostCard/PostCard.tsx#L61)                                         |
| `grid grid-cols-[minmax(0,1fr)_auto] items-center gap-trim-sm py-trim-xs text-sm text-description overflow-hidden`                                                                                                                                        | `div`    | —                                |   1 | [plugin-magazine › MagazineArticle/MagazineTile.tsx:75](packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineTile.tsx#L75)                   |
| `grid grid-cols-[minmax(0,1fr)_min-content_min-content] gap-2 items-start`                                                                                                                                                                                | `div`    | —                                |   1 | [plugin-commerce › SearchArticle/ResultDetail.tsx:39](packages/plugins/plugin-commerce/src/containers/SearchArticle/ResultDetail.tsx#L39)                       |
| `grid grid-cols-1 @2xl:grid-cols-[min-content_1fr] h-full`                                                                                                                                                                                                | `div`    | —                                |   1 | [plugin-inbox › CalendarArticle/CalendarArticle.tsx:207](packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx#L207)                 |
| `grid grid-cols-1 @3xl:grid-cols-[min-content_1fr] min-h-0 overflow-hidden`                                                                                                                                                                               | `div`    | —                                |   1 | [plugin-trip › TripArticle/TripArticle.tsx:269](packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx#L269)                                   |
| `grid grid-cols-1 auto-rows-(--dx-rail-item) py-0.5 gap-0.5 overflow-y-auto scrollbar-none`                                                                                                                                                               | `div`    | `style`                          |   1 | [plugin-deck › Sidebar/ComplementarySidebar.tsx:115](packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx#L115)                         |
| `grid grid-cols-4`                                                                                                                                                                                                                                        | `div`    | —                                |   1 | [plugin-client › RecoveryCodeDialog/RecoveryCodeDialog.tsx:61](packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx#L61)     |
| `grid grid-flow-col gap-form-gap auto-cols-fr py-form-padding`                                                                                                                                                                                            | `div`    | —                                |   1 | [plugin-tasks › QuickEntryDialog/QuickEntryDialog.tsx:54](packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx#L54)               |
| `grid grid-rows-[auto_1fr] dx-document overflow-hidden`                                                                                                                                                                                                   | `div`    | —                                |   1 | [plugin-studio › ArtifactArticle/ArtifactArticle.tsx:381](packages/plugins/plugin-studio/src/containers/ArtifactArticle/ArtifactArticle.tsx#L381)               |
| `grid h-full grid-rows-[auto_1fr] gap-3 overflow-hidden`                                                                                                                                                                                                  | `div`    | —                                |   1 | [plugin-blogger › PublicationArticle/PublicationArticle.tsx:202](packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx#L202) |
| `grid h-full pointer-fine:p-1 max-w-md mx-auto pointer-events-auto`                                                                                                                                                                                       | `div`    | —                                |   1 | [plugin-deck › Deck/Banner.tsx:33](packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx#L33)                                                             |
| `grid p-2 aspect-square`                                                                                                                                                                                                                                  | `div`    | `onClick`                        |   1 | [plugin-sequencer › ScoreArticle/ScoreArticle.tsx:477](packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx#L477)                     |
| `h-full grid grid-rows-[1fr_auto] w-48 shrink-0 border-r border-separator`                                                                                                                                                                                | `div`    | —                                |   1 | [plugin-sequencer › ScoreArticle/ScoreArticle.tsx:468](packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx#L468)                     |
| `h-full grid grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden h-full w-full`                                                                                                                                                                      | `div`    | —                                |   1 | [plugin-support › DiscordPanel/DiscordPanel.tsx:11](packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordPanel.tsx#L11)                           |
| `h-full grid grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden h-full w-full`                                                                                                                                                                           | `div`    | —                                |   1 | [plugin-devtools › GithubPanel/GithubPanel.tsx:11](packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubPanel.tsx#L11)                             |
| `hidden lg:grid grid-cols-1 auto-rows-(--dx-rail-action) p-1`                                                                                                                                                                                             | `div`    | —                                |   1 | [plugin-deck › Sidebar/ComplementarySidebar.tsx:121](packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx#L121)                         |
| `min-h-[3.5rem] grid grid-rows-subgrid grid-cols-subgrid items-center`                                                                                                                                                                                    | `div`    | `role`                           |   1 | [plugin-space › CollectionSection/CollectionSection.tsx:20](packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx#L20)           |
| `mx( 'absolute z-5 inset-y-0 end-0 w-(--dx-r0-size)!', 'py-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] border-s border-subdued-separator', 'grid grid-cols-1 grid-rows-[1fr_min-content] dx-r0-surface dx-contain-layout dx-app-drag', )` | `div`    | `data-tauri-drag-region` `style` |   1 | [plugin-deck › Sidebar/ComplementarySidebar.tsx:83](packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx#L83)                           |
| `mx( 'grid h-full w-full', showInfo && '@4xl:grid-cols-[1fr_320px] gap-8', role === AppSurface.Article.role && 'p-4', role === AppSurface.Section.role && 'aspect-square', role === AppSurface.Section.role && showInfo && '@4xl:aspect-auto', )`         | `div`    | —                                |   1 | [plugin-chess › ChessArticle/ChessArticle.tsx:84](packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx#L84)                               |
| `mx( 'grid h-full', showGlobe ? 'grid-rows-[minmax(0,1fr)_minmax(0,1fr)]' : 'grid-rows-[minmax(0,1fr)]', )`                                                                                                                                               | `div`    | —                                |   1 | [plugin-trip › TripArticle/TripArticle.tsx:262](packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx#L262)                                   |
| `mx( 'relative grid grid-cols-1 md:w-[37rem] max-w-[37rem] h-full md:h-[675px] overflow-hidden', 'border-2 border-sky-950 rounded-xl lg:translate-x-[-40%]', )`                                                                                           | `div`    | `ref` `style`                    |   1 | [plugin-onboarding › WelcomeContainer/Welcome/Welcome.tsx:289](packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx#L289)     |
| `mx( showCalendar ? isNotMobile ? 'h-full grid grid-cols-[min-content_1fr] overflow-hidden' : 'flex flex-col overflow-hidden' : 'contents', )`                                                                                                            | `div`    | —                                |   1 | [plugin-tasks › JournalArticle/JournalArticle.tsx:50](packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx#L50)                       |
| `mx('grid divide-y divide-subdued-separator', db && 'grid-rows-[1fr_2fr]')`                                                                                                                                                                               | `div`    | —                                |   1 | [plugin-debug › DebugObjectPanel/DebugObjectPanel.tsx:46](packages/plugins/plugin-debug/src/containers/DebugObjectPanel/DebugObjectPanel.tsx#L46)               |
| `mx('h-full grid grid-cols-[2fr_1fr] overflow-hidden')`                                                                                                                                                                                                   | `div`    | —                                |   1 | [plugin-devtools › RegistryPanel/RegistryPanel.tsx:140](packages/plugins/plugin-devtools/src/containers/RegistryPanel/RegistryPanel.tsx#L140)                   |
| `mx([ 'grid md:col-span-2 grid-cols-subgrid gap-trim-sm items-center', '*:first:mt-0! *:last:mb-0! px-trim-md py-trim-md', 'border border-separator rounded-md', ])`                                                                                      | `div`    | —                                |   1 | [plugin-space › SchemaContainer/SchemaContainer.tsx:26](packages/plugins/plugin-space/src/containers/SchemaContainer/SchemaContainer.tsx#L26)                   |

#### D. display:contents — 2 occurrences, 2 distinct signatures

| `className`               | Elements | Other props |   n | Example                                                                                                                                             |
| ------------------------- | -------- | ----------- | --: | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contents`                | `div`    | `ref`       |   1 | [plugin-pipeline › PipelineArticle/PipelineArticle.tsx:78](packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.tsx#L78) |
| `contents dx-app-no-drag` | `div`    | `ref`       |   1 | [plugin-deck › Deck/PlankControls.tsx:38](packages/plugins/plugin-deck/src/containers/Deck/PlankControls.tsx#L38)                                   |

#### E. Static / typography / box-only — 222 occurrences, 128 distinct signatures

| `className`                                                                                                                                                                                                             | Elements             | Other props                                                    |   n | Example                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------- | --: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text-description`                                                                                                                                                                                                      | `span` `p` `dt`      | —                                                              |  21 | [plugin-assistant › AssistantSettings/OllamaModels.tsx:146](packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx#L146)                                                 |
| `grow`                                                                                                                                                                                                                  | `div` `span`         | `role`                                                         |  13 | [plugin-chess-com › ChessGameArticle/ChessGameArticle.tsx:69](packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx#L69)                                             |
| `text-sm text-description`                                                                                                                                                                                              | `p` `span` `div`     | —                                                              |  11 | [plugin-assistant › AssistantSettings/OllamaModels.tsx:101](packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx#L101)                                                 |
| `text-xs text-description`                                                                                                                                                                                              | `div` `span` `dd`    | —                                                              |   7 | [plugin-assistant › TriggerStatus/TriggerStatus.tsx:118](packages/plugins/plugin-assistant/src/containers/TriggerStatus/TriggerStatus.tsx#L118)                                                       |
| `truncate`                                                                                                                                                                                                              | `dd` `span`          | —                                                              |   7 | [plugin-commerce › SearchArticle/ResultDetail.tsx:80](packages/plugins/plugin-commerce/src/containers/SearchArticle/ResultDetail.tsx#L80)                                                             |
| `text-2xl`                                                                                                                                                                                                              | `h2` `h1`            | —                                                              |   6 | [plugin-onboarding › WelcomeContainer/Welcome/Welcome.tsx:351](packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx#L351)                                           |
| `sr-only`                                                                                                                                                                                                               | `span` `div` `input` | `id` `ref` `type` `accept` `tabIndex` `aria-hidden` `onChange` |   5 | [plugin-client › DevicesContainer/DevicesContainer.tsx:261](packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx#L261)                                                 |
| `min-w-0`                                                                                                                                                                                                               | `div`                | `role`                                                         |   4 | [plugin-client › DevicesContainer/DevicesContainer.tsx:58](packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx#L58)                                                   |
| `p-1`                                                                                                                                                                                                                   | `div`                | —                                                              |   4 | [plugin-calls › CallDebugPanel/CallDebugPanel.tsx:184](packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx#L184)                                                           |
| `text-lg mb-2`                                                                                                                                                                                                          | `h3`                 | —                                                              |   4 | [plugin-client › DevicesContainer/DevicesContainer.tsx:59](packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx#L59)                                                   |
| `font-mono`                                                                                                                                                                                                             | `span`               | —                                                              |   3 | [plugin-debug › DebugPortSettings/DebugPortSettings.tsx:65](packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx#L65)                                                 |
| `p-4 text-description`                                                                                                                                                                                                  | `div`                | —                                                              |   3 | [plugin-registry › PublicRegistryArticle/PublicRegistryArticle.tsx:174](packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx#L174)                         |
| `text-sm`                                                                                                                                                                                                               | `div` `dt`           | —                                                              |   3 | [plugin-assistant › TriggerStatus/TriggerStatus.tsx:116](packages/plugins/plugin-assistant/src/containers/TriggerStatus/TriggerStatus.tsx#L116)                                                       |
| `text-sm font-medium truncate`                                                                                                                                                                                          | `p` `a` `span`       | `href` `target` `rel`                                          |   3 | [plugin-assistant › IntegrationPrompt/IntegrationPrompt.tsx:44](packages/plugins/plugin-assistant/src/containers/IntegrationPrompt/IntegrationPrompt.tsx#L44)                                         |
| `@container dx-container overflow-hidden`                                                                                                                                                                               | `div`                | `role`                                                         |   2 | [plugin-inbox › CalendarArticle/CalendarArticle.tsx:206](packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx#L206)                                                       |
| `flex-1 border-t border-neutral-700`                                                                                                                                                                                    | `div`                | —                                                              |   2 | [plugin-onboarding › WelcomeContainer/Welcome/Welcome.tsx:818](packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx#L818)                                           |
| `font-mono truncate`                                                                                                                                                                                                    | `div`                | —                                                              |   2 | [plugin-client › InvitationsContainer/InvitationsContainer.tsx:122](packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx#L122)                                 |
| `p-2 text-sm text-description`                                                                                                                                                                                          | `div` `p`            | —                                                              |   2 | [plugin-debug › StatsPanel/StatsPanel.tsx:49](packages/plugins/plugin-debug/src/containers/StatsPanel/StatsPanel.tsx#L49)                                                                             |
| `p-4 text-sm`                                                                                                                                                                                                           | `div`                | —                                                              |   2 | [plugin-game › GameArticle/GameArticle.tsx:32](packages/plugins/plugin-game/src/containers/GameArticle/GameArticle.tsx#L32)                                                                           |
| `pt-2`                                                                                                                                                                                                                  | `div` `ul`           | —                                                              |   2 | [plugin-script › ScriptProperties/SkillEditor.tsx:96](packages/plugins/plugin-script/src/containers/ScriptProperties/SkillEditor.tsx#L96)                                                             |
| `relative grow`                                                                                                                                                                                                         | `div`                | —                                                              |   2 | [plugin-terra › TerraArticle/TerraArticle.tsx:378](packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx#L378)                                                                   |
| `text-base font-semibold`                                                                                                                                                                                               | `h2`                 | —                                                              |   2 | [plugin-library › BookArticle/BookInfo.tsx:194](packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx#L194)                                                                         |
| `text-description mb-2`                                                                                                                                                                                                 | `p`                  | —                                                              |   2 | [plugin-client › DevicesContainer/DevicesContainer.tsx:206](packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx#L206)                                                 |
| `text-description text-xs`                                                                                                                                                                                              | `p`                  | —                                                              |   2 | [plugin-client › InvitationsContainer/InvitationsContainer.tsx:123](packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx#L123)                                 |
| `text-end shrink-0`                                                                                                                                                                                                     | `span`               | —                                                              |   2 | [plugin-magazine › PostCard/PostCard.tsx:63](packages/plugins/plugin-magazine/src/containers/PostCard/PostCard.tsx#L63)                                                                               |
| `text-error`                                                                                                                                                                                                            | `p`                  | —                                                              |   2 | [plugin-connector › CustomTokenDialog/CustomTokenDialog.tsx:101](packages/plugins/plugin-connector/src/containers/CustomTokenDialog/CustomTokenDialog.tsx#L101)                                       |
| `text-sm text-error-text`                                                                                                                                                                                               | `p` `span`           | —                                                              |   2 | [plugin-assistant › AssistantSettings/OllamaModels.tsx:99](packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx#L99)                                                   |
| `text-sm text-subdued`                                                                                                                                                                                                  | `p` `span`           | —                                                              |   2 | [plugin-assistant › IntegrationPrompt/IntegrationPrompt.tsx:45](packages/plugins/plugin-assistant/src/containers/IntegrationPrompt/IntegrationPrompt.tsx#L45)                                         |
| `‘dx-container absolute inset-0 outline-none ${view === 'map' ? 'invisible' : ''}‘`                                                                                                                                     | `canvas`             | `ref` `style`                                                  |   1 | [plugin-terra › TerraArticle/TerraArticle.tsx:381](packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx#L381)                                                                   |
| `‘truncate text-sm ${field.group \|\| visible ? '' : 'text-description'}‘`                                                                                                                                              | `span`               | —                                                              |   1 | [plugin-atproto › AtprotoCompanion/AtprotoCompanion.tsx:312](packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx#L312)                                               |
| `absolute bottom-2 left-0 right-0`                                                                                                                                                                                      | `div`                | —                                                              |   1 | [plugin-assistant › ChatArticle/ChatArticle.tsx:103](packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx#L103)                                                               |
| `absolute bottom-2 right-2 z-10`                                                                                                                                                                                        | `div`                | —                                                              |   1 | [plugin-terra › TerraArticle/TerraArticle.tsx:392](packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx#L392)                                                                   |
| `absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none`                                                                                                                                                       | `div`                | —                                                              |   1 | [plugin-voxel › VoxelArticle/VoxelArticle.tsx:151](packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx#L151)                                                                   |
| `absolute inset-0 pointer-events-none`                                                                                                                                                                                  | `div`                | —                                                              |   1 | [plugin-deck › Deck/Banner.tsx:32](packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx#L32)                                                                                                   |
| `absolute top-2 right-2 z-10`                                                                                                                                                                                           | `div`                | —                                                              |   1 | [plugin-terra › TerraArticle/TerraArticle.tsx:389](packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx#L389)                                                                   |
| `bg-transparent *:text-subdued`                                                                                                                                                                                         | `svg`                | `width` `height`                                               |   1 | [plugin-debug › Wireframe/Wireframe.tsx:34](packages/plugins/plugin-debug/src/containers/Wireframe/Wireframe.tsx#L34)                                                                                 |
| `border-b border-subdued-separator`                                                                                                                                                                                     | `nav`                | —                                                              |   1 | [plugin-support › DiscordPanel/DiscordComponent.tsx:159](packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx#L159)                                                       |
| `border-be border-separator pbe-1 pbs-1 pe-2 text-description self-start`                                                                                                                                               | `dt`                 | —                                                              |   1 | [plugin-debug › StatsPanel/StatsPanel.tsx:61](packages/plugins/plugin-debug/src/containers/StatsPanel/StatsPanel.tsx#L61)                                                                             |
| `border-be border-separator pbe-1 pbs-1 truncate font-mono text-end`                                                                                                                                                    | `dd`                 | —                                                              |   1 | [plugin-debug › StatsPanel/StatsPanel.tsx:62](packages/plugins/plugin-debug/src/containers/StatsPanel/StatsPanel.tsx#L62)                                                                             |
| `border-t border-separator divide-y divide-subdued-separator`                                                                                                                                                           | `ul`                 | —                                                              |   1 | [plugin-doctor › DiagnosticsPanel/DiagnosticsPanel.tsx:205](packages/plugins/plugin-doctor/src/containers/DiagnosticsPanel/DiagnosticsPanel.tsx#L205)                                                 |
| `break-words break-all`                                                                                                                                                                                                 | `span`               | —                                                              |   1 | [plugin-doctor › DiagnosticsPanel/DiagnosticsPanel.tsx:223](packages/plugins/plugin-doctor/src/containers/DiagnosticsPanel/DiagnosticsPanel.tsx#L223)                                                 |
| `cursor-pointer w-full`                                                                                                                                                                                                 | `div`                | `key` `role` `tabIndex` `onClick` `onKeyDown`                  |   1 | [plugin-assistant › SpaceHomeSuggestions/SpaceHomeSuggestions.tsx:49](packages/plugins/plugin-assistant/src/containers/SpaceHomeSuggestions/SpaceHomeSuggestions.tsx#L49)                             |
| `dx-avatar-group`                                                                                                                                                                                                       | `div`                | `data-testid`                                                  |   1 | [plugin-space › SpacePresence/SpacePresence.tsx:122](packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx#L122)                                                               |
| `dx-container`                                                                                                                                                                                                          | `div`                | —                                                              |   1 | [plugin-blogger › PublicationArticle/PublicationArticle.tsx:204](packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx#L204)                                       |
| `dx-container border-t border-subdued-separator`                                                                                                                                                                        | `div`                | —                                                              |   1 | [plugin-studio › ArtifactArticle/ArtifactArticle.tsx:428](packages/plugins/plugin-studio/src/containers/ArtifactArticle/ArtifactArticle.tsx#L428)                                                     |
| `dx-container relative`                                                                                                                                                                                                 | `div`                | —                                                              |   1 | [plugin-assistant › ChatArticle/ChatArticle.tsx:97](packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx#L97)                                                                 |
| `dx-document px-4`                                                                                                                                                                                                      | `div`                | —                                                              |   1 | [plugin-assistant › ChatArticle/ChatArticle.tsx:104](packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx#L104)                                                               |
| `dx-document px-4 pb-4`                                                                                                                                                                                                 | `div`                | —                                                              |   1 | [plugin-assistant › ChatArticle/ChatArticle.tsx:110](packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx#L110)                                                               |
| `dx-document py-3`                                                                                                                                                                                                      | `div`                | —                                                              |   1 | [plugin-bookmarks › BookmarkArticle/BookmarkArticle.tsx:92](packages/plugins/plugin-bookmarks/src/containers/BookmarkArticle/BookmarkArticle.tsx#L92)                                                 |
| `dx-expander p-2`                                                                                                                                                                                                       | `div`                | —                                                              |   1 | [plugin-studio › ArtifactArticle/ArtifactArticle.tsx:447](packages/plugins/plugin-studio/src/containers/ArtifactArticle/ArtifactArticle.tsx#L447)                                                     |
| `dx-focus-ring rounded text-accent-text`                                                                                                                                                                                | `a`                  | `href` `target` `rel`                                          |   1 | [plugin-library › BookArticle/BookInfo.tsx:167](packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx#L167)                                                                         |
| `dx-link-hover font-mono`                                                                                                                                                                                               | `a`                  | `href` `target` `rel`                                          |   1 | [plugin-support › HelpMenu/HelpMenu.tsx:95](packages/plugins/plugin-support/src/containers/HelpMenu/HelpMenu.tsx#L95)                                                                                 |
| `expanded ? '' : 'max-h-52 overflow-hidden'`                                                                                                                                                                            | `div`                | `ref` `role`                                                   |   1 | [plugin-library › BookArticle/BookInfo.tsx:195](packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx#L195)                                                                         |
| `flex-1`                                                                                                                                                                                                                | `div`                | —                                                              |   1 | [plugin-inbox › SaveFilterPopover/SaveFilterPopover.tsx:30](packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx#L30)                                                 |
| `flex-1 min-w-0 relative`                                                                                                                                                                                               | `div`                | —                                                              |   1 | [plugin-sequencer › ScoreArticle/ScoreArticle.tsx:491](packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx#L491)                                                           |
| `font-medium text-sm truncate`                                                                                                                                                                                          | `span`               | `title`                                                        |   1 | [plugin-space › SyncStatus/SyncStatus.tsx:87](packages/plugins/plugin-space/src/containers/SyncStatus/SyncStatus.tsx#L87)                                                                             |
| `font-mono text-xs text-description truncate`                                                                                                                                                                           | `span`               | —                                                              |   1 | [plugin-atproto › PdsBrowser/PdsBrowser.tsx:204](packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx#L204)                                                                       |
| `goal.status === 'dropped' ? 'line-through text-subdued truncate' : 'truncate'`                                                                                                                                         | `span`               | —                                                              |   1 | [plugin-projects › ProjectArticle/ProjectArticle.tsx:194](packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx#L194)                                                     |
| `grow truncate`                                                                                                                                                                                                         | `span`               | —                                                              |   1 | [plugin-inbox › MessageCard/MessageCard.tsx:23](packages/plugins/plugin-inbox/src/containers/MessageCard/MessageCard.tsx#L23)                                                                         |
| `grow truncate font-medium`                                                                                                                                                                                             | `span`               | —                                                              |   1 | [plugin-assistant › AssistantSettings/OllamaModels.tsx:122](packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx#L122)                                                 |
| `grow truncate font-medium text-description`                                                                                                                                                                            | `span`               | —                                                              |   1 | [plugin-assistant › AssistantSettings/OllamaModels.tsx:165](packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx#L165)                                                 |
| `grow truncate font-mono text-sm`                                                                                                                                                                                       | `span`               | —                                                              |   1 | [plugin-debug › DebugPortSettings/DebugPortSettings.tsx:82](packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx#L82)                                                 |
| `ms-1 text-subdued`                                                                                                                                                                                                     | `span`               | —                                                              |   1 | [plugin-space › SyncStatus/SyncStatus.tsx:137](packages/plugins/plugin-space/src/containers/SyncStatus/SyncStatus.tsx#L137)                                                                           |
| `mt-form-gap text-error-text`                                                                                                                                                                                           | `p`                  | —                                                              |   1 | [plugin-connector › SyncTargetsDialog/SyncTargetsDialog.tsx:167](packages/plugins/plugin-connector/src/containers/SyncTargetsDialog/SyncTargetsDialog.tsx#L167)                                       |
| `mx( 'absolute -bottom-0.5 -end-0.5 size-2 rounded-full ring-2 ring-base-surface', STATUS_RING[member.status] ?? 'bg-neutral-400', )`                                                                                   | `span`               | —                                                              |   1 | [plugin-support › DiscordPanel/DiscordComponent.tsx:189](packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx#L189)                                                       |
| `mx( 'absolute inset-(--deck-expose-gutter) z-10 cursor-pointer rounded-sm outline outline-separator transition-colors hover:outline-2', hasAttention && 'outline-2 outline-[color:var(--color-focus-ring-subtle)]', )` | `button`             | `aria-label` `onClick`                                         |   1 | [plugin-deck › Deck/DeckViewport.tsx:571](packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx#L571)                                                                                     |
| `mx( 'fixed top-2 right-2 z-[1]', hoverableControls, hoverableFocusedWithinControls, 'transition-opacity opacity-(--controls-opacity)', )`                                                                              | `div`                | —                                                              |   1 | [plugin-deck › Deck/DeckViewport.tsx:1821](packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx#L1821)                                                                                   |
| `mx( 'z-10 absolute bottom-0 inset-x-0 h-6 w-full', 'bg-gradient-to-b from-transparent to-(--surface-bg) pointer-events-none', )`                                                                                       | `div`                | —                                                              |   1 | [plugin-markdown › MarkdownCard/MarkdownCard.tsx:76](packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.tsx#L76)                                                               |
| `mx('font-["Poiret One"]', classNames)`                                                                                                                                                                                 | `span`               | `style`                                                        |   1 | [plugin-onboarding › WelcomeContainer/Welcome/Welcome.tsx:52](packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx#L52)                                             |
| `mx('min-h-0 h-full overflow-auto border-s border-separator text-sm')`                                                                                                                                                  | `div`                | —                                                              |   1 | [plugin-devtools › RegistryPanel/RegistryPanel.tsx:144](packages/plugins/plugin-devtools/src/containers/RegistryPanel/RegistryPanel.tsx#L144)                                                         |
| `mx('relative grow min-h-96', classNames)`                                                                                                                                                                              | `div`                | `ref`                                                          |   1 | [plugin-debug › Wireframe/Wireframe.tsx:26](packages/plugins/plugin-debug/src/containers/Wireframe/Wireframe.tsx#L26)                                                                                 |
| `mx(descriptionMessage, 'break-all rounded-md p-4')`                                                                                                                                                                    | `p`                  | —                                                              |   1 | [plugin-deck › Deck/PlankFallback.tsx:34](packages/plugins/plugin-deck/src/containers/Deck/PlankFallback.tsx#L34)                                                                                     |
| `my-1 border-t border-subdued-separator`                                                                                                                                                                                | `li`                 | `role` `aria-hidden`                                           |   1 | [plugin-support › DiscordPanel/DiscordComponent.tsx:229](packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx#L229)                                                       |
| `my-4`                                                                                                                                                                                                                  | `p`                  | —                                                              |   1 | [plugin-space › ImportSpaceDialog/ImportSpaceDialog.tsx:43](packages/plugins/plugin-space/src/containers/ImportSpaceDialog/ImportSpaceDialog.tsx#L43)                                                 |
| `p-1 text-sm text-description`                                                                                                                                                                                          | `span`               | —                                                              |   1 | [plugin-review › CommentsArticle/CommentsArticle.tsx:77](packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx#L77)                                                       |
| `p-2`                                                                                                                                                                                                                   | `div`                | —                                                              |   1 | [plugin-space › RenamePopover/RenamePopover.tsx:98](packages/plugins/plugin-space/src/containers/RenamePopover/RenamePopover.tsx#L98)                                                                 |
| `pb-4 text-center text-balance text-description`                                                                                                                                                                        | `p`                  | —                                                              |   1 | [plugin-support › SpaceHomeWelcome/SpaceHomeWelcome.tsx:80](packages/plugins/plugin-support/src/containers/SpaceHomeWelcome/SpaceHomeWelcome.tsx#L80)                                                 |
| `ps-1`                                                                                                                                                                                                                  | `span`               | —                                                              |   1 | [plugin-doctor › DiagnosticsPanel/DiagnosticsPanel.tsx:118](packages/plugins/plugin-doctor/src/containers/DiagnosticsPanel/DiagnosticsPanel.tsx#L118)                                                 |
| `px-1`                                                                                                                                                                                                                  | `div`                | —                                                              |   1 | [plugin-deck › Sidebar/ComplementarySidebar.tsx:175](packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx#L175)                                                               |
| `px-2 pbe-2 text-sm text-error-text`                                                                                                                                                                                    | `div`                | `role`                                                         |   1 | [plugin-atproto › PdsBrowser/PdsBrowser.tsx:260](packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx#L260)                                                                       |
| `px-trim-md py-trim-xs text-xs text-description bg-base-surface backdrop-blur-sm rounded-full shadow-md border border-separator`                                                                                        | `div`                | —                                                              |   1 | [plugin-voxel › VoxelArticle/VoxelArticle.tsx:162](packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx#L162)                                                                   |
| `relative`                                                                                                                                                                                                              | `div`                | —                                                              |   1 | [plugin-studio › GalleryArticle/GalleryArticle.tsx:36](packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx#L36)                                                           |
| `relative dx-deck-surface overflow-hidden`                                                                                                                                                                              | `div`                | `ref` `style` `onClick`                                        |   1 | [plugin-deck › Deck/DeckViewport.tsx:1727](packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx#L1727)                                                                                   |
| `relative p-2 border border-separator rounded-sm group`                                                                                                                                                                 | `div`                | —                                                              |   1 | [plugin-client › RecoveryCodeDialog/RecoveryCodeDialog.tsx:59](packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx#L59)                                           |
| `relative shrink-0`                                                                                                                                                                                                     | `div`                | —                                                              |   1 | [plugin-support › DiscordPanel/DiscordComponent.tsx:187](packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx#L187)                                                       |
| `rounded border border-separator dx-base-surface`                                                                                                                                                                       | `section`            | —                                                              |   1 | [plugin-doctor › DiagnosticsPanel/DiagnosticsPanel.tsx:186](packages/plugins/plugin-doctor/src/containers/DiagnosticsPanel/DiagnosticsPanel.tsx#L186)                                                 |
| `self-center grow ms-1`                                                                                                                                                                                                 | `span`               | —                                                              |   1 | [plugin-deck › Deck/Banner.tsx:30](packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx#L30)                                                                                                   |
| `self-center text-xs text-description hover:text-white underline underline-offset-4`                                                                                                                                    | `button`             | `type` `onClick`                                               |   1 | [plugin-onboarding › WelcomeContainer/Welcome/Welcome.tsx:503](packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx#L503)                                           |
| `size-6 rounded-full shrink-0`                                                                                                                                                                                          | `img`                | `src` `alt`                                                    |   1 | [plugin-devtools › GithubPanel/GithubComponent.tsx:141](packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx#L141)                                                         |
| `tabular-nums`                                                                                                                                                                                                          | `span`               | —                                                              |   1 | [plugin-routine › RoutineTraceCompanion/RoutineTraceCompanion.tsx:64](packages/plugins/plugin-routine/src/containers/RoutineTraceCompanion/RoutineTraceCompanion.tsx#L64)                             |
| `test.kind === 'ok' ? 'text-sm text-success' : test.kind === 'error' ? 'text-sm text-error' : 'text-sm text-description'`                                                                                               | `span`               | `role` `aria-live`                                             |   1 | [plugin-crx › CrxSettings/CrxSettings.tsx:73](packages/plugins/plugin-crx/src/containers/CrxSettings/CrxSettings.tsx#L73)                                                                             |
| `text-2xl font-semibold`                                                                                                                                                                                                | `h1`                 | —                                                              |   1 | [plugin-support › SpaceHomeWelcome/SpaceHomeWelcome.tsx:79](packages/plugins/plugin-support/src/containers/SpaceHomeWelcome/SpaceHomeWelcome.tsx#L79)                                                 |
| `text-center py-4`                                                                                                                                                                                                      | `div`                | —                                                              |   1 | [plugin-space › SchemaContainer/SchemaContainer.tsx:33](packages/plugins/plugin-space/src/containers/SchemaContainer/SchemaContainer.tsx#L33)                                                         |
| `text-description font-mono break-all`                                                                                                                                                                                  | `span`               | —                                                              |   1 | [plugin-doctor › DiagnosticsPanel/DiagnosticsPanel.tsx:225](packages/plugins/plugin-doctor/src/containers/DiagnosticsPanel/DiagnosticsPanel.tsx#L225)                                                 |
| `text-description font-normal grow text-start`                                                                                                                                                                          | `span`               | —                                                              |   1 | [plugin-navtree › CommandsTrigger/CommandsTrigger.tsx:24](packages/plugins/plugin-navtree/src/containers/CommandsTrigger/CommandsTrigger.tsx#L24)                                                     |
| `text-description text-sm`                                                                                                                                                                                              | `span`               | —                                                              |   1 | [plugin-client › RecoveryCredentialsContainer/RecoveryCredentialsContainer.tsx:102](packages/plugins/plugin-client/src/containers/RecoveryCredentialsContainer/RecoveryCredentialsContainer.tsx#L102) |
| `text-description text-sm tabular-nums`                                                                                                                                                                                 | `span`               | —                                                              |   1 | [plugin-space › TypeArticle/duplicatesGroup.tsx:204](packages/plugins/plugin-space/src/containers/TypeArticle/duplicatesGroup.tsx#L204)                                                               |
| `text-lg font-medium`                                                                                                                                                                                                   | `h2`                 | —                                                              |   1 | [plugin-commerce › SearchArticle/ResultDetail.tsx:40](packages/plugins/plugin-commerce/src/containers/SearchArticle/ResultDetail.tsx#L40)                                                             |
| `text-sm font-medium`                                                                                                                                                                                                   | `p`                  | —                                                              |   1 | [plugin-doctor › DiagnosticsPanel/DiagnosticsPanel.tsx:171](packages/plugins/plugin-doctor/src/containers/DiagnosticsPanel/DiagnosticsPanel.tsx#L171)                                                 |
| `text-sm leading-6 truncate`                                                                                                                                                                                            | `span`               | —                                                              |   1 | [plugin-devtools › GithubPanel/GithubComponent.tsx:144](packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx#L144)                                                         |
| `text-sm text-accent-text underline truncate`                                                                                                                                                                           | `a`                  | `href` `target` `rel`                                          |   1 | [plugin-commerce › SearchArticle/ResultDetail.tsx:55](packages/plugins/plugin-commerce/src/containers/SearchArticle/ResultDetail.tsx#L55)                                                             |
| `text-sm text-success-text`                                                                                                                                                                                             | `span`               | —                                                              |   1 | [plugin-atproto › PdsBrowser/PdsBrowser.tsx:222](packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx#L222)                                                                       |
| `text-sm truncate`                                                                                                                                                                                                      | `span`               | —                                                              |   1 | [plugin-support › DiscordPanel/DiscordComponent.tsx:196](packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx#L196)                                                       |
| `text-start font-mono text-xs text-description pbe-1`                                                                                                                                                                   | `h3`                 | —                                                              |   1 | [plugin-debug › StatsPanel/StatsPanel.tsx:57](packages/plugins/plugin-debug/src/containers/StatsPanel/StatsPanel.tsx#L57)                                                                             |
| `text-subdued text-sm`                                                                                                                                                                                                  | `span`               | —                                                              |   1 | [plugin-client › RecoveryCredentialsContainer/RecoveryCredentialsContainer.tsx:104](packages/plugins/plugin-client/src/containers/RecoveryCredentialsContainer/RecoveryCredentialsContainer.tsx#L104) |
| `text-subdued text-sm px-2`                                                                                                                                                                                             | `span`               | —                                                              |   1 | [plugin-chess-com › ChessGameArticle/ChessGameArticle.tsx:64](packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx#L64)                                             |
| `text-success-text`                                                                                                                                                                                                     | `span`               | —                                                              |   1 | [plugin-assistant › AssistantSettings/OllamaModels.tsx:147](packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx#L147)                                                 |
| `text-xl font-semibold`                                                                                                                                                                                                 | `h1`                 | —                                                              |   1 | [plugin-library › BookArticle/BookInfo.tsx:151](packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx#L151)                                                                         |
| `text-xs`                                                                                                                                                                                                               | `span`               | —                                                              |   1 | [plugin-status-bar › VersionNumber/VersionNumber.tsx:37](packages/plugins/plugin-status-bar/src/containers/VersionNumber/VersionNumber.tsx#L37)                                                       |
| `text-xs text-description font-normal`                                                                                                                                                                                  | `span`               | —                                                              |   1 | [plugin-onboarding › WelcomeContainer/Welcome/Welcome.tsx:744](packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx#L744)                                           |
| `text-xs text-description text-info-text`                                                                                                                                                                               | `p`                  | —                                                              |   1 | [plugin-inbox › MessageCard/MessageCard.tsx:28](packages/plugins/plugin-inbox/src/containers/MessageCard/MessageCard.tsx#L28)                                                                         |
| `text-xs text-description text-right whitespace-nowrap pe-2`                                                                                                                                                            | `span`               | —                                                              |   1 | [plugin-inbox › MessageCard/MessageCard.tsx:24](packages/plugins/plugin-inbox/src/containers/MessageCard/MessageCard.tsx#L24)                                                                         |
| `text-xs text-description truncate`                                                                                                                                                                                     | `span`               | —                                                              |   1 | [plugin-devtools › GithubPanel/GithubComponent.tsx:145](packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx#L145)                                                         |
| `text-xs text-error-text`                                                                                                                                                                                               | `p`                  | `key`                                                          |   1 | [plugin-assistant › AssistantSettings/OllamaModels.tsx:186](packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx#L186)                                                 |
| `text-xs text-rose-600`                                                                                                                                                                                                 | `p`                  | —                                                              |   1 | [plugin-doctor › DiagnosticsPanel/DiagnosticsPanel.tsx:173](packages/plugins/plugin-doctor/src/containers/DiagnosticsPanel/DiagnosticsPanel.tsx#L173)                                                 |
| `text-xs uppercase tracking-wide text-description`                                                                                                                                                                      | `h2`                 | —                                                              |   1 | [plugin-atproto › AtprotoCompanion/AtprotoCompanion.tsx:273](packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx#L273)                                               |
| `text-xs whitespace-pre-wrap overflow-auto`                                                                                                                                                                             | `pre`                | —                                                              |   1 | [plugin-payments › PaymentsSettings/PaymentsSettings.tsx:108](packages/plugins/plugin-payments/src/containers/PaymentsSettings/PaymentsSettings.tsx#L108)                                             |
| `truncate text-error-text`                                                                                                                                                                                              | `span`               | —                                                              |   1 | [plugin-assistant › AssistantSettings/OllamaModels.tsx:148](packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx#L148)                                                 |
| `uppercase tracking-widest`                                                                                                                                                                                             | `span`               | —                                                              |   1 | [plugin-onboarding › WelcomeContainer/Welcome/Welcome.tsx:819](packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx#L819)                                           |
| `w-[6rem] aspect-[2/3] shrink-0 self-start rounded object-cover`                                                                                                                                                        | `img`                | `src` `alt`                                                    |   1 | [plugin-library › BookArticle/BookInfo.tsx:144](packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx#L144)                                                                         |
| `w-4 text-xs text-center text-subdued`                                                                                                                                                                                  | `div`                | —                                                              |   1 | [plugin-client › RecoveryCodeDialog/RecoveryCodeDialog.tsx:64](packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx#L64)                                           |
| `w-6 h-6 rounded-full`                                                                                                                                                                                                  | `img`                | `src` `alt`                                                    |   1 | [plugin-support › DiscordPanel/DiscordComponent.tsx:188](packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx#L188)                                                       |
| `w-full`                                                                                                                                                                                                                | `section`            | `key`                                                          |   1 | [plugin-debug › StatsPanel/StatsPanel.tsx:56](packages/plugins/plugin-debug/src/containers/StatsPanel/StatsPanel.tsx#L56)                                                                             |
| `w-full aspect-square relative text-description`                                                                                                                                                                        | `div`                | —                                                              |   1 | [plugin-space › MembersContainer/MembersContainer.tsx:219](packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx#L219)                                                   |
| `w-full h-full border-0`                                                                                                                                                                                                | `iframe`             | `src` `title`                                                  |   1 | [plugin-library › BookArticle/BookReader.tsx:199](packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx#L199)                                                                     |
| `w-full h-full overflow-hidden`                                                                                                                                                                                         | `div`                | `ref` `role`                                                   |   1 | [plugin-library › BookArticle/EpubReader.tsx:141](packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx#L141)                                                                     |
| `w-full md:max-w-80 aspect-square relative text-description`                                                                                                                                                            | `div`                | —                                                              |   1 | [plugin-client › DevicesContainer/DevicesContainer.tsx:245](packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx#L245)                                                 |
| `w-full text-xs font-mono`                                                                                                                                                                                              | `div`                | —                                                              |   1 | [plugin-calls › CallDebugPanel/CallDebugPanel.tsx:181](packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx#L181)                                                           |

#### F. No className — 41 occurrences, 1 distinct signatures

| `className` | Elements                        | Other props                                              |   n | Example                                                                                                                             |
| ----------- | ------------------------------- | -------------------------------------------------------- | --: | ----------------------------------------------------------------------------------------------------------------------------------- |
| —           | `div` `img` `p` `span` `li` `a` | `ref` `src` `alt` `href` `target` `rel` `download` `key` |  41 | [plugin-assistant › TracePanel/TracePanel.tsx:103](packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.tsx#L103) |

## 4. Common patterns

"Today" is the literal class string as it stood before the migration; "Now" is what it became.

### P1 — Column stack · 75 occurrences · **DONE**

`flex flex-col gap-2` (22), `flex flex-col` (18), `flex flex-col gap-1` (6), `gap-6` (4), `gap-3`
(3), `gap-0.5` (3), `gap-4` (3), `gap-8` (3), `gap-form-gap` (2) …

```tsx
// Today
<div className='flex flex-col gap-2'>…</div>
// Now
<Flex column gap='sm'>…</Flex>
```

The long tail was entirely gap-value variation — nine distinct gaps for one pattern. The closed
`Gap` union (§5) is what collapses it.

### P2 — Row cluster · 67 occurrences · **DONE**

`flex` + `items-center` + `gap-2` (19 occurrences, 9 of them that exact string — the most repeated
signature in the corpus), `flex gap-2` (5), `flex justify-end` (3), `flex justify-center` (4), plus
50 near-duplicates differing only in gap, justification, or trailing padding.

```tsx
// Today
<div className='flex items-center gap-2'>…</div>
// Now
<Flex gap='sm' align='center'>…</Flex>
```

Three sites carried `flex items-center gap-2 items-center` — a duplicated class that a typed prop
makes impossible to write.

### P3 — Centered placeholder / empty state · 19 occurrences · **DONE**

Was spelled **two different ways** for the same visual result:

| Spelling                                                 |   n | Now                                              |
| -------------------------------------------------------- | --: | ------------------------------------------------ |
| `flex items-center justify-center h-full text-subdued …` |  11 | `<Flex center classNames='h-full text-subdued'>` |
| `grid place-items-center …`                              |   8 | same                                             |

Two of the eight grid spellings had **more than one child**, where `place-items-center` stacks rows
and a plain `flex` row would not — those became `<Flex column center>`
(`plugin-deck › DeckViewport`, `plugin-video › TranscriptSection`). The rest had a single child,
where the two displays are equivalent.

Still worth a dedicated `Placeholder` / `EmptyState` component: `role='status'` and the
description-text token belong with it, and the sites still disagree between `text-subdued` and
`text-description`.

### P4 — Two-track split · 16 occurrences

`grid grid-cols-[min-content_1fr]` (3), `[1fr_min-content]` (2), `[auto_minmax(0,1fr)]` (2),
`[minmax(0,1fr)_auto]` (2), `[2fr_1fr]`, `[30rem_1fr]`, `[1fr_320px]`, `[3fr_1fr_1fr_1fr]`,
`[min-content_1fr_min-content_min-content]` (2) …

```tsx
// Today
<div className={mx('h-full grid grid-cols-[2fr_1fr] overflow-hidden')}>…</div>
// Proposed
<Grid cols={['2fr', '1fr']} classNames='h-full overflow-hidden'>…</Grid>
```

**Check `Splitter` first.** `@dxos/react-ui` already ships one; several of these are static splits
that want a `Splitter` (or its non-resizable variant), not a `Grid`. The existing `Grid` primitive
takes `cols`/`rows` as _numbers_ and writes `repeat(n, 1fr)` inline — it cannot express a track list,
which is what all sixteen of these need. Arbitrary-value brackets are also the least reviewable class
in the corpus: `[minmax(0,1fr)_auto]` is unreadable where `cols={['minmax(0,1fr)', 'auto']}` is not.

### P5 — Panel-shaped row template · 6 occurrences

`grid-rows-[auto_1fr]` (2), `[1fr_min-content]`, `[1fr_auto]`, `[auto_minmax(0,1fr)_auto]`,
`[auto_auto_minmax(0,1fr)_auto]`.

**These are re-implementations of `Panel.Root`,** which is exactly an `auto 1fr auto` grid mapped to
toolbar/content/statusbar. They should not be converted to `Grid` — they should be converted to
`Panel`. Flag them as such rather than mechanically rewriting.

### P6 — Subgrid row · 5 occurrences

`col-span-full grid grid-cols-subgrid gap-2 items-center` (3), plus one in `plugin-space ›
SchemaContainer` and one carrying `grid-rows-subgrid` too.

Same caveat as P5: `Column.Row` and `Card.Row` already _are_ 3-track subgrid rows. A `Grid subgrid`
prop is worth having for the generic case, but these five sites should first be checked against the
existing parts.

### P7 — Typography / text leaves · 222 occurrences (not a layout case)

`text-description` (21), `text-sm text-description` (11), `text-xs text-description` (7), `truncate`
(7), `text-2xl` (6), `text-sm font-medium truncate` (3) … applied to `<span>` (70), `<div>` (72),
`<p>` (36), `<h1>`–`<h3>` (17), `<dt>`/`<dd>` (6).

Untouched by P1–P3, and now **68% of what is left**. It wants a `Text` primitive with `variant`
(`body` / `description` / `subdued` / `error` / `success`), `size`, and `truncate` — the same five
tokens recur in ~40 combinations.

### P8 — Positioned overlay · 14 occurrences

`absolute` / `fixed` / `sticky` + `inset-*` + `z-*`, e.g. the gradient fade in
`plugin-markdown › MarkdownCard`, the hover controls in `plugin-deck › DeckViewport`, the status dot
in `plugin-support › DiscordComponent`.

Genuinely bespoke. **Not a conversion target** — a layout primitive that also took positioning props
would be a `<div>` with extra steps.

### P9 — Key/value definition list · 9 occurrences

`<dl>` (3) / `<dt>` (3) / `<dd>` (3), two of the `<dl>`s being `grid grid-cols-[…]`. Concentrated in
`plugin-library › BookInfo` and `plugin-commerce`. A small `DescriptionList` (or a `Grid cols={2}`
convention) would settle it; low volume, low priority.

### P10 — `display: contents` · 3 occurrences

Two are ref-carrying pass-throughs — `plugin-deck › PlankControls` (`contents dx-app-no-drag`) and
`plugin-pipeline › PipelineArticle` (`contents`) — that exist only to hold a `forwardedRef` over a
`Surface`. The third, `plugin-tasks › JournalArticle`, toggles between a grid and `contents` to
collapse the wrapper conditionally (counted under `grid` in §2 because the expression also carries
grid classes).

`asChild` is the answer for the first two; a `Grid` primitive needs an explicit way to express the
third (`display='contents'`) or the conversion loses a capability.

## 5. The `Flex` primitive

[`src/primitives/Flex/Flex.tsx`](./src/primitives/Flex/Flex.tsx). Pre-existing (`column`, `grow`);
P1–P3 added `gap`, `align`, `justify`, `wrap`, and `center`. It is `slottable`, so `asChild`,
`classNames`, and `ref` forwarding were already there.

```tsx
export type FlexProps = {
  column?: boolean; // stack on the block axis
  gap?: Gap;
  align?: Align; // start | center | end | baseline | stretch
  justify?: Justify; // start | center | end | between | around | evenly
  wrap?: boolean;
  grow?: boolean; // flex-1 + overflow-hidden (pre-existing meaning, unchanged)
  center?: boolean; // align + justify center
};
```

**`gap` is normalized onto the theme spacing ramp**
([`ui-theme/src/css/theme/spacing.css`](../ui-theme/src/css/theme/spacing.css)), which is the point
of the prop. `Gap` is a closed union whose members emit the theme's own utilities, so no numeric
Tailwind literal is expressible **as a `gap` value** (`classNames` stays an unrestricted escape
hatch — the prop steers the default path, it does not fence the component):

| `gap`            | class                  | var                          |  px | replaces       |
| ---------------- | ---------------------- | ---------------------------- | --: | -------------- |
| `'none'`         | `gap-0`                | —                            |   0 | `gap-0`        |
| `'xs'`           | `gap-trim-xs`          | `--spacing-trim-xs`          |   4 | `gap-1`        |
| `'sm'`           | `gap-trim-sm`          | `--spacing-trim-sm`          |   8 | `gap-2`        |
| `'md'`           | `gap-trim-md`          | `--spacing-trim-md`          |  12 | `gap-3`        |
| `'lg'`           | `gap-trim-lg`          | `--spacing-trim-lg`          |  16 | `gap-4`        |
| `'xl'`           | `gap-trim-xl`          | `--spacing-trim-xl`          |  24 | `gap-6`        |
| `'2xl'`          | `gap-trim-2xl`         | `--spacing-trim-2xl`         |  32 | `gap-8`        |
| `'form'`         | `gap-form-gap`         | `--spacing-form-gap`         |   8 | `gap-form-gap` |
| `'form-section'` | `gap-form-section-gap` | `--spacing-form-section-gap` |  12 | —              |

This is the direction [`ui-theme/AUDIT.md`](../ui-theme/AUDIT.md) §7(c) already committed to
(_"a `p-*`/`gap-*` literal is a review defect unless annotated as intentionally off-ramp"_); the two
semantic aliases are kept distinct from their numeric equivalents so form spacing can be retuned
without touching every stack.

The union, and the `Align`/`Justify` unions, live in
[`src/primitives/layout.ts`](./src/primitives/layout.ts) so `Grid` can adopt them unchanged in P4.

Deliberate non-features:

1. **No implicit `align`.** Row-centering is the common case — 42 of the 67 rows said `items-center`
   and only 4 said anything else — but defaulting it would silently restyle any consumer relying on
   the CSS `stretch` initial value, which is exactly what a 127-site mechanical migration must not
   do. Revisit as a separate, visually-reviewed change.
2. **No padding, sizing, colour, or positioning props.** Those go through `classNames`; components
   own their own spacing, and P7/P8 are separate problems with separate answers.

## 6. What not to convert

| Bucket                          |   n | Why                                                                   |
| ------------------------------- | --: | --------------------------------------------------------------------- |
| Text/typography leaves (P7)     | 222 | Wants a `Text` primitive, not a layout one.                           |
| No `className` at all           |  40 | Mostly `<span>`/`<a>` inside `DropdownMenu.Item` slots and bare text. |
| Positioned overlays (P8)        |  14 | Bespoke; positioning is not a layout-primitive concern.               |
| Panel-shaped row templates (P5) |   6 | Already `Panel.Root`. Convert to `Panel`, not to `Grid`.              |
| Subgrid rows (P6)               |   5 | Check `Column.Row` / `Card.Row` first.                                |
| Static splits (subset of P4)    |  ~6 | Check `Splitter` first.                                               |

## 7. Remaining order

1. ~~Land `Flex` (P1 + P2)~~ — done, §8.
2. ~~`center` sweep for P3~~ — done, §8.
3. **The 23 flex-shaped sites left.** 17 want `<Flex asChild><header>…` and are mechanical but
   verbose enough to deserve a human read; 6 sit inside `mx(…)` conditionals or responsive variants
   (`plugin-onboarding › Welcome:784`, `plugin-chess › ChessArticle:97`) and must be done by hand.
   All 23 are listed in §3 under A/B.
4. ~~**Extend `Grid`**~~ — done, §9. 18 sites converted across 9 files; the rest of P4/P6 and all of
   P10 remain, and P5 still routes to `Panel` rather than `Grid`.
5. **Scope a `Text` primitive** for P7. It is bigger than everything above combined and is now most
   of the remaining corpus.
6. Re-run the extraction after each step; §1's After column is the new baseline.

## 8. What changed

**127 raw DOM wrappers converted** across 33 plugins and 64 files, plus the primitive itself.

| Step                                                                                           |   Sites |
| ---------------------------------------------------------------------------------------------- | ------: |
| P1/P2 `<div className='flex …'>` → `<Flex>` (codemod)                                          |     118 |
| P3 `grid place-items-center` → `<Flex center>` (manual)                                        |       8 |
| `plugin-status-bar › StatusBarActions` (manual — the one file with no `@dxos/react-ui` import) |       1 |
| **Total**                                                                                      | **127** |

Method: a TypeScript-AST codemod (same walk as §Method) rewrote only **string-literal** `className`
values on `<div>` elements, mapping each class to a prop and passing everything it did not recognise
through to `classNames`. It skipped any site with a responsive/state variant on a _layout_ token
(a variant on a residual class is harmless), and any `mx(…)` expression. Open/close tags were
rewritten from AST positions, so no tag can be left mismatched.

Resulting prop usage across the 132 `<Flex>` elements now in plugin containers (127 converted here,
plus 5 that already used the primitive):

| Prop         |   n | Prop      |   n |
| ------------ | --: | --------- | --: |
| `gap`        |  83 | `align`   |  34 |
| `classNames` |  69 | `center`  |  16 |
| `column`     |  66 | `justify` |  13 |
| —            |     | `wrap`    |   2 |

Gap normalization, by step: `sm` 50, `xs` 14, `md` 7, `xl` 4, `lg` 4, `2xl` 3, `form` 1.

**One deliberate visual change.** Five sites used `gap-0.5` (2px), which is off the ramp; they were
normalized up to `xs` (4px) — `plugin-commerce › ResultCard`, `plugin-doctor › DiagnosticsPanel`,
`plugin-ibkr › InstrumentArticle`, `plugin-onboarding › Welcome`,
`plugin-status-bar › VersionNumber`. Every other conversion emits the identical computed style.

Verified: `react-ui:build` plus `:build` for all 33 touched plugins. `gap-0.5` still appears four
times in containers, on elements the codemod did not touch — a `Text`/`Grid` pass will finish it.

> **Coverage caveat.** This audit covers `containers/` only. `plugins/*/src/components/**` was not
> scanned and is expected to hold a comparable or larger population of the same patterns — the
> presentational layer is where rows and stacks are densest. `Flex` is exported from
> `@dxos/react-ui`, so the same codemod applies there unchanged.

## 9. `Grid`, extended

[`src/primitives/Grid/Grid.tsx`](./src/primitives/Grid/Grid.tsx). Was `cols`/`rows` as counts only —
`repeat(n, 1fr)` — which no P4 site can use, hence its single consumer. Now:

| Added                       | Why                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| Track lists                 | `cols={['min-content', '1fr']}`. A bare number in the list reads as `<n>fr` (`[2, 1]`).   |
| `cols`/`rows` = `'subgrid'` | Adopts the parent tracks and spans them (`col-span-full`), which is the only useful form. |
| `gap`                       | Reuses `Gap`/`gapClasses` from `layout.ts`, so grids land on the ramp like flexes.        |
| `align`, `center`           | `items-*` and `place-items-center`, the two P6 rows carry.                                |
| `contents`                  | `display: contents` for the conditional-collapse case (P10).                              |
| `asChild`                   | Was `composable` (leaf); now `slottable`, like `Flex` and `Container`.                    |

**One behavior change:** `overflow-hidden` is no longer unconditional — it now comes only with `grow`
(via `dx-container`, which already clips). A converted wrapper must not silently start cutting off
focus rings and popovers that a plain `<div>` let through. Conversions therefore pass `grow={false}`
unless the original carried `dx-container`.

### Converted (18 sites, 9 files)

| File                                | Sites | Note                                                                                     |
| ----------------------------------- | ----: | ---------------------------------------------------------------------------------------- |
| `plugin-space › SyncStatus`         |     5 | P4 outer + 3 P6 subgrid rows; track list hoisted to a const so the two stay in lockstep. |
| `plugin-chess › Info`               |     2 | `PlayerIndicator` carried both `grid` and `flex` — the `flex` was dead and is gone.      |
| `plugin-script › TestPanel`         |     2 | Shared rail-item track list.                                                             |
| `plugin-code › CodeArticle`         |     2 | Nested `[30rem_1fr]` / `[1fr_2fr]`, both already `dx-container`.                         |
| `plugin-registry › PluginDetail`    |     2 |                                                                                          |
| `plugin-review › ReviewStoryLayout` |     2 | Inner grid dropped an inline `gridTemplateRows` style.                                   |
| `plugin-commerce › ResultDetail`    |     1 |                                                                                          |
| `plugin-magazine › PostCard`        |     1 |                                                                                          |
| `plugin-routine › TemplateForm`     |     1 |                                                                                          |

Verified: `react-ui` + all 9 plugins build; `:lint` clean; `PluginDetail` and `Chessboard` stories
render unchanged (the chess moves row still computes `48px 84px 84px 16px`, gap `8px`, and
`overflow: visible`).
