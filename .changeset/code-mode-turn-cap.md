---
'@dxos/agent-code-mode': patch
---

Code mode now caps a request at 25 model turns by default (`maxTurns`); past the cap the model gets one call without tools to write its answer, so an agent retrying a failing `eval` no longer runs until the platform kills it. The Skill Manager's `queryTypes` lists the skills that manage a type (`skills`), so a model creates a project with `projects-create` instead of building it by hand.
