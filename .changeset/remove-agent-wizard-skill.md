---
'@dxos/assistant-toolkit': minor
'@dxos/plugin-assistant': minor
---

Removed the Agent Wizard skill. `AgentWizardSkill`, `AgentWizardHandlers` and `AgentWizardOperations` are gone from `@dxos/assistant-toolkit`, and the skill is no longer contributed or bound into new chats by `@dxos/plugin-assistant`.

Its wizard-only tools (`org.dxos.operation.assistantToolkit.createAgent`, `org.dxos.operation.assistantToolkit.getAgentRules`) are removed with it — agent creation is now a UI action. `SyncAutomation` (`org.dxos.operation.assistantToolkit.syncTriggers`) is unchanged and keeps its key, but now lives in the agent skill: reach it via `AgentSkillOperations.SyncAutomation` and register `AgentSkillHandlers`.
