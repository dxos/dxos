//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { RegistryOperation } from '#operations';

export const key = 'org.dxos.skill.registry';

/**
 * The skill's verbs; listing them here is what makes them reachable (the skill definition is the
 * atomic unit of projection).
 *
 * There is deliberately no operation-listing verb: an MCP host discovers operations through
 * `queryOperations`, which reads the same registry and serves schemas as well, and an in-app agent
 * is handed its skill's tools directly. A second listing would answer the same question in a
 * different shape.
 */
export const operations = [RegistryOperation.QueryPlugins];

/** The Registry skill: its verbs, instructions, and the tool definitions they project as. */
export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Registry',
    description: 'Discover what this host has installed: which plugins are present, enabled and active.',
    agentCanEnable: true,
    mcpPrompt: true,
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        This host is assembled from plugins. What it can do depends on which of them are installed
        and active, so read the registry rather than assuming a fixed set of verbs.

        # Orientation
        - Query the plugins to see what is installed. An enabled plugin that is not yet active
          contributes nothing, so its operations, types and skills are absent until it activates.
        - Use this to explain what a host supports, or to diagnose a verb that is missing — the
          usual cause is a plugin that is installed but disabled.
        - What can actually be invoked is a separate question: search the operations themselves,
          which is where descriptions and input schemas live.
      `,
    }),
  });
