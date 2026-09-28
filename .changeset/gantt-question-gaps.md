---
'@dxos/react-ui-trace': patch
---

A task lane breaks where its task was put down and picked up again, so a question and the work after its answer draw as separate runs with the wait between them left open. `Lane` gains optional `gaps`, which the Gantt mapping splits the lane's segments around.
