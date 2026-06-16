//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Trigger } from '@dxos/compute';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Automation } from '#types';

import { AutomationArticle } from './AutomationArticle';

const DefaultStory = () => {
  const { space } = useClientStory();
  const [automation] = useQuery(space?.db, Filter.type(Automation.Automation));
  if (!automation) {
    return <Loading />;
  }
  return <AutomationArticle role='article' subject={automation} attendableId='story' />;
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
      types: [Automation.Automation, Trigger.Trigger],
      onCreateSpace: async ({ space }) => {
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

/** Automation with a timer trigger pre-configured for a daily 9 AM schedule. */
export const WithTimerTrigger: Story = {
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Automation.Automation, Trigger.Trigger],
      onCreateSpace: async ({ space }) => {
        const trigger = space.db.add(Trigger.make({ enabled: false, spec: { kind: 'timer', cron: '0 9 * * *' } }));
        const automation = space.db.add(Automation.make({ name: 'Daily Digest', triggers: [] }));
        // Wire the trigger into the automation after both are in the db.
        Obj.update(automation, (auto) => {
          auto.triggers = [...auto.triggers, Ref.make(trigger)];
        });
      },
    }),
  ],
};
