//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import DEUS_SPEC from '../../../../../reflect/deus/SPEC.mdl?raw';
import CALLS_SPEC from '../../../../plugin-calls/PLUGIN.mdl?raw';
import TRIP_SPEC from '../../../../plugin-trip/PLUGIN.mdl?raw';
import CANVAS_AUTOGROW_SPEC from '../ChangelogGraph/__fixtures__/canvas-autogrow.mdl?raw';
import INBOX_SYNC_SPEC from '../ChangelogGraph/__fixtures__/inbox-sync.mdl?raw';
import { buildApiModel, buildDataModel, buildDefinitionGraph } from '../SpecModel/index.ts';
import { SpecChangelog } from './SpecChangelog.tsx';

const meta = {
  title: 'plugins/plugin-code/components/SpecChangelog',
  component: SpecChangelog,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
} satisfies Meta<typeof SpecChangelog>;

export default meta;

type Story = StoryObj<typeof meta>;

const TIMEOUT = { timeout: 10_000 };

/** The Deus spec beside its decisions; clicking a gutter chip selects that decision's card. */
export const Deus: Story = {
  args: { content: DEUS_SPEC },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chips = await waitFor(() => canvas.getAllByTestId('spec-changelog.gutter-chip'), TIMEOUT);
    await expect(chips.length).toBeGreaterThan(0);
    await userEvent.click(chips[0]);
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-testid="changelog-graph.decision"][data-selected]')).not.toBeNull(),
    );
  },
};

/** An agent-heavy spec: most requirements carry dashed agent chips, some approved or replaced by a person. */
export const MostlyAgent: Story = {
  args: { content: CANVAS_AUTOGROW_SPEC },
};

/** Requirements whose history is a chain of replacements; superseded chips are struck through. */
export const SupersedeChain: Story = {
  args: { content: INBOX_SYNC_SPEC },
};

/** The changelog grouped by who decided: each person's decisions, then the agents' at the bottom. */
export const DecisionLog: Story = {
  args: { content: CANVAS_AUTOGROW_SPEC, defaultView: 'log' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deciders = await waitFor(() => canvas.getAllByTestId('decision-log.decider'), TIMEOUT);
    const actors = deciders.map((section) => section.dataset.actor);
    await expect(actors.indexOf('agent')).toBeGreaterThan(actors.lastIndexOf('user'));
  },
};

/** Every definition of plugin-calls on a lattice, each arrow running through the gutters to what it names. */
export const Definitions: Story = {
  args: { content: CALLS_SPEC, defaultView: 'definitions' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(
      () =>
        expect(canvas.getAllByTestId('definition-graph.definition')).toHaveLength(
          buildDefinitionGraph(CALLS_SPEC).definitions.length,
        ),
      TIMEOUT,
    );
  },
};

/** plugin-trip's stored types (Trip, Booking, Account) and the segments, places and providers they embed. */
export const DataModel: Story = {
  args: { content: TRIP_SPEC, defaultView: 'data' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(
      () => expect(canvas.getAllByTestId('data-model.type')).toHaveLength(buildDataModel(TRIP_SPEC).types.length),
      TIMEOUT,
    );
  },
};

/** plugin-calls's operations and services as signatures, with a column per declared effect. */
export const Api: Story = {
  args: { content: CALLS_SPEC, defaultView: 'api' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { groups } = buildApiModel(CALLS_SPEC);
    await waitFor(
      () =>
        expect(canvas.getAllByTestId('api-surface.op')).toHaveLength(groups.filter(({ kind }) => kind === 'op').length),
      TIMEOUT,
    );
  },
};

/** The toolbar switches the panel between all five views of one spec. */
export const SwitchViews: Story = {
  args: { content: CALLS_SPEC },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = await waitFor(() => canvas.getByTestId('spec-changelog.panel'), TIMEOUT);
    for (const view of ['log', 'definitions', 'data', 'api', 'decisions']) {
      await userEvent.click(canvas.getByTestId(`spec-changelog.view.${view}`));
      await waitFor(() => expect(panel.dataset.view).toBe(view));
    }
  },
};
