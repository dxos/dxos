//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Feed } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { scaffoldProject } from '@dxos/plugin-projects/templates';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import { Outline, TaskSet } from '@dxos/types';
import { trim } from '@dxos/util';

export const VOYAGE_SPACE_ID = 'com.example.space.voyage';

/**
 * Distinctive directives so a play function (or a human) can tell instructed behavior from chance:
 * every reply ends in AHOY, and `$track` has one exact output.
 */
const PROJECT_INSTRUCTIONS = trim`
  You are the assistant for the "Voyage" project.
  Always end every reply with the single word AHOY.
`;

const PROJECT_COMMANDS = [
  {
    sentinel: '$track',
    description: 'Track a follow-up item',
    prompt: 'Reply with exactly "TRACKED: <item>" where <item> is the text after the sentinel, then stop.',
  },
];

/**
 * The story's own space template: the smallest space a project chat needs — one project whose
 * instructions have an unmistakable effect on a reply, plus the mailbox that stands in for the
 * external data the richer sample spaces carry.
 */
export const voyageSpace: SpaceCapabilities.SpaceTemplate = {
  id: VOYAGE_SPACE_ID,
  label: 'Voyage',
  description: 'One project whose instructions steer every reply, and an empty mailbox.',
  icon: 'ph--boat--regular',
  apply: async ({ client, space }) => {
    await client.addTypes([
      Project.Project,
      Instructions.Instructions,
      TaskSet.TaskSet,
      Outline.Outline,
      Mailbox.Mailbox,
      Feed.Feed,
    ]);
    space.db.add(Mailbox.make({ name: 'Clients' }));
    // Parented by the scaffold, so the single add cascades the instructions, task set and outline.
    space.db.add(
      scaffoldProject({
        name: 'Voyage',
        description: 'Project chat-binding test fixture.',
        text: PROJECT_INSTRUCTIONS,
        commands: PROJECT_COMMANDS,
      }),
    );
  },
};

/** Contributes {@link voyageSpace} alongside the sample spaces plugin-debug contributes. */
const VoyageSpacePluginBuilder = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('com.example.plugin.voyageSpace'),
    name: 'Voyage Space',
  }),
).pipe(
  Plugin.addModule({
    id: 'com.example.plugin.voyageSpace.module.template',
    provides: [SpaceCapabilities.SpaceTemplate],
    activate: () => Effect.succeed([Capability.contribute(SpaceCapabilities.SpaceTemplate, voyageSpace)]),
  }),
);

export const VoyageSpacePlugin = Plugin.make(VoyageSpacePluginBuilder)();
