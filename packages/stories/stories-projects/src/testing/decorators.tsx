//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvents, Capabilities, Capability, type Plugin } from '@dxos/app-framework';
import { Plugin as PluginBuilder } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Instructions, Project, Routine, Trigger } from '@dxos/compute';
import { Collection, type Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Mailbox } from '@dxos/plugin-inbox';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import { ProjectsPlugin } from '@dxos/plugin-projects/plugin';
import { translations as projectsTranslations } from '@dxos/plugin-projects/translations';
import { RoutinePlugin } from '@dxos/plugin-routine/plugin';
import { translations as routineTranslations } from '@dxos/plugin-routine/translations';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { TagIndex, Text } from '@dxos/schema';

import { moduleSurfaces } from '../modules';

/** Shared CSF parameters for this package's stories (fullscreen canvas + plugin translations). */
export const storyParameters = {
  layout: 'fullscreen',
  controls: { disable: true },
  translations: [
    ...projectsTranslations,
    ...inboxTranslations,
    ...routineTranslations,
    ...formTranslations,
    ...reactUiTranslations,
  ],
};

/** Contributes this package's module surfaces so a story can drive them from a `ModuleContainer` layout. */
const StoryModulesPlugin = PluginBuilder.define(
  PluginBuilder.makeMeta({ key: DXN.make('org.dxos.plugin.projects.story.modules'), name: 'Project Story Modules' }),
).pipe(
  PluginBuilder.addModule({
    id: 'project-story-modules',
    activatesOn: ActivationEvents.SetupReactSurface,
    activate: () => Effect.succeed(Capability.contributes(Capabilities.ReactSurface, moduleSurfaces)),
  }),
  PluginBuilder.make,
);

export type DecoratorsProps = {
  /** Name of the seeded mailbox — the subject every project template in this package scaffolds from. */
  mailboxName: string;
  /** Plugins owning the skills and artifact types the story's template references. */
  plugins?: Plugin.Plugin[];
  /** Extra ECHO types beyond the shared project/mailbox set. */
  types?: Type.AnyEntity[];
};

/**
 * Story decorators for a project template scenario: a personal space seeded with one mailbox, the
 * plugin set that owns the project machinery, and this package's module surfaces.
 *
 * `SetupArtifactDefinition` matters as much as the plugin list — skill-definition modules activate
 * on it, and the registry it populates is what resolves a skill ref to a display label. Without it
 * the article's skill rows and picker render empty even when the owning plugin is loaded.
 */
export const createDecorators = ({ mailboxName, plugins = [], types = [] }: DecoratorsProps) => [
  withTheme(),
  withLayout({ layout: 'fullscreen' }),
  withPluginManager({
    setupEvents: [AppActivationEvents.SetupSettings, AppActivationEvents.SetupArtifactDefinition],
    plugins: [
      ...corePlugins(),
      ClientPlugin({
        types: [
          Mailbox.Mailbox,
          Project.Project,
          Instructions.Instructions,
          Routine.Routine,
          Trigger.Trigger,
          Collection.Collection,
          TagIndex.TagIndex,
          Text.Text,
          ...types,
        ],
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            const { personalSpace } = yield* initializeIdentity(client);
            yield* Effect.promise(async () => {
              personalSpace.db.add(Mailbox.make({ name: mailboxName }));
              await personalSpace.db.flush({ indexes: true });
            });
          }),
      }),
      StorybookPlugin({}),
      SpacePlugin({}),
      InboxPlugin(),
      ProjectsPlugin(),
      RoutinePlugin(),
      StoryModulesPlugin(),
      ...plugins,
    ],
  }),
];
