# Empty-list placeholder audit

Many list/collection containers across the plugins hand-roll the same branch: when the backing
collection is empty, render a placeholder/empty message; otherwise render the list. The canonical
example is `MasterDetail` (plugin-routine), which checks `items.length === 0` and shows an
`emptyLabel`, otherwise rendering an `OrderedList.Root`:

```tsx
// packages/plugins/plugin-routine/src/components/MasterDetail/MasterDetail.tsx
{(onCreate || emptyLabel) && (
  <div ...>{items.length === 0 ? emptyLabel : null}...</div>
)}
{items.length > 0 && (
  <OrderedList.Root items={items}>...</OrderedList.Root>
)}
```

This document catalogs every occurrence of that pattern so a reusable empty-state affordance can be
designed in `@dxos/react-ui-list` (e.g. an `Empty` slot, or an `emptyLabel`/`empty` prop on the list
roots) and the ad-hoc copies retired.

Each row records the **package**, the **container/component** that owns the empty-check, and the
**list component** that consumes the non-empty collection (the thing a shared empty-state would wrap
or sit beside).

## Matches

| Package                | Container / component file                                                                                                                   | Component                      | List component (non-empty)    | Items                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------- | -------------------------------------------------- |
| @dxos/plugin-assistant | [Chat.tsx](../../plugins/plugin-assistant/src/components/Chat/Chat.tsx)                                                                      | `Chat`                         | inline conditionals           | chat messages (feed / pending)                     |
| @dxos/plugin-assistant | [ChatMcpErrors.tsx](../../plugins/plugin-assistant/src/components/ChatPrompt/ChatMcpErrors.tsx)                                              | `ChatMcpErrors`                | inline `.map()`               | MCP server connection failures                     |
| @dxos/plugin-client    | [InvitationsContainer.tsx](../../plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx)                         | `InvitationsContainer`         | `List` (conditional sections) | available / redeemed invitations                   |
| @dxos/plugin-client    | [RecoveryCredentialsContainer.tsx](../../plugins/plugin-client/src/containers/RecoveryCredentialsContainer/RecoveryCredentialsContainer.tsx) | `RecoveryCredentialsContainer` | `List`                        | recovery credentials                               |
| @dxos/plugin-code      | [BuildOutput.tsx](../../plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx)                                                      | `DiagnosticsList`              | inline `.map()`               | build diagnostics                                  |
| @dxos/plugin-code      | [BuildOutput.tsx](../../plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx)                                                      | `ConsoleView`                  | inline `.map()`               | console output lines                               |
| @dxos/plugin-code      | [FileTree.tsx](../../plugins/plugin-code/src/components/FileTree/FileTree.tsx)                                                               | `FileTree`                     | inline `.map()`               | source files                                       |
| @dxos/plugin-comments  | [CommentsArticle.tsx](../../plugins/plugin-comments/src/containers/CommentsArticle/CommentsArticle.tsx)                                      | `CommentsArticle`              | inline `.map()`               | comment threads                                    |
| @dxos/plugin-commerce  | [SearchArticle.tsx](../../plugins/plugin-commerce/src/containers/SearchArticle/SearchArticle.tsx)                                            | `SearchArticle`                | `Masonry.Root`                | search results                                     |
| @dxos/plugin-commerce  | [ProviderArticle.tsx](../../plugins/plugin-commerce/src/containers/ProviderArticle/ProviderArticle.tsx)                                      | `ProviderArticle`              | inline `.map()`               | search schema fields                               |
| @dxos/plugin-connector | [ConnectorPicker.tsx](../../plugins/plugin-connector/src/components/ConnectorPicker/ConnectorPicker.tsx)                                     | `ConnectorPicker`              | `Listbox.Root`                | reusable connections                               |
| @dxos/plugin-connector | [ConnectionView.tsx](../../plugins/plugin-connector/src/components/ConnectionView/ConnectionView.tsx)                                        | `ConnectionView`               | `Listbox`-like / inline       | sync bindings                                      |
| @dxos/plugin-connector | [ConnectionSettingsArticle.tsx](../../plugins/plugin-connector/src/containers/ConnectionSettingsArticle/ConnectionSettingsArticle.tsx)       | `ConnectionSettingsArticle`    | `Listbox.Root`                | persisted connections                              |
| @dxos/plugin-deck      | [DeckLayout.tsx](../../plugins/plugin-deck/src/containers/DeckLayout/DeckLayout.tsx)                                                         | `DeckLayout`                   | `Deck.MultiMode`              | active plank items                                 |
| @dxos/plugin-gallery   | [Lightbox.tsx](../../plugins/plugin-gallery/src/components/Lightbox/Lightbox.tsx)                                                            | `LightboxViewport`             | `Masonry.Root`                | gallery image refs                                 |
| @dxos/plugin-inbox     | [CalendarArticle.tsx](../../plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx)                                         | `CalendarArticle`              | `EventStack`                  | calendar events                                    |
| @dxos/plugin-inbox     | [MailboxArticle.tsx](../../plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx)                                            | `MailboxArticle`               | `MessageStack`                | mailbox messages                                   |
| @dxos/plugin-inbox     | [DraftsArticle.tsx](../../plugins/plugin-inbox/src/containers/DraftsArticle/DraftsArticle.tsx)                                               | `DraftsArticle`                | `MessageStack`                | draft messages                                     |
| @dxos/plugin-kanban    | [KanbanBoard.tsx](../../plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.tsx)                                                    | `KanbanBoardRoot`              | `Board.Root`                  | kanban columns                                     |
| @dxos/plugin-magazine  | [MagazineArticle.tsx](../../plugins/plugin-magazine/src/containers/MagazineArticle/MagazineArticle.tsx)                                      | `MagazineArticle`              | `Masonry.Root`                | magazine tiles                                     |
| @dxos/plugin-preview   | [PersonCard.tsx](../../plugins/plugin-preview/src/cards/PersonCard.tsx)                                                                      | `PersonCard`                   | inline `.map()`               | person email addresses                             |
| @dxos/plugin-registry  | [BaseRegistryArticle.tsx](../../plugins/plugin-registry/src/containers/BaseRegistryArticle/BaseRegistryArticle.tsx)                          | `BaseRegistryArticle`          | `PluginList`                  | filtered plugin list                               |
| @dxos/plugin-registry  | [PluginDetail.tsx](../../plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx)                                               | `PluginDetail`                 | inline `.map()` (×4)          | screenshots / dependencies / dependents / versions |
| @dxos/plugin-routine   | [MasterDetail.tsx](../../plugins/plugin-routine/src/components/MasterDetail/MasterDetail.tsx)                                                | `MasterDetail`                 | `OrderedList.Root`            | **canonical reference** — selectable master list   |
| @dxos/plugin-routine   | [RoutineHistory.tsx](../../plugins/plugin-routine/src/containers/RoutineHistory/RoutineHistory.tsx)                                          | `RoutineHistory`               | `List`                        | routine execution history                          |
| @dxos/plugin-sample    | [RelatedItemsList.tsx](../../plugins/plugin-sample/src/components/RelatedItemsList.tsx)                                                      | `RelatedItemsList`             | `List`                        | related items                                      |
| @dxos/plugin-search    | [SearchDialog.tsx](../../plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx)                                                 | `SearchDialog`                 | `SearchList`                  | search results                                     |
| @dxos/plugin-sheet     | [RangeList.tsx](../../plugins/plugin-sheet/src/containers/RangeList/RangeList.tsx)                                                           | `RangeList`                    | `OrderedList.Root`            | named ranges                                       |
| @dxos/plugin-sidekick  | [ActionItems.tsx](../../plugins/plugin-sidekick/src/components/ActionItems.tsx)                                                              | `ActionItems`                  | inline `ul > li` `.map()`     | action items                                       |
| @dxos/plugin-sidekick  | [ProfileGrid.tsx](../../plugins/plugin-sidekick/src/components/ProfileGrid.tsx)                                                              | `ProfileGrid`                  | inline grid `.map()`          | user profiles                                      |
| @dxos/plugin-space     | [ObjectCardStack.tsx](../../plugins/plugin-space/src/containers/ObjectCardStack/ObjectCardStack.tsx)                                         | `ObjectCardStack`              | `Mosaic.Stack`                | selected objects                                   |
| @dxos/plugin-space     | [SchemaContainer.tsx](../../plugins/plugin-space/src/containers/SchemaContainer/SchemaContainer.tsx)                                         | `SchemaContainer`              | inline `.map()`               | schemas                                            |
| @dxos/plugin-space     | [TypeCollectionArticle.tsx](../../plugins/plugin-space/src/containers/TypeCollectionArticle/TypeCollectionArticle.tsx)                       | `TypeCollectionArticle`        | `Masonry.Viewport`            | type collection objects                            |
| @dxos/plugin-trip      | [BookingSearch.tsx](../../plugins/plugin-trip/src/containers/BookingSearch/BookingSearch.tsx)                                                | `BookingSearch`                | `OfferStack`                  | flight offers                                      |

## Summary

- **34 occurrences** across **16 packages**.
- Non-empty consumers cluster into: `OrderedList.Root` (2), `List` (3), `Masonry` (4), `Listbox.Root` (2),
  domain stacks (`MessageStack`/`EventStack`/`OfferStack`/`Mosaic.Stack`/`Deck`/`Board`), and a long tail of
  **inline `.map()`** (~11) with bespoke empty markup.
- The inline-`.map()` cases and the `OrderedList`/`List` cases are the strongest candidates for a shared
  empty-state affordance in `@dxos/react-ui-list`; domain stacks (inbox, trip, kanban) may want the same
  prop surface but render their own item components.

> Audit method: grep for `length === 0` / `length > 0` / `!…​.length` / `emptyLabel` / `no-*.message` /
> `empty` across `packages/plugins/**`, then per-file confirmation that the check selects between an
> empty placeholder and a list render. Pure guards, loading states, counts, and scalar checks were excluded.
