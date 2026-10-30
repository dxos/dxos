//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Database, Filter, type Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import { useSpaces } from '@dxos/react-client/echo';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { addCanvas, createCanvas } from '#model';
import { translations } from '#translations';

import schemaTypes from '../../capabilities/schema.ts';
import { CanvasProperties } from './CanvasProperties.tsx';

const DefaultStory = () => {
  const [space] = useSpaces();
  const [drawing] = useQuery(space?.db, Filter.type(Drawing.Drawing));
  if (!drawing) {
    return <Loading data={{ drawing: false }} />;
  }

  return <CanvasProperties drawing={drawing} />;
};

/** A drawing over the canvas `make` gives: a legacy one, or a `Canvas` over a scene. */
const withCanvas = (make: () => Effect.Effect<Obj.Unknown, never, Database.Service>) => [
  withTheme(),
  withLayout({ layout: 'column' }),
  withPluginManager({
    plugins: [
      ...CorePlugins.make(),
      ClientPlugin.make({
        types: [Drawing.Drawing, Drawing.Canvas, ...schemaTypes],
        onClientInitialized: Effect.fnUntraced(function* ({ client }) {
          const { defaultSpace } = yield* initializeIdentity(client);
          yield* Effect.gen(function* () {
            const canvas = yield* make();
            yield* Database.add(Drawing.make({ name: 'Canvas', canvas }));
          }).pipe(Effect.provide(Database.layer(defaultSpace.db)));
        }),
      }),
    ],
  }),
];

const meta = {
  title: 'plugins/plugin-canvas/containers/CanvasProperties',
  render: DefaultStory,
  decorators: withCanvas(() => Database.add(createCanvas())),
  parameters: {
    translations: [...translations, ...formTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Test:
 * 1. A drawing with no theme, style set or background of its own shows those selects empty, not their descriptions.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const view = within(canvasElement);
    const theme = await view.findByRole('combobox', { name: 'Theme' }, { timeout: 30_000 });
    await expect(theme).not.toHaveTextContent("each viewer's default");
    await expect(view.getByRole('combobox', { name: 'Style set' })).not.toHaveTextContent('another style set');
    await expect(view.getByRole('combobox', { name: 'Background' })).not.toHaveTextContent('Another background');
  },
};

/**
 * A `Canvas` over a scene: the lattice is its layouts' own mode, so the toggle writes the layouts and reads them back.
 *
 * Test:
 * 1. The lattice toggle starts off, as a new canvas's layout has no lattice.
 * 2. Turned on, it stays on: the form reads it back from the layout.
 */
export const Scene: Story = {
  decorators: withCanvas(() => addCanvas()),
  play: async ({ canvasElement }) => {
    const [lattice] = await within(canvasElement).findAllByRole('switch', undefined, { timeout: 30_000 });
    await expect(lattice).not.toBeChecked();
    await userEvent.click(lattice);
    await waitFor(() => expect(lattice).toBeChecked(), { timeout: 5_000 });
  },
};
