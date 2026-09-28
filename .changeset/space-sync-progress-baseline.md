---
'@dxos/plugin-client': patch
---

The space sync meter counts the run rather than the space: it opens at zero with the backlog as its total, and its ETA divides the run's elapsed time by what the run has synced. A monitor that opened at 5,020 of 5,021 used to sit at the end of its bar with an ETA of zero.
