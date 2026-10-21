//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode, useMemo, useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Masonry } from '@dxos/react-ui-masonry';
import * as Card from '@dxos/react-ui/Card';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import {
  type FeatureChanges,
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
  variant?: Variant;
  /** Read-only without it: no status picker or edit button. */
  editable?: boolean;
  /** Opens every card in edit mode. */
  editing?: boolean;
  onOpen?: (target: FeatureTarget) => void;
};

type TileData = Pick<StoryArgs, 'variant' | 'editing' | 'onOpen'> & {
  feature: FeatureModel;
  lookup: FeatureLookup;
  dependents: FeatureModel[];
  onChange?: (feature: FeatureModel, changes: FeatureChanges) => void;
};

/** One card per host composition. */
const FeatureTile = ({
  data: { feature, lookup, dependents, variant = 'compact', editing, onOpen, onChange },
}: {
  data: TileData;
}) => {
  const root = { feature, lookup, onOpen, onChange, editing: editing || undefined };
  switch (variant) {
    case 'detail':
      return (
        <FeatureCard.Root {...root}>
          <FeatureCard.Header>
            <FeatureCard.Status />
            <FeatureCard.Title />
            <FeatureCard.Save />
            <FeatureCard.Menu />
          </FeatureCard.Header>
          <FeatureCard.Body>
            <FeatureCard.Description />
            <FeatureCard.Tags all />
            <FeatureCard.TaskCount />
            <FeatureCard.Dependencies />
            <FeatureCard.Dependents dependents={dependents} />
            <FeatureCard.Subfeatures />
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
            <FeatureCard.Save />
            <FeatureCard.Menu />
          </FeatureCard.Header>
          <FeatureCard.Body>
            <FeatureCard.Description />
            <FeatureCard.Tags />
            <FeatureCard.SubfeatureCount />
            <FeatureCard.TaskCount />
            <FeatureCard.ShowcaseLead />
            <FeatureCard.DependencyCount />
          </FeatureCard.Body>
        </FeatureCard.Root>
      );
  }
};

/** Each section part alone, in its own card under its name, to see what it draws. */
const SectionCards = ({ dependents, ...root }: FeatureCard.RootProps & { dependents: FeatureModel[] }) => {
  const sections: [string, ReactNode][] = [
    ['Description', <FeatureCard.Description key='description' />],
    ['Tags', <FeatureCard.Tags key='tags' />],
    ['Tags all', <FeatureCard.Tags key='tags-all' all />],
    ['SubfeatureCount', <FeatureCard.SubfeatureCount key='subfeature-count' />],
    ['TaskCount', <FeatureCard.TaskCount key='task-count' />],
    ['ShowcaseLead', <FeatureCard.ShowcaseLead key='showcase-lead' />],
    ['DependencyCount', <FeatureCard.DependencyCount key='dependency-count' />],
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

const DefaultStory = ({ ids, variant, editable = true, editing, onOpen }: StoryArgs) => {
  const [features, setFeatures] = useState(SAMPLE_FEATURES);
  const lookup = useMemo(() => makeFeatureLookup(features), [features]);
  const items = useMemo(() => {
    const onChange = editable
      ? (changed: FeatureModel, changes: FeatureChanges) =>
          setFeatures((current) =>
            current.map((feature) => (feature.id === changed.id ? { ...feature, ...changes } : feature)),
          )
      : undefined;
    return ids.flatMap((id): TileData[] => {
      const feature = lookup(id);
      const dependents = getDependents(id, features).flatMap((dependent) => lookup(dependent) ?? []);
      return feature ? [{ feature, lookup, dependents, variant, editing, onOpen, onChange }] : [];
    });
  }, [ids, features, lookup, variant, editable, editing, onOpen]);

  return (
    <Masonry.Root Tile={FeatureTile} minColumnWidth={18}>
      <Masonry.Content>
        <Masonry.Viewport items={items} getId={({ feature }) => feature.id} />
      </Masonry.Content>
    </Masonry.Root>
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

/** Without `onChange` a card is read-only: a plain status glyph and no edit or status items in its menu. */
export const ReadOnly: Story = {
  args: {
    ids: ['compose', 'sync'],
    editable: false,
  },
  play: async ({ canvasElement }) => {
    const sync = within(card(canvasElement, 'sync'));
    await expect(sync.queryByTestId('feature-card.menu')).toBeNull();
    await expect(sync.queryByTestId('feature-card.status-icon')).toBeNull();
  },
};

/** Edit mode: the name and description are fields, the description shown even while empty. */
export const Editing: Story = {
  args: {
    ids: ['compose', 'sync'],
    editing: true,
  },
  play: async ({ canvasElement }) => {
    const sync = within(card(canvasElement, 'sync'));
    await expect(await sync.findByTestId('feature-card.name.input')).toBeInTheDocument();
    await expect(sync.getByTestId('feature-card.description.input')).toBeInTheDocument();
    await expect(sync.getByTestId('feature-card.done')).toBeInTheDocument();
  },
};

/** Every derived signal at least once; problems sort before status. Detailed, so no signal is folded into a count. */
export const Signals: Story = {
  args: {
    variant: 'detail',
    ids: ['compose', 'triage', 'feature-map'],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const signal of ['blocked', 'ahead', 'no-evidence', 'in-flight', 'unplanned']) {
      await expect((await canvas.findAllByTestId(`feature-signal.${signal}`)).length).toBeGreaterThan(0);
    }
  },
};

/** The detail composition: description, dependencies, subfeatures, the implementing tasks, showcases and specs. */
export const Detail: Story = {
  args: {
    ids: ['sync'],
    variant: 'detail',
    onOpen: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('2 open tasks')).toBeInTheDocument();
    await expect(canvas.getByText('IMAP')).toBeInTheDocument();
    await expect(canvas.getByText('First sync of a Gmail inbox')).toBeInTheDocument();
    await userEvent.click(canvas.getByText('OAuth tokens'));
    await expect(args.onOpen).toHaveBeenCalledWith({ type: 'object', id: 'tokens' });
  },
};

/** Each section part on its own. */
export const Sections: Story = {
  args: {
    ids: ['sync'],
    variant: 'sections',
  },
};
