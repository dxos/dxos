---
'@dxos/diagram': minor
---

`MermaidEngine` lays out diagrams several times faster: the edge router's search uses typed arrays and an arrival-aware turn estimate, and candidates whose inheritance bus would draw nothing are no longer routed twice. Routes keep their optimal cost, though ties between equal-cost routes can now resolve differently. A new `emitCandidate` option, with `emitJob`, lets a caller route candidates on worker threads.
