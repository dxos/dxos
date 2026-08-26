//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { RegistryOperation } from '@dxos/plugin-registry/operations';
import { trim } from '@dxos/util';

export const key = 'org.dxos.skill.pluginManager';

/**
 * The verbs the skill projects as tools. Their handlers live in the registry plugin, so both are
 * absent unless it is active — which is also why the skill reads the host rather than a fixed list.
 */
export const operations = [RegistryOperation.QueryPlugins, RegistryOperation.EnablePlugins];

/** The Plugin Manager skill: discover what this host has installed and turn plugins on. */
export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Plugin Manager',
    description: 'Discover installed plugins — enabled or not — and enable the ones a task needs.',
    agentCanEnable: true,
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        This app is assembled from plugins, so what it can do is a property of the host rather than a
        fixed set. A plugin that is installed but disabled contributes nothing: its operations, types
        and skills are absent until it is enabled and activates.

        # Working with plugins
        - Call [query-plugins] to read the installed set. Omit the filter to see disabled plugins
          too — those are exactly the ones a missing capability is usually hiding behind.
        - When a task needs a capability this host is not currently offering, look for a disabled
          plugin that provides it and call [enable-plugins] with its id.
        - Tell the user which plugin you are turning on and why before you enable it; enabling
          changes their workspace, and its dependencies come on with it.
        - Enabling reports the ids that came on, plus anything rejected with a reason. An id the host
          does not have installed cannot be enabled from here — say so rather than retrying.
        - A plugin's tools do not appear until it activates. Re-read [query-plugins] to confirm
          \`active\`, and do not promise a capability whose plugin is enabled but not yet active.
        - Core plugins are always on and cannot be disabled, so never offer to turn one off.
      `,
    }),
  });

const skill: Skill.Definition = {
  key,
  make,
};

export default skill;
