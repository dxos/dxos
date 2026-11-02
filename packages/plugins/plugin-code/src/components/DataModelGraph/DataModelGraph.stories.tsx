//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import DEUS_SPEC from '../../../../../reflect/deus/SPEC.mdl?raw';
import CALLS_SPEC from '../../../../plugin-calls/PLUGIN.mdl?raw';
import TRIP_SPEC from '../../../../plugin-trip/PLUGIN.mdl?raw';
import { buildDataModel } from '../SpecModel/index.ts';
import { DataModelGraph } from './DataModelGraph.tsx';

const meta = {
  title: 'plugins/plugin-code/components/DataModelGraph',
  component: DataModelGraph,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
} satisfies Meta<typeof DataModelGraph>;

export default meta;

type Story = StoryObj<typeof meta>;

/** plugin-trip's stored types (Trip, Booking, Account) and the segments, places and providers they embed. */
export const Default: Story = {
  args: { content: TRIP_SPEC },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(
      () => expect(canvas.getAllByTestId('data-model.type')).toHaveLength(buildDataModel(TRIP_SPEC).types.length),
      { timeout: 10_000 },
    );
  },
};

/** A small model: a Call stored per its description, and the transport it embeds. */
export const Small: Story = {
  args: { content: CALLS_SPEC },
};

/** A spec that declares no types. */
export const Empty: Story = {
  args: { content: DEUS_SPEC },
};
