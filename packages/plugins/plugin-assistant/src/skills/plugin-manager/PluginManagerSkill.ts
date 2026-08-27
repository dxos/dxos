//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { DXN } from '@dxos/keys';
import { RegistryOperation } from '@dxos/plugin-registry/operations';
import { trim } from '@dxos/util';

export const key = 'org.dxos.skill.pluginManager';

/**
 * Read-only: the skill may inspect the host but never change it. Enabling a plugin reshapes the
 * user's workspace, so it is offered as a `plugin-prompt` surface the user clicks instead of a tool
 * the agent can call.
 *
 * `QueryDisabledPlugins` is deliberately absent: it reaches the agent as a template input, so
 * projecting it as a tool as well would offer a call the instructions go on to prohibit.
 */
export const operations = [RegistryOperation.QueryPlugins];

/** The Plugin Manager skill: discover installed plugins and offer the disabled ones to the user. */
export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Plugin Manager',
    description:
      'Search the installed plugins — enabled or not — for the ones best suited to a task, and offer to enable them.',
    agentCanEnable: true,
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        This app is assembled from plugins, so what it can do is a property of the host rather than a
        fixed set. A plugin that is installed but disabled contributes nothing: its operations, types
        and skills are absent until it is enabled and activates.

        The list below is this host's disabled plugins — rendered fresh into this prompt, so do NOT
        call [query-disabled-plugins] to obtain it.

        <disabled_plugins>
        {{#each disabled.plugins}}
        - {{id}}{{#if name}} "{{name}}"{{/if}}{{#if description}} -- {{description}}{{/if}}
        {{/each}}
        </disabled_plugins>

        # Working with plugins
        - When a request implies a capability — a board, a spreadsheet, a diagram, a mailbox — look
          for the plugin that provides it BEFORE reaching for a generic tool. Read the list above,
          and call [query-plugins] when the request does not obviously match one of its entries:
          the installed set is the catalogue of what this app could do for the task, and the best
          plugin for the job is often one the user has never turned on.
        - You CANNOT enable a plugin yourself. Enabling changes the user's workspace, so it is always
          their decision, taken by clicking the prompt described below.
        - Before creating an object whose editor comes from a plugin in that list, STOP. Creating it
          through a generic database tool succeeds and leaves the user an object they cannot open or
          use — a kanban board they cannot drag cards on, a document they cannot type in. Offer the
          plugin first and create the object only once it is enabled.
        - To offer one, DO NOT fail, refuse, or apologise. Emit a self-closing surface tag with the
          'plugin-prompt' role and the plugin's id:

          <surface role='plugin-prompt' data='{"plugin":"org.dxos.plugin.kanban"}' />

          Use the id exactly as the list above spells it. Emit the surface once per plugin, then
          briefly say what enabling it would let you do.
        - Call [query-plugins] to search the whole installed set, or to re-read state after the
          user has enabled something. A plugin's tools appear only once it activates, so confirm
          \`active\` there rather than assuming the capability is ready.
        - A plugin the host does not have installed at all cannot be enabled — say so instead of
          prompting for it.
        - Core plugins are always on and cannot be disabled, so never offer to turn one off.
      `,
      inputs: [
        {
          name: 'disabled',
          kind: 'operation',
          operation: DXN.getName(RegistryOperation.QueryDisabledPlugins.meta.key),
        },
      ],
    }),
  });

const skill: Skill.Definition = {
  key,
  make,
};

export default skill;
