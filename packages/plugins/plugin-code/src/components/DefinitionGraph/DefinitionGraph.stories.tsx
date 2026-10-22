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
import { buildDefinitionGraph, selectDefinitions } from '../SpecModel/index.ts';
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

/** plugin-calls's design on a lattice; the legend's switch adds its scenarios and tests. */
export const Default: Story = {
  args: { content: CALLS_SPEC },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const graph = buildDefinitionGraph(CALLS_SPEC);
    const design = selectDefinitions(graph, ['scenario', 'test', 'suite']).definitions;
    await waitFor(
      () => expect(canvas.getAllByTestId('definition-graph.definition')).toHaveLength(design.length),
      TIMEOUT,
    );
    await userEvent.click(canvas.getByText('Scenarios & tests'));
    await waitFor(
      () => expect(canvas.getAllByTestId('definition-graph.definition')).toHaveLength(graph.definitions.length),
      TIMEOUT,
    );
  },
};

/** A types-heavy spec: segment variants, the core they spread, and the providers and places they name. */
export const Types: Story = {
  args: { content: TRIP_SPEC },
};
