//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, waitFor } from 'storybook/test';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { ViewBuilder } from '../../builder/index.ts';
import { type View, createMemoryStore } from '../../model/index.ts';
import { Canvas } from './Canvas.tsx';

const box = (x: number, y = -64) => ({ x, y, width: 128, height: 128 });

/**
 * A Server Object whose `in` and `out` nodes are exposed and whose `core` is not, placed twice: each Instance offers a
 * port for `in` (on its left, where `in` is drawn) and for `out` (on its right), which links from outside attach to.
 */
const createTree = () => {
  const server: View = {
    ...ViewBuilder.view('server', [
      ViewBuilder.rect('in', box(-256)).properties({ label: 'in', exposed: true, style: { hue: 'green' } }),
      ViewBuilder.rect('core', box(-64)).properties({ label: 'core' }),
      ViewBuilder.rect('out', box(128)).properties({ label: 'out', exposed: true, style: { hue: 'green' } }),
      ViewBuilder.link('smart', 'in', 'core'),
      ViewBuilder.link('smart', 'core', 'out'),
    ])
      .name('Server')
      .build().views[0],
    kind: 'composite',
  };
  const instance = (id: string, x: number, y: number) =>
    ViewBuilder.node('instance', id, { x, y, width: 384, height: 128 }).properties({ composite: 'server' });
  const drawing = ViewBuilder.view('root', [
    ViewBuilder.rect('client', box(-640, -64)).properties({ label: 'Client', style: { hue: 'blue' } }),
    instance('primary', -320, -256),
    instance('replica', -320, 128),
    ViewBuilder.rect('db', box(384, -64)).properties({ label: 'Database', style: { hue: 'amber' } }),
    // Each end names the exposed node as the Instance's port.
    ViewBuilder.link('smart', 'client', 'primary#in'),
    ViewBuilder.link('smart', 'client', 'replica#in'),
    ViewBuilder.link('smart', 'primary#out', 'db'),
    ViewBuilder.link('smart', 'replica#out', 'db'),
  ])
    .name('Exposed')
    .build();
  return { root: drawing.root, views: [...drawing.views, server] };
};

const DefaultStory = () => {
  const store = useMemo(() => {
    const tree = createTree();
    return createMemoryStore(tree.views, {}, { root: tree.root });
  }, []);
  // Docked, so the Views section can open the Server Object, where Properties shows each node's Exposed switch.
  return (
    <Canvas.Root store={store} root='root' inspectors='docked'>
      <Canvas.Viewport />
      <Canvas.Navigation />
      <Canvas.Actions />
      <Canvas.Tools />
      <Canvas.Properties />
      <Canvas.Views />
      <Canvas.Layers />
      <Canvas.Objects />
    </Canvas.Root>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-canvas/components/Exposed',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...uiTranslations, ...formTranslations] },
};

export default meta;

type Story = StoryObj;

/**
 * The `exposed` property: inside an Object, a node marked exposed gives every Instance a port where it meets the
 * Instance's frame. Here Client links into each Server's `in` and each Server's `out` links on to the Database; `core`
 * is not exposed, so nothing outside can attach to it. Open a Server (double-click, or its row in Views) and toggle a
 * node's Exposed switch in Properties to add or remove its port.
 */
export const Default: Story = {};

/** The fixture drawn: both Instances draw the Object, and the four links from outside attach to their ports. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-instance]')).toHaveLength(2));
    await waitFor(() => {
      const ids = new Set(
        [...canvasElement.querySelectorAll('[data-link-id]')].map((element) => element.getAttribute('data-link-id')),
      );
      return expect([...ids]).toEqual(
        expect.arrayContaining(['client-primary', 'client-replica', 'primary-db', 'replica-db']),
      );
    });
  },
};
