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

const card = (canvasElement: HTMLElement, id: string) => {
  const element = canvasElement.querySelector<HTMLElement>(`[data-feature="${id}"]`);
  if (!element) {
    throw new Error(`no card for ${id}`);
  }
  return element;
};

/** One card per status: the icon, hue and word change together. */
export const Statuses: Story = {
  args: {
    ids: ['triage', 'feature-map', 'sync', 'tasks', 'delegate'],
  },
};

/** Compact cards show the most serious signal, a "+N" count for the rest, and counts instead of lists. */
export const Compact: Story = {
  args: {
    ids: ['compose', 'triage', 'sync'],
  },
  play: async ({ canvasElement }) => {
    const compose = within(card(canvasElement, 'compose'));
    await expect(await compose.findByTestId('feature-signal.ahead')).toBeInTheDocument();
    await expect(compose.queryByTestId('feature-signal.no-evidence')).toBeNull();
    await expect(compose.getByTestId('feature-signal.more')).toHaveTextContent('+1');
    await expect(compose.getByText('Depends on 2')).toBeInTheDocument();
    await expect(within(card(canvasElement, 'sync')).getByText('2 subfeatures')).toBeInTheDocument();
  },
};

/** Every derived signal at least once; problems sort before status. Expanded, so no signal is folded into a count. */
export const Signals: Story = {
  args: {
    expanded: true,
    ids: ['compose', 'triage', 'feature-map'],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const signal of ['blocked', 'ahead', 'no-evidence', 'in-flight', 'unplanned']) {
      await expect((await canvas.findAllByTestId(`feature-signal.${signal}`)).length).toBeGreaterThan(0);
    }
  },
};

/** The detail form: description, dependencies, subfeatures, the implementing tasks, showcases and specs. */
export const Expanded: Story = {
  args: {
    ids: ['sync'],
    expanded: true,
    onSelectDependency: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('2 open tasks')).toBeInTheDocument();
    await expect(canvas.getByText('IMAP')).toBeInTheDocument();
    await expect(canvas.getByText('First sync of a Gmail inbox')).toBeInTheDocument();
    await userEvent.click(canvas.getByText('OAuth tokens'));
    await expect(args.onSelectDependency).toHaveBeenCalledWith('tokens');
  },
};
