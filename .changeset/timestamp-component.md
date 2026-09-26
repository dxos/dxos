---
'@dxos/react-ui-task': patch
'@dxos/react-ui': minor
---

`Timestamp` shows an instant in the room a column has — `now`, minutes to two hours, hours to a day, then a calendar date — and carries the full instant in a tooltip, since everything it shows is lossy by design.

Minutes run past the hour because `90m` is a duration a reader feels where `1.5h` is one they compute. It counts live, scheduling each tick for the moment its value changes rather than on a fixed interval: a minute counter wakes once a minute, an hour counter once an hour, and a calendar date never wakes at all — a row that says `1m` ten minutes later is worse than no counter, because the reader believes it.

A task's activity log renders its entries with it, in place of the "about 2 hours ago" that a log column has no width for.
