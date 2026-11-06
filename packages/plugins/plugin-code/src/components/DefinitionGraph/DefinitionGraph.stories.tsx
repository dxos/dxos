//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { parseReview } from '@dxos/deus/review';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import LAUNCH_VIDEO from '../../../../../reflect/deus/lang/examples/launch-video.mdl?raw';
import CALLS_SPEC from '../../../../plugin-calls/PLUGIN.mdl?raw';
import TRIP_SPEC from '../../../../plugin-trip/PLUGIN.mdl?raw';
import CODE_SPEC from '../../../PLUGIN.mdl?raw';
import CODE_BASE_SPEC from '../../containers/SpecArticle/__fixtures__/plugin-code.base.mdl?raw';
import CODE_REVIEW from '../../containers/SpecArticle/__fixtures__/plugin-code.review-2026-10-27.mdl?raw';
import { buildDefinitionGraph, groupDefinitions } from '../SpecModel/index.ts';
import { DefinitionGraph } from './DefinitionGraph.tsx';

const meta = {
  title: 'plugins/plugin-code/components/DefinitionGraph',
  component: DefinitionGraph,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
} satisfies Meta<typeof DefinitionGraph>;

export default meta;

type Story = StoryObj<typeof meta>;

const TIMEOUT = { timeout: 10_000 };

const REVIEW = parseReview(CODE_REVIEW);

/** plugin-code's spec with a status written on four of its features, as the feature map writes them back. */
const CODE_SPEC_STATUS = Object.entries({
  'F-8': 'operational',
  'F-10': 'prototype',
  'F-12a': 'failing',
  'F-12b': 'planned',
}).reduce(
  (text, [id, status]) => text.replace(new RegExp(`^(feat ${id}:.*)$`, 'm'), `$1\n  status: ${status}`),
  CODE_SPEC,
);

/** plugin-code's features as a map, clustered around the blocks they share. */
export const Default: Story = {
  args: { content: CODE_SPEC, layout: 'map' },
};

/** Selecting a feature lights what it shares, and a shared block opens its related view. */
export const Navigate: Story = {
  args: { content: CODE_SPEC, layout: 'map' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { groups } = groupDefinitions(buildDefinitionGraph(CODE_SPEC));
    await waitFor(() => expect(canvas.getAllByTestId('definition-map.group')).toHaveLength(groups.length), TIMEOUT);
    const frame = canvasElement.querySelector('[data-group="F-12a"]')!;
    await userEvent.click(within(frame as HTMLElement).getByTestId('definition-map.select'));
    await waitFor(
      () => expect(canvasElement.querySelector('[data-lit][data-definition="buildProject"]')).not.toBeNull(),
      TIMEOUT,
    );
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-definition="buildProject"]')!);
    await waitFor(
      () => expect(canvas.getByTestId('definition-related.focus')).toHaveAttribute('data-definition', 'buildProject'),
      TIMEOUT,
    );
  },
};

/** The spec on a canvas: a card per cluster, placed by the semantic engine, with how many blocks each names in another. */
export const Canvas: Story = {
  args: { content: CODE_SPEC_STATUS, layout: 'canvas', review: REVIEW },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { clusters } = groupDefinitions(buildDefinitionGraph(CODE_SPEC));
    await waitFor(
      () => expect(canvas.getAllByTestId('definition-canvas.cluster')).toHaveLength(clusters.length),
      TIMEOUT,
    );
  },
};

/** A double-click as the canvas reads one: a press and release on the node, then the `dblclick`. */
const doubleClick = async (element: Element) => {
  const { left, top, width, height } = element.getBoundingClientRect();
  const point = { clientX: left + width / 2, clientY: top + height / 2, button: 0, pointerId: 1 };
  await fireEvent.pointerDown(element, point);
  await fireEvent.pointerUp(element, point);
  await fireEvent.dblClick(element, point);
};

/**
 * Drilling down the canvas: double-clicking a cluster zooms into its level, a frame per feature holding what only it
 * names; every card carries its verdict, a feature its status, and a card that opens a level is marked. Double-clicking
 * F-8 zooms into everything that touches it.
 */
