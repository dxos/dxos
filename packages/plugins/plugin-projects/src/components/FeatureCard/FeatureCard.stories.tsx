//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode, useMemo } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import * as Card from '@dxos/react-ui/Card';
import * as Layout from '@dxos/react-ui/Layout';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import {
  type FeatureLookup,
  type FeatureModel,
  type FeatureTarget,
  getDependents,
  makeFeatureLookup,
} from './feature.ts';
import * as FeatureCard from './FeatureCard.tsx';
import { SAMPLE_FEATURES } from './testing.ts';

type Variant = 'compact' | 'detail' | 'sections';

type StoryArgs = {
  ids: string[];
  /** The map the cards are drawn from; the sample map by default. */
  features?: FeatureModel[];
  variant?: Variant;
  onOpen?: (target: FeatureTarget) => void;
};

type TileProps = Pick<StoryArgs, 'variant' | 'onOpen'> & {
  feature: FeatureModel;
  lookup: FeatureLookup;
  dependents: FeatureModel[];
};

/** One card per host composition: `compact` is what the map draws, `detail` what the companion lists. */
const FeatureTile = ({ feature, lookup, dependents, variant = 'compact', onOpen }: TileProps) => {
  const root = { feature, lookup, onOpen };
  switch (variant) {
    case 'detail':
      return (
        <FeatureCard.Root {...root}>
          <FeatureCard.Header>
            <FeatureCard.Status />
            <FeatureCard.Title />
          </FeatureCard.Header>
          <FeatureCard.Body>
            <FeatureCard.Description lines={0} />
            <FeatureCard.Requirements />
            <FeatureCard.Subfeatures />
            <FeatureCard.Tags all />
            <FeatureCard.Dependencies />
            <FeatureCard.Dependents dependents={dependents} />
            <FeatureCard.Tasks />
            <FeatureCard.Showcases />
            <FeatureCard.Specs />
          </FeatureCard.Body>
        </FeatureCard.Root>
      );

    case 'sections':
      return <SectionCards {...root} dependents={dependents} />;

    default:
      return (
        <FeatureCard.Root {...root}>
          <FeatureCard.Header>
            <FeatureCard.Status />
            <FeatureCard.Title />
            <FeatureCard.Marks />
          </FeatureCard.Header>
          <FeatureCard.Body>
            <FeatureCard.Description />
            <FeatureCard.Summary />
          </FeatureCard.Body>
        </FeatureCard.Root>
      );
  }
};

/** Each section part alone, in its own card under its name, to see what it draws. */
const SectionCards = ({ dependents, ...root }: FeatureCard.RootProps & { dependents: FeatureModel[] }) => {
  const sections: [string, ReactNode][] = [
    ['Description', <FeatureCard.Description key='description' />],
    ['Summary', <FeatureCard.Summary key='summary' />],
    ['Requirements', <FeatureCard.Requirements key='requirements' />],
    ['Tags', <FeatureCard.Tags key='tags' />],
    ['Tags all', <FeatureCard.Tags key='tags-all' all />],
    ['Dependencies', <FeatureCard.Dependencies key='dependencies' />],
    ['Dependents', <FeatureCard.Dependents key='dependents' dependents={dependents} />],
    ['Subfeatures', <FeatureCard.Subfeatures key='subfeatures' />],
    ['Tasks', <FeatureCard.Tasks key='tasks' />],
    ['Showcases', <FeatureCard.Showcases key='showcases' />],
    ['Specs', <FeatureCard.Specs key='specs' />],
  ];

  return (
    <>
      {sections.map(([name, section]) => (
        <FeatureCard.Root key={name} {...root}>
          <Card.Header>
            <Card.Title>{name}</Card.Title>
          </Card.Header>
          <FeatureCard.Body>{section}</FeatureCard.Body>
        </FeatureCard.Root>
      ))}
    </>
  );
};

