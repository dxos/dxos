//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as Instructions from '@dxos/compute/Instructions';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Collection, Database, Feed, type Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { mockAiService } from '@dxos/extractor/testing';
import { DXN } from '@dxos/keys';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Mailbox } from '@dxos/plugin-inbox';
import { Builder, InboxPlugin } from '@dxos/plugin-inbox/testing';
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
import { Message, Organization, Person } from '@dxos/types';

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
const StoryModulesPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.projects.story.modules'), name: 'Project Story Modules' }),
).pipe(
  Plugin.addModule({
    id: 'project-story-modules',
    provides: [Capabilities.ReactSurface],
    activate: () => Effect.succeed([Capability.contribute(Capabilities.ReactSurface, moduleSurfaces)]),
  }),
  Plugin.make,
);

/**
 * Which AI service the story runs against. Absent means none: templates still scaffold and the
 * article renders, but nothing that needs a model can run.
 * - `mock` — canned text, so a play test can drive a model-dependent path deterministically in CI.
 * - `ollama` — a local model (`OLLAMA_ORIGINS="*" ollama serve`), for watching real extraction.
 */
export type StoryAiService = 'mock' | 'ollama';

export type DecoratorsProps = {
  /** Name of the seeded mailbox — the subject every project template in this package scaffolds from. */
  mailboxName: string;
  /**
   * Messages seeded into the mailbox feed. Feed triggers and the inbox tools have nothing to act on
   * without them, so any story that exercises processing (rather than scaffolding) needs a non-zero
   * count. `threads` sizes the thread-id pool: fewer threads means larger conversations and more
   * repeated senders, which is what a sender ledger needs in order to aggregate.
   */
  messages?: { count: number; threads?: number };
  /** AI service backing the story, if it needs one. */
  ai?: StoryAiService;
  /** Plugins owning the skills and artifact types the story's template references. */
  plugins?: Plugin.Plugin[];
  /** Extra ECHO types beyond the shared project/mailbox set. */
  types?: Type.AnyEntity[];
};

/**
 * Provides `AiService` on the space-affinity layer the operations resolve at invoke time, matching
 * how the app provisions it — so an operation invoked from a story (fact extraction, a routine's
 * prompt) reaches a model instead of failing to resolve the service.
 */
const StoryAiPlugin = (kind: StoryAiService) =>
  Plugin.define(
    Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.projects.story.ai'), name: 'Project Story AI Service' }),
  ).pipe(
    Plugin.addModule({
      id: 'project-story-ai',
      provides: [Capabilities.LayerSpec],
      activate: Capability.makeModule(
        Effect.fnUntraced(function* () {
          return [
            Capability.contribute(
              Capabilities.LayerSpec,
              LayerSpec.make({ affinity: 'space', requires: [], provides: [AiService.AiService] }, () =>
                kind === 'ollama'
                  ? // `orDie`: a missing/unreachable provider is a story setup fault, not a
                    // recoverable operation error, and `LayerSpec` requires an empty error channel.
                    AiServiceTestingPreset('ollama').pipe(Layer.orDie)
                  : mockAiService({ text: 'A concise summary.' }),
              ),
            ),
          ];
        }),
      ),
    }),
    Plugin.make,
  )();

/**
 * Story decorators for a project template scenario: a personal space seeded with one mailbox, the
 * plugin set that owns the project machinery, and this package's module surfaces.
 *
 * The plugin list is what populates the skill-definition registry that resolves a skill ref to a
 * display label; without the owning plugin the article's skill rows and picker render empty.
 */
export const createDecorators = ({ mailboxName, messages, ai, plugins = [], types = [] }: DecoratorsProps) => [
  withTheme(),
  withLayout({ layout: 'fullscreen' }),
  withPluginManager({
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
          // Mailbox and every trigger's feed spec resolve `Feed`; unregistered, the client logs
          // "Schema not registered" and feed-backed reads (messages, trigger summaries) come up empty.
          Feed.Feed,
          TagIndex.TagIndex,
          Text.Text,
          // Seeded mail: the messages themselves plus the Person/Organization objects the builder
          // links them to.
          Message.Message,
          Person.Person,
          Organization.Organization,
          ...types,
        ],
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            const { personalSpace } = yield* initializeIdentity(client);
            yield* Effect.promise(async () => {
              const mailbox = personalSpace.db.add(Mailbox.make({ name: mailboxName }));
              if (messages && messages.count > 0) {
                const feed = await mailbox.feed.tryLoad();
                const built = new Builder()
                  .createMessages(messages.count, { links: { db: personalSpace.db }, threads: messages.threads ?? 3 })
                  .build();
                await EffectEx.runAndForwardErrors(
                  Feed.append(feed!, built.messages).pipe(Effect.provide(Database.layer(personalSpace.db))),
                );
              }
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
      ...(ai ? [StoryAiPlugin(ai)] : []),
      ...plugins,
    ],
  }),
];
