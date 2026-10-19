//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import { makeFeatureLookup } from './feature.ts';
import { FeatureCard } from './FeatureCard.tsx';
import { SAMPLE_FEATURES } from './testing.ts';

type StoryArgs = {
  ids: string[];
  expanded?: boolean;
  onSelectDependency?: (id: string) => void;
};

const DefaultStory = ({ ids, expanded, onSelectDependency }: StoryArgs) => {
  const lookup = useMemo(() => makeFeatureLookup(SAMPLE_FEATURES), []);
  return (
    <div className='grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-3 items-start'>
      {ids.flatMap((id) => {
        const feature = lookup(id);
        return feature
          ? [
              <FeatureCard
                key={id}
                feature={feature}
                lookup={lookup}
                expanded={expanded}
                onSelectDependency={onSelectDependency}
              />,
            ]
          : [];
      })}
    </div>
  );
};

const meta: Meta<StoryArgs> = {
  title: 'plugins/plugin-projects/components/FeatureCard',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'default' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** One card per stage: the icon, hue and word change together. Compact cards show one signal and a dependency count. */
export const Stages: Story = {
  args: {
    ids: ['org.dxos.plugin.inbox#F-9', 'org.dxos.plugin.inbox#F-3', 'org.dxos.plugin.connector#F-1'],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvasElement.querySelector<HTMLElement>('[data-feature="org.dxos.plugin.inbox#F-9"]');
    if (!card) {
      throw new Error('no card for org.dxos.plugin.inbox#F-9');
    }
    const triage = within(card);
    await expect(await triage.findByTestId('feature-signal.blocked')).toBeInTheDocument();
    await expect(triage.queryByTestId('feature-signal.unplanned')).toBeNull();
    await expect(triage.getByTestId('feature-signal.more')).toHaveTextContent('+1');
    await expect(canvas.getAllByText('Depends on 1').length).toBeGreaterThan(0);
  },
};

/** Every derived signal at least once; problems sort before status. Expanded, so no signal is folded into a count. */
export const Signals: Story = {
  args: {
    expanded: true,
    ids: [
      'org.dxos.plugin.inbox#F-4',
      'org.dxos.plugin.inbox#F-9',
      'org.dxos.product.composer#F-1',
      'org.dxos.plugin.projects#F-5',
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const signal of ['overclaimed', 'untested', 'blocked', 'unplanned', 'missing-dependency', 'in-flight']) {
      await expect((await canvas.findAllByTestId(`feature-signal.${signal}`)).length).toBeGreaterThan(0);
    }
    await expect(canvas.getByText('agent · F-2')).toBeInTheDocument();
  },
};

/** The detail form: description, each requirement with its coverage, and the implementing tasks. */
export const Expanded: Story = {
  args: {
    ids: ['org.dxos.plugin.inbox#F-3'],
    expanded: true,
    onSelectDependency: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('1 of 3 requirements tested')).toBeInTheDocument();
    await expect(canvas.getByText('2 open tasks')).toBeInTheDocument();
    await userEvent.click(canvas.getByText('Connector · OAuth tokens'));
    await expect(args.onSelectDependency).toHaveBeenCalledWith('org.dxos.plugin.connector#F-2');
  },
};
