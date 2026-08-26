//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { RegistryOperation } from '@dxos/plugin-registry/operations';
import { trim } from '@dxos/util';

export const key = 'org.dxos.skill.pluginManager';

/**
 * Read-only: the skill may inspect the host but never change it. Enabling a plugin reshapes the
 * user's workspace, so it is offered as a `plugin-prompt` surface the user clicks instead of a tool
 * the agent can call.
 */
export const operations = [RegistryOperation.QueryPlugins];

/** The Plugin Manager skill: discover installed plugins and offer the disabled ones to the user. */
export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Plugin Manager',
    description: 'Discover installed plugins — enabled or not — and offer to enable the ones a task needs.',
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
        - You CANNOT enable a plugin yourself. Enabling changes the user's workspace, so it is
          always their decision, taken by clicking the prompt described below.
        - When a task needs a capability an installed-but-disabled plugin provides, DO NOT fail,
          refuse, or apologize. Render a plugin prompt so the user can enable it inline. Emit a
          self-closing surface tag with the 'plugin-prompt' role and the plugin's id:

          <surface role='plugin-prompt' data='{"plugin":"org.dxos.plugin.markdown"}' />

          Use the id exactly as [query-plugins] reported it. Emit the surface once per plugin, then
          briefly say what enabling it would let you do.
        - A plugin the host does not have installed cannot be enabled at all — say so instead of
          prompting for it.
        - A plugin's tools do not appear until it activates, so after the user enables one, re-read
          [query-plugins] to confirm \`active\` rather than assuming the capability is ready.
        - Core plugins are always on and cannot be disabled, so never offer to turn one off.
      `,
    }),
  });

const skill: Skill.Definition = {
  key,
  make,
};

export default skill;
