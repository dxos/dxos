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
import { buildDefinitionGraph, sectionsOf, selectDefinitions } from '../SpecModel/index.ts';
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

/** plugin-calls's design: its sections, then one section's definitions, then one definition and its neighbours. */
export const Default: Story = {
  args: { content: CALLS_SPEC },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sections = sectionsOf(
      selectDefinitions(buildDefinitionGraph(CALLS_SPEC), ['scenario', 'test', 'suite']),
    ).filter(({ external }) => !external);
    await waitFor(
      () => expect(canvas.getAllByTestId('definition-graph.section')).toHaveLength(sections.length),
      TIMEOUT,
    );
    const [sectionCard] = canvas.getAllByTestId('definition-graph.section');
    const section = sections.find(({ id }) => id === sectionCard.getAttribute('data-section'));
    await userEvent.click(sectionCard);
    await waitFor(
      () => expect(canvas.getAllByTestId('definition-graph.definition')).toHaveLength(section?.definitions.length ?? 0),
      TIMEOUT,
    );
    const [definitionCard] = canvas.getAllByTestId('definition-graph.definition');
    const id = definitionCard.getAttribute('data-definition');
    await userEvent.click(definitionCard);
    await waitFor(
      () => expect(canvasElement.querySelector('[data-focused]')?.getAttribute('data-definition')).toBe(id),
      TIMEOUT,
    );
  },
};

/** A types-heavy spec: segment variants, the core they spread, and the providers and places they name. */
export const Types: Story = {
  args: { content: TRIP_SPEC },
};

/** A large spec: plugin-code's own, whose many cross-references made the graph slow to draw. */
export const Large: Story = {
  args: { content: CODE_SPEC },
};

/** plugin-code's features against an earlier commit: new ones boxed green, changed ones amber, removed ones faded. */
export const Diff: Story = {
  args: { content: CODE_SPEC, base: CODE_BASE_SPEC, defaultFocus: { section: 'section:Features' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId('definition-graph.filters'));
    await waitFor(() => expect(canvas.getByTestId('definition-graph.changes.added')).toBeVisible(), TIMEOUT);
    await waitFor(
      () => expect(canvasElement.querySelector('[data-definition="F-14"]')?.getAttribute('data-change')).toBe('added'),
      TIMEOUT,
    );
  },
};

/** The same change read backwards, so the three features it added show as removed: faded, dashed and red. */
export const DiffRemoved: Story = {
  args: { content: CODE_BASE_SPEC, base: CODE_SPEC },
};
