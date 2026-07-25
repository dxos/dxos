//
// Copyright 2026 DXOS.org
//

import { Atom, RegistryContext, useAtomSet, useAtomValue } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DXN } from '@dxos/keys';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ActivationEvents, Capabilities } from '../../../common';
import * as Role from '../../../common/Role';
import { Capability, Plugin } from '../../../core';
import { withPluginManager } from '../../../testing';
import { usePluginManager } from '../PluginManager';
import { setSurfaceBoundaryRoles } from './boundary';
import { SurfaceComponent } from './SurfaceComponent';
import { useSurfaceManager } from './SurfaceManagerContext';
import { DX_SURFACE_ROOT_TAG, registerSurfaceRootElement } from './SurfaceRootElement';
import { create, makeFilter } from './types';

// End-to-end validation of web-component surface boundaries: the same React surface
// definition renders into several `<dx-surface-root>` elements (each its own React root)
// alongside an in-tree copy, all sharing one atom registry and the contributed
// `Capabilities.ReactContext` stack — state written in any root must appear in every root.

const BoundaryRole = Role.make<{ id: string }>('org.dxos.test.role.boundaryDemo');
const InTreeRole = Role.make<{ id: string }>('org.dxos.test.role.inTreeDemo');

const counterAtom = Atom.make(0);

const StoryReactContext = createContext('missing');

const CounterCard = ({ data }: { data?: { id: string } }) => {
  const id = data?.id ?? '?';
  const count = useAtomValue(counterAtom);
  const setCount = useAtomSet(counterAtom);
  const provided = useContext(StoryReactContext);
  return (
    <div className='flex flex-col gap-1 p-2 border border-separator rounded-sm'>
      <span className='font-mono text-sm'>surface {id}</span>
      <span className='font-mono text-sm' data-testid={`ctx-${id}`}>
        {provided}
      </span>
      <span className='font-mono text-2xl' data-testid={`count-${id}`}>
        {count}
      </span>
      <button
        className='border border-separator rounded-sm'
        data-testid={`inc-${id}`}
        onClick={() => setCount(count + 1)}
      >
        +1
      </button>
    </div>
  );
};

const storyMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.test.surfaceRootStory'), name: 'SurfaceRootStory' });

const StorySurfacesPlugin = Plugin.define(storyMeta).pipe(
  Plugin.addModule({
    id: 'surfaces',
    activatesOn: ActivationEvents.SetupReactSurface,
    activate: () =>
      Effect.succeed([
        Capability.contributes(Capabilities.ReactSurface, [
          create({ id: 'boundaryDemo', filter: makeFilter(BoundaryRole), component: CounterCard }),
          create({ id: 'inTreeDemo', filter: makeFilter(InTreeRole), component: CounterCard }),
        ]),
        Capability.contributes(Capabilities.ReactContext, {
          id: 'story.reactContext',
          context: ({ children }) => (
            <StoryReactContext.Provider value='provided'>{children}</StoryReactContext.Provider>
          ),
        }),
      ]),
  }),
  Plugin.make,
);

const DefaultStory = () => {
  const manager = usePluginManager();
  const surfaces = useSurfaceManager();
  const registry = useContext(RegistryContext);

  // Register before the first Surface render (state initializer, not an effect) so the
  // boundary branch is live on the initial dispatch; deterministic counter start.
  useState(() => {
    registry.set(counterAtom, 0);
    registerSurfaceRootElement({ manager, surfaces });
    setSurfaceBoundaryRoles([BoundaryRole.role]);
  });
  useEffect(() => () => setSurfaceBoundaryRoles([]), []);

  return (
    <div className='grid grid-cols-4 gap-4 p-4'>
      <SurfaceComponent type={BoundaryRole} data={{ id: 'a' }} limit={1} />
      <SurfaceComponent type={BoundaryRole} data={{ id: 'b' }} limit={1} />
      <SurfaceComponent type={BoundaryRole} data={{ id: 'c' }} limit={1} />
      <SurfaceComponent type={InTreeRole} data={{ id: 'host' }} limit={1} />
    </div>
  );
};

const meta = {
  title: 'sdk/app-framework/components/SurfaceRoot',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({ plugins: [StorySurfacesPlugin()] }),
  ],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Three boundary elements, each hosting its own React root; the in-tree copy has none.
    await waitFor(() => expect(canvasElement.querySelectorAll(DX_SURFACE_ROOT_TAG).length).toBe(3));

    // Every root committed (inner roots render async) and received the contributed
    // ReactContext stack.
    for (const id of ['a', 'b', 'c', 'host']) {
      await canvas.findByTestId(`count-${id}`);
      expect((await canvas.findByTestId(`ctx-${id}`)).textContent).toBe('provided');
    }

    // A write from inside one boundary root reaches every other root (shared registry).
    await userEvent.click(await canvas.findByTestId('inc-a'));
    await waitFor(() => {
      for (const id of ['a', 'b', 'c', 'host']) {
        expect(canvas.getByTestId(`count-${id}`).textContent).toBe('1');
      }
    });

    // And a write from the in-tree surface reaches the boundary roots.
    await userEvent.click(await canvas.findByTestId('inc-host'));
    await waitFor(() => {
      for (const id of ['a', 'b', 'c']) {
        expect(canvas.getByTestId(`count-${id}`).textContent).toBe('2');
      }
    });
  },
};
