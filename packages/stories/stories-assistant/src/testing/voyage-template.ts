//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import { scaffoldProject } from '@dxos/plugin-projects/templates';
import { trim } from '@dxos/util';

export const VOYAGE_TEMPLATE_ID = 'com.example.project.voyage';

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
 * The story's own project template: instructions whose effect on a reply is unmistakable, so a
 * chat bound to this project proves the instructions reached the system prompt. Subject-free, so it
 * is offered whatever the story seeds.
 */
export const voyageTemplate: ProjectCapabilities.Template = {
  id: VOYAGE_TEMPLATE_ID,
  label: 'Voyage',
  icon: 'ph--boat--regular',
  scaffold: ({ name }) =>
    Effect.succeed(
      scaffoldProject({
        name: name ?? 'Voyage',
        description: 'Project chat-binding test fixture.',
        text: PROJECT_INSTRUCTIONS,
        commands: PROJECT_COMMANDS,
      }),
    ),
};

/** Contributes {@link voyageTemplate} alongside the templates the real plugins contribute. */
const VoyageTemplatePluginBuilder = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('com.example.plugin.voyageTemplate'),
    name: 'Voyage Template',
  }),
).pipe(
  Plugin.addModule({
    id: 'com.example.plugin.voyageTemplate.module.template',
    provides: [ProjectCapabilities.Template],
    activate: () => Effect.succeed([Capability.contribute(ProjectCapabilities.Template, voyageTemplate)]),
  }),
);

export const VoyageTemplatePlugin = Plugin.make(VoyageTemplatePluginBuilder)();
