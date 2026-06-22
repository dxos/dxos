//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Skill, Routine, Trigger } from '@dxos/compute';
import { Feed, Filter, Obj, Ref } from '@dxos/echo';
import { AutomationPlugin } from '@dxos/plugin-automation/testing';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { type Space, useQuery, useSpaces } from '@dxos/react-client/echo';
import { ObjectProperties } from '@dxos/react-ui-form';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Automation } from '#types';

import { AutomationArticle } from './AutomationArticle';

const types = [Automation.Automation, Trigger.Trigger, Routine.Routine, Feed.Feed, Skill.Skill];

/** Seed a few fake skills so the routine action's Skills picker has options. */
const seedSkills = (space: Space) => {
  space.db.add(
    Skill.make({
      key: 'example.com/skill/research',
      name: 'Research',
      description: 'Research an organization.',
    }),
  );
  space.db.add(
    Skill.make({
      key: 'example.com/skill/summarize',
      name: 'Summarize',
      description: 'Summarize the selected content.',
    }),
  );
  space.db.add(
    Skill.make({
      key: 'example.com/skill/translate',
      name: 'Translate',
      description: 'Translate text to another language.',
    }),
  );
};

/** Empty automation — no trigger or action yet. */
const seedDefault = (space: Space) => {
  seedSkills(space);
  space.db.add(Automation.make({ name: 'Morning Report', triggers: [] }));
};

/** Automation with a timer trigger pre-configured for a daily 9 AM schedule. */
const seedWithTimerTrigger = (space: Space) => {
  seedSkills(space);
  const trigger = space.db.add(Trigger.make({ enabled: false, spec: { kind: 'timer', cron: '0 9 * * *' } }));
  const automation = space.db.add(Automation.make({ name: 'Daily Digest', triggers: [] }));
  // Wire the trigger into the automation after both are in the db.
  Obj.update(automation, (automation) => {
    automation.triggers = [...automation.triggers, Ref.make(trigger)];
  });
};

/**
 * `withPluginManager` (rather than `withClientProvider`) so the article's `useOperationInvoker` resolves
 * the `OperationInvoker` capability the Run toolbar action depends on.
 */
const withAutomation = (seed: (space: Space) => void) =>
  withPluginManager({
    plugins: [
      ...corePlugins(),
      ClientPlugin({
        types,
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            yield* Effect.promise(() => client.halo.createIdentity());
            const space = yield* Effect.promise(() => client.spaces.create());
            yield* Effect.promise(() => space.waitUntilReady());
            seed(space);
          }),
      }),
      AutomationPlugin(),
    ],
  });

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const [automation] = useQuery(space?.db, Filter.type(Automation.Automation));
  if (!automation) {
    return <Loading />;
  }
  return <AutomationArticle role='article' subject={automation} attendableId='story' />;
};

/** Two-column layout: the composite AutomationArticle on the left, raw object properties on the right. */
const TwoColumnStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const [automation] = useQuery(space?.db, Filter.type(Automation.Automation));
  if (!automation) {
    return <Loading />;
  }
  return (
    <div role='none' className='grid grid-cols-2 gap-px bg-separator divide-x divide-separator min-bs-0'>
      <AutomationArticle role='article' subject={automation} attendableId='story' />
      <div role='none' className='overflow-y-auto p-2 bg-baseSurface'>
        <ObjectProperties object={automation} />
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-automation/containers/AutomationArticle',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Empty automation — no trigger or action yet. The Run action is disabled until a runnable is set. */
export const Empty: Story = {
  decorators: [withAutomation(seedDefault)],
};

/** Side-by-side: the composite editor alongside the underlying object's raw properties. */
export const TwoColumn: Story = {
  render: TwoColumnStory,
  decorators: [withAutomation(seedDefault)],
};

/** Automation with a timer trigger pre-configured for a daily 9 AM schedule. */
export const WithTimerTrigger: Story = {
  decorators: [withAutomation(seedWithTimerTrigger)],
};
