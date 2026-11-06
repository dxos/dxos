//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import CALLS_SPEC from '../../../../plugin-calls/PLUGIN.mdl?raw';
import TRIP_SPEC from '../../../../plugin-trip/PLUGIN.mdl?raw';
import CODE_SPEC from '../../../PLUGIN.mdl?raw';
import CODE_BASE_SPEC from '../../containers/SpecArticle/__fixtures__/plugin-code.base.mdl?raw';
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

/** One block and everything it touches: the features naming SourceFile above it, what it names below, its checks. */
export const Related: Story = {
  args: { content: CODE_SPEC, defaultFocus: 'SourceFile' },
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
