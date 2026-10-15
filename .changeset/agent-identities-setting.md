---
'@dxos/plugin-agent': minor
---

Settings › Plugins › Agent › "Create identities for agents" (`AgentSettings.Settings.identities`) is off by default. With it on, Settings › Agents › Add agent gives the new agent its identity on EDGE, and opening an agent finishes, for its creator, a join whose retries all failed. With it off, agents are created as before.
