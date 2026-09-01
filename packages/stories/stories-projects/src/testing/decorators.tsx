//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Plugin from '@dxos/app-framework/Plugin';
import * as AppActivationEvents from '@dxos/app-toolkit/AppActivationEvents';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Collection, Database, Feed, type Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { mockAiService } from '@dxos/extractor/testing';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { Builder, InboxPlugin } from '@dxos/plugin-inbox/testing';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import { translations as projectsTranslations } from '@dxos/plugin-projects/translations';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import { translations as routineTranslations } from '@dxos/plugin-routine/translations';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { translations as tasksTranslations } from '@dxos/plugin-tasks/translations';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { TagIndex, Text } from '@dxos/schema';
import { StoryAiPlugin, createStoryDecorators, makeModuleSurfacesPlugin } from '@dxos/storybook-testing';
import { Message, Organization, Person } from '@dxos/types';

import { moduleSurfaces } from '../modules/index.ts';

/** Shared CSF parameters for this package's stories (fullscreen canvas + plugin translations). */
export const storyParameters = {
  layout: 'fullscreen',
  controls: { disable: true },
  translations: [
    ...projectsTranslations,
    ...inboxTranslations,
    ...routineTranslations,
    ...tasksTranslations,
    ...formTranslations,
    ...reactUiTranslations,
  ],
};

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
 * Story decorators for a project template scenario: a default space seeded with one mailbox, the
 * plugin set that owns the project machinery, and this package's module surfaces.
 *
 * The plugin list is what populates the skill-definition registry that resolves a skill ref to a
 * display label; without the owning plugin the article's skill rows and picker render empty.
 */
export const createDecorators = ({ mailboxName, messages, ai, plugins = [], types = [] }: DecoratorsProps) =>
  createStoryDecorators({
    // Skill-definition modules ride the assistant's start event, and nothing here opens assistant UI
    // or materializes a toolkit — without firing it the article's skill rows resolve to blank labels.
    setupEvents: [AppActivationEvents.AssistantStart],
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
    onInit: async ({ space }) => {
      const mailbox = space.db.add(Mailbox.make({ name: mailboxName }));
      if (messages && messages.count > 0) {
        const feed = await mailbox.feed.load();
        const built = new Builder()
          .createMessages(messages.count, { links: { db: space.db }, threads: messages.threads ?? 3 })
          .build();
        await EffectEx.runAndForwardErrors(
          Feed.append(feed, built.messages).pipe(Effect.provide(Database.layer(space.db))),
        );
      }
      await space.db.flush({ indexes: true });
    },
    plugins: [
      SpacePlugin({}),
      InboxPlugin(),
      ProjectsPlugin.make(),
      // Declared in Projects' `dependsOn`, so the manager refuses to resolve it without Tasks.
      TasksPlugin.make(),
      RoutinePlugin.make(),
      makeModuleSurfacesPlugin('org.dxos.plugin.projects.story.modules', moduleSurfaces),
      ...(ai
        ? [StoryAiPlugin({ ai: ai === 'ollama' ? 'ollama' : () => mockAiService({ text: 'A concise summary.' }) })]
        : []),
      ...plugins,
    ],
  });
