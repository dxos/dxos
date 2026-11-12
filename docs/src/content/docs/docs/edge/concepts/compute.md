---
title: Compute
description: Functions, triggers, agents and the plugin registry.
---

EDGE runs code against a space while the user's devices are offline: functions that triggers start, agents that work
through a task, and the builds behind the plugin registry.

## Model

**Functions.** A function is an operation deployed to EDGE. It runs with access to the space it was deployed for, and
reads and writes it like a device would.

**Triggers.** A trigger starts a function when something happens:

| Kind           | Fires when                                     |
| -------------- | ---------------------------------------------- |
| `timer`        | A cron schedule comes round                    |
| `subscription` | Objects matching a query are created or change |
| `feed`         | A feed receives a new item                     |
| `email`        | An email arrives at the space's address        |
| `webhook`      | An HTTP request arrives at the trigger's URL   |
| `direct`       | Something invokes it by name                   |

**Agents.** An agent process runs on EDGE with an identity of its own, works through a task over many steps, and keeps a
memory of what it has learned. It calls models through the AI service, which gives agents and the Composer assistant one
way to reach every model provider.

**Sandbox builds and the registry.** When a plugin is published, EDGE can build it in a sandbox with the `@dxos/*`
packages installed. The registry service indexes published plugins and hosts their bundles, which Composer loads. See
[Publishing plugins](/docs/plex/publishing-plugins/).

## Behavior

- Functions and agents act through the same APIs as a device. Their changes replicate to members like anyone else's.
- A trigger fires on EDGE whether or not any device is online.

## Limits

- Compute reads space content, so it runs only for spaces that replicate through EDGE.
- The AI service sends prompts and space content to the model provider a request names.
