---
'@dxos/plugin-projects': minor
---

Tasks can be claimed by a coding-agent session in one call: `tasks-update` takes `remoteSession: { sessionId, title?, repo?, branch?, worktree? }`, resolves the session record for that harness id in the task's space — creating it when the space holds none — and assigns the task to it. The assignee carries a `subject` ref to the session, so a session's check-in can list the tasks that particular run holds; a bare `{ role: 'assistant' }` could only say that _an_ assistant owned it.

A task row's menu gains **Copy prompt**: it renders the task, its addresses (task, task set, project, space) and the project's context as one self-contained prompt for an agent working outside the app, copies it to the clipboard, and tells the agent to claim the task with that single call. Available as the `org.dxos.operation.projects.copyTaskPrompt` operation. Space content the prompt quotes — the task's title and description, the project's name, description and instructions — is rendered inside a dynamically sized code fence and labelled as data, so text a collaborator wrote cannot pose as instructions to the agent that receives the prompt.
