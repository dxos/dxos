---
'@dxos/plugin-assistant': patch
---

Inline chat prompts now report their completed flow back to the agent as a synthetic turn, so the conversation resumes instead of stalling on a click the agent cannot observe: connecting a service reports the connector and the new credential's URI once it is in the space, and enabling a plugin reports the plugin.
