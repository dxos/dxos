---
'@dxos/react-ui-trace': minor
'@dxos/compute': minor
'@dxos/plugin-projects': patch
---

The Gantt speaks its own vocabulary — groups, lanes, segments and markers — and no longer knows what it is charting; `sessionTimelineToGantt` maps a session timeline onto it, mapping a process to a band, a task to a lane, and a delegation to the node it opened out of. `GanttLane`'s three references are now distinct (`groupId` is which band, `parentId` is what it nests under, `openedFrom` is what caused it), where one overloaded `parentId` previously carried all three and made a task hierarchy and a process tree mutually exclusive. A lane owns `segments` rather than one interval, so work in bursts draws as several bars with the idle gaps left empty.

`axis: 'event'` measures the axis in events rather than duration — one fixed step each, so a burst and a lull read alike and an event already drawn never moves, which is what makes a live chart watchable. It is now the default. `animate` slides an arriving event out of the one before it and grows its lane's bar to meet it, and the chart follows the live edge with an eased drift while the reader is at it.

`Trace.DelegationCompleted` records that a delegated sub-agent reported back — the counterpart of `DelegationSpawned`, and the only durable evidence the return happened, since a child's own trace ends with its operation. The timeline turns it into `returnedTo`, and the chart draws it as `closedInto`.

Breaking for `@dxos/react-ui-trace`: `GanttLane` drops `kind`, `taskId`, `start`/`end`, `tokens` and `toolCalls` (use `segments` and the opaque `meta`), `GanttMarker.kind` is an uninterpreted string, `Gantt.Root` takes `groups`, and `Gantt.Chart` forwards its ref to a `ScrollArea` rather than the `svg`.
