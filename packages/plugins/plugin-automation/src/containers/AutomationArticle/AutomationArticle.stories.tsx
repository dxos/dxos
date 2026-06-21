//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Blueprint, Routine, Trigger } from '@dxos/compute';
import { Feed, Filter, Obj, Ref } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { ObjectProperties } from '@dxos/react-ui-form';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Automation } from '#types';

import { AutomationArticle } from './AutomationArticle';

const types = [Automation.Automation, Trigger.Trigger, Routine.Routine, Feed.Feed, Blueprint.Blueprint];

/** Seed a few fake blueprints so the routine action's Blueprints picker has options. */
const seedBlueprints = (space: Space) => {
  space.db.add(
    Blueprint.make({
      key: 'example.com/blueprint/research',
      name: 'Research',
      description: 'Research an organization.',
    }),
  );
  space.db.add(
    Blueprint.make({
      key: 'example.com/blueprint/summarize',
      name: 'Summarize',
      description: 'Summarize the selected content.',
    }),
  );
  space.db.add(
    Blueprint.make({
      key: 'example.com/blueprint/translate',
      name: 'Translate',
      description: 'Translate text to another language.',
    }),
  );
};

const DefaultStory = () => {
  const { space } = useClientStory();
  const [automation] = useQuery(space?.db, Filter.type(Automation.Automation));
  if (!automation) {
    return <Loading />;
  }
  return <AutomationArticle role='article' subject={automation} attendableId='story' />;
};

/** Two-column layout: the composite AutomationArticle on the left, raw object properties on the right. */
const TwoColumnStory = () => {
  const { space } = useClientStory();
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
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types,
      onCreateSpace: async ({ space }) => {
        seedBlueprints(space);
        space.db.add(Automation.make({ name: 'Morning Report', triggers: [] }));
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Empty automation — no trigger or action yet. Exercises the disabled enabled-switch message. */
export const Empty: Story = {};

/** Side-by-side: the composite editor alongside the underlying object's raw properties. */
export const TwoColumn: Story = {
  render: TwoColumnStory,
};

/** Automation with a timer trigger pre-configured for a daily 9 AM schedule. */
export const WithTimerTrigger: Story = {
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types,
      onCreateSpace: async ({ space }) => {
        seedBlueprints(space);
        const trigger = space.db.add(Trigger.make({ enabled: false, spec: { kind: 'timer', cron: '0 9 * * *' } }));
        const automation = space.db.add(Automation.make({ name: 'Daily Digest', triggers: [] }));
        // Wire the trigger into the automation after both are in the db.
        Obj.update(automation, (automation) => {
          automation.triggers = [...automation.triggers, Ref.make(trigger)];
        });
      },
    }),
  ],
};
