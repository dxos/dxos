---
'@dxos/echo': minor
'@dxos/plugin-markdown': minor
---

The project timeline is two columns: lane names and the chart. A lane's token and tool counts move into a hover card over its name, and a new `Gantt.LegendToggle` beside the axis switch shows the counts in that column instead (`legend` / `onLegendChange` on `Gantt.Root`, persisted with the project view). The chart scrolls both ways in one area with the horizontal scrollbar at the panel's foot, and is keyboard-navigable: clicking a node focuses the chart, the arrow keys move between lanes and along the timeline, and Space toggles the node's card (Enter selects it). A parent task's bar no longer starts after its sub-tasks'. In a flat deck, a plank's breadcrumbs show its place in the tree (e.g. a session's project and Sessions branch) rather than the navigation history.

**Breaking:** `Gantt.Meta` is removed (its content is the legend's hover card and stats mode), and `Gantt.Chart`'s ref is now the `svg` element.
