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
import { buildApiModel } from '../SpecModel/index.ts';
import { ApiSurface } from './ApiSurface.tsx';

const meta = {
  title: 'plugins/plugin-code/components/ApiSurface',
  component: ApiSurface,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
} satisfies Meta<typeof ApiSurface>;

export default meta;

type Story = StoryObj<typeof meta>;

/** plugin-calls's operations and services as signatures, with a column per declared effect. */
export const Default: Story = {
  args: { content: CALLS_SPEC },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const ops = buildApiModel(CALLS_SPEC).groups.filter(({ kind }) => kind === 'op');
    await waitFor(() => expect(canvas.getAllByTestId('api-surface.op')).toHaveLength(ops.length));
  },
};

/** A spec that declares no operations or services. */
export const Empty: Story = {
  args: { content: DEUS_SPEC },
};
