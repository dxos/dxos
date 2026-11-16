---
'@dxos/react-ui-rdf': minor
---

The entity browser and the fact viewer load their rows a window at a time as they scroll: each takes a source (`EntitySource`, `FactSource`) that answers a window of rows with the total, and each row's details (a card's facts, a subject's group) load when its page comes into view. `storeEntitySource` and `storeFactSource` read a windowed fact store, filtering and counting in the store; `memoryEntitySource` and `memoryFactSource` serve the same windows from memory, so `cards` and `facts` props keep working. Lists render only the rows near the viewport, measured as they scroll in, and stale pages are dropped when a filter changes. The entity browser's first column gains a row of type toggles, one per entity class with its count, most common first; the rest fold into a menu. New exports: `VirtualList`, `TypeFilter`, `useWindowedRows`, `entityTypeCounts` and the sources.