const DefaultStory = ({ ids, features = SAMPLE_FEATURES, variant, onOpen }: StoryArgs) => {
  const lookup = useMemo(() => makeFeatureLookup(features), [features]);
  return (
    <Layout.Grid gap='sm' classNames='grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] items-start p-trim-md'>
      {ids.map((id) => {
        const feature = lookup(id);
        const dependents = getDependents(id, features).flatMap((dependent) => lookup(dependent) ?? []);
        return (
          feature && (
            <FeatureTile
              key={id}
              feature={feature}
              lookup={lookup}
              dependents={dependents}
              variant={variant}
              onOpen={onOpen}
            />
          )
        );
      })}
    </Layout.Grid>
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

/** One card per status: the icon and hue change together; the hammer marks a feature someone is working on. */
export const Statuses: Story = {
  args: {
    ids: ['triage', 'feature-map', 'sync', 'tasks', 'delegate'],
  },
  play: async ({ canvasElement }) => {
    // Work is its own axis: a failing feature and a prototype can both be in work.
    await expect(within(card(canvasElement, 'delegate')).getByTestId('feature-card.active')).toBeInTheDocument();
    await expect(within(card(canvasElement, 'feature-map')).getByTestId('feature-card.active')).toBeInTheDocument();
    await expect(within(card(canvasElement, 'tasks')).queryByTestId('feature-card.active')).toBeNull();
  },
};

/** Compact cards say what the feature is and how much lies beneath it, with the most serious warning as an icon. */
export const Compact: Story = {
  args: {
    ids: ['compose', 'triage', 'sync'],
  },
  play: async ({ canvasElement }) => {
    const compose = within(card(canvasElement, 'compose'));
    await expect(await compose.findByTestId('feature-signal.ahead')).toBeInTheDocument();
    await expect(compose.queryByTestId('feature-signal.no-evidence')).toBeNull();
    const sync = within(card(canvasElement, 'sync'));
    await expect(sync.getByText('2 subfeatures')).toBeInTheDocument();
    await expect(sync.getByTestId('feature-card.subfeatures-operational')).toHaveTextContent('0/2');
    await expect(sync.getByText('3 requirements')).toBeInTheDocument();
  },
};

/** Every derived signal at least once, spelled out as the companion lists them. */
export const Signals: Story = {
  args: {
    variant: 'detail',
    ids: ['compose', 'triage'],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const signal of ['blocked', 'ahead', 'no-evidence', 'unplanned']) {
      await expect((await canvas.findAllByTestId(`feature-signal.${signal}`)).length).toBeGreaterThan(0);
    }
  },
};

/** The detail composition: the ideal, the requirements, subfeatures, then how the feature relates to the rest. */
export const Detail: Story = {
  args: {
    ids: ['sync'],
    variant: 'detail',
    onOpen: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findAllByTestId('feature-card.requirement')).toHaveLength(3);
    await expect(canvas.getByText('IMAP')).toBeInTheDocument();
    await expect(canvas.getByText('First sync of a Gmail inbox')).toBeInTheDocument();
    await userEvent.click(canvas.getByText('OAuth tokens'));
    await expect(args.onOpen).toHaveBeenCalledWith({ type: 'object', id: 'tokens' });
    await userEvent.click(canvas.getByText('IMAP'));
    await expect(args.onOpen).toHaveBeenCalledWith({ type: 'object', id: 'sync-imap' });
  },
};

/** Each section part on its own. */
export const Sections: Story = {
  args: {
    ids: ['sync'],
    variant: 'sections',
  },
};

/** A list longer than a section's cap scrolls inside the card under its title, so the card keeps its size. */
export const LongLists: Story = {
  args: {
    ids: ['sync'],
    variant: 'detail',
    features: SAMPLE_FEATURES.map((feature) =>
      feature.id === 'sync'
        ? {
            ...feature,
            tasks: Array.from({ length: 12 }, (_, index) => ({
              id: `task-${index}`,
              title: `Task ${index + 1}`,
              done: index % 3 === 0,
              active: index === 1,
            })),
          }
        : feature,
    ),
  },
  play: async ({ canvasElement }) => {
    const tasks = await within(canvasElement).findByRole('group', { name: 'Tasks' });
    const viewport = tasks.querySelector<HTMLElement>('[data-scope="scroll-area"][data-part="viewport"]');
    if (!viewport) {
      throw new Error('the tasks section does not scroll');
    }
    await expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
  },
};
