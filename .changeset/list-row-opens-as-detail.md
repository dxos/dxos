---
'@dxos/app-toolkit': minor
'@dxos/plugin-deck': minor
---

A list row now opens as its plank's detail: `LayoutOperation.Open` takes `disposition: 'detail'` with a `pivotId`, and the deck shows the detail in a companion tab beside the list when the deck is flattened, as a plank that replaces the pivot's previous detail when it is not, or pushed onto the stack on mobile. A detail is a named plank under a name the deck derives from the pivot, and `Open`'s `name` still reuses the plank holding a name when adding one, unless Shift asks for a new plank. The companion tab is labelled from the detail node's `typeLabel` property or its object's type (`AppNode.getTypeLabel`), and the detail shares its host plank's attention like any companion.

Breaking: `DeckSpec`, `AppAnnotation.DeckAnnotation`, the `deck` option on `TypeSection`, `DeckSeed` and collection seeding are removed, along with the `root` and `level` fields on `Open`. `useDetailNavigation` takes only `contextId` and `getPath`, and lists in plugin-inbox, plugin-tasks and plugin-projects no longer contribute their own detail companions.