export const CanvasDrill: Story = {
  args: { content: CODE_SPEC_STATUS, layout: 'canvas', review: REVIEW },
  play: async ({ canvasElement }) => {
    const card = (id: string) =>
      canvasElement.querySelector(`[data-testid="definition-canvas.card"][data-definition="${id}"]`);
    const clusterCard = () => canvasElement.querySelector('[data-cluster="cluster:CoderSkill"]');
    await waitFor(() => expect(clusterCard()).not.toBeNull(), TIMEOUT);
    const cluster = clusterCard();
    cluster && (await doubleClick(cluster));
    // Drilled in, the spec's clusters are no longer drawn.
    await waitFor(
      () => expect(canvasElement.querySelector('[data-testid="definition-canvas.cluster"]')).toBeNull(),
      TIMEOUT,
    );
    // F-8 opens its level once the block levels are laid out, after the canvas opens.
    await waitFor(() => expect(card('F-8')?.hasAttribute('data-opens')).toBe(true), TIMEOUT);
    await expect(card('F-8')?.querySelector('[data-testid="definition-canvas.fact"]')?.textContent).toBe('operational');
    const feature = card('F-8');
    feature && (await doubleClick(feature));
    await waitFor(
      () => expect(canvasElement.querySelector('[data-testid="definition-canvas.card"][data-focused]')).not.toBeNull(),
      TIMEOUT,
    );
  },
};

/**
 * A script in the video dialect, grouped by the same rules as code: each scene composes its shots, voiceover and
 * captions, and the scenes gather around the characters they share.
 */
export const Video: Story = {
  args: { content: LAUNCH_VIDEO, layout: 'canvas' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { clusters } = groupDefinitions(buildDefinitionGraph(LAUNCH_VIDEO));
    await waitFor(
      () => expect(canvas.getAllByTestId('definition-canvas.cluster')).toHaveLength(clusters.length),
      TIMEOUT,
    );
  },
};

/** The same spec in a narrow panel: pointing at a shared block brackets every group naming it. */
export const Outline: Story = {
  args: { content: CODE_SPEC, layout: 'outline' },
  decorators: [withLayout({ layout: 'column' })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [group] = await waitFor(() => canvas.getAllByTestId('definition-outline.group'), TIMEOUT);
    await userEvent.click(group);
    const shared = await waitFor(
      () => canvas.getAllByTestId('definition-outline.definition').find((row) => row.textContent?.includes('×'))!,
      TIMEOUT,
    );
    await userEvent.hover(shared);
    await waitFor(() => expect(canvas.getByTestId('definition-outline.bracket')).toBeInTheDocument(), TIMEOUT);
  },
};

/** One block and everything it touches: the features naming CodeProject above it, what it names below, its checks. */
export const Related: Story = {
  args: { content: CODE_SPEC, defaultFocus: 'CodeProject' },
  decorators: [withLayout({ layout: 'column' })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(
      () =>
        expect(
          within(canvas.getByTestId('definition-related.above')).getAllByTestId('definition-related.node').length,
        ).toBeGreaterThan(1),
      TIMEOUT,
    );
    await waitFor(() => expect(canvas.getAllByTestId('definition-graph.connector').length).toBeGreaterThan(1), TIMEOUT);
  },
};

/** plugin-calls, grouped around Call and CallState. */
export const Calls: Story = {
  args: { content: CALLS_SPEC, layout: 'map' },
};

/** A types-heavy spec whose features name few blocks, so most of it is in no group. */
export const Types: Story = {
  args: { content: TRIP_SPEC, layout: 'map' },
};

/** plugin-code's features against an earlier commit: new ones boxed green, changed ones amber, removed ones faded. */
export const Diff: Story = {
  args: { content: CODE_SPEC, base: CODE_BASE_SPEC, layout: 'map' },
  play: async ({ canvasElement }) => {
    await waitFor(
      () => expect(canvasElement.querySelector('[data-group="F-14"]')?.getAttribute('data-change')).toBe('added'),
      TIMEOUT,
    );
  },
};

/** The same change read backwards, so the three features it added show as removed: faded, dashed and red. */
export const DiffRemoved: Story = {
  args: { content: CODE_BASE_SPEC, base: CODE_SPEC, layout: 'map' },
};
