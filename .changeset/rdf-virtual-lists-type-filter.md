---
'@dxos/react-ui-rdf': minor
---

The entity browser, the fact viewer's list and other long fact lists render only the rows near the viewport, measuring each card as it scrolls in, so stores of thousands of entities stay fast. The entity browser's first column gains a row of type toggles, one per entity class with its count, most common first; the rest fold into a menu. New exports: `VirtualList`, `TypeFilter` and `entityTypeCounts`.
