//
// Copyright 2026 DXOS.org
//

import { cleanup, waitFor } from '@testing-library/react';
import * as Effect from 'effect/Effect';
import React from 'react';
import { afterEach, describe, test } from 'vitest';

import { DXN } from '@dxos/keys';

import { ActivationEvents, Capabilities } from '../../../common';
import * as Role from '../../../common/Role';
import { Capability, Plugin } from '../../../core';
import { createTestApp } from '../../../testing/harness';
import { render } from '../../../testing/react';
import { BoundaryScopeContext, setSurfaceBoundaryRoles } from './boundary';
import {
  DX_SURFACE_BOUNDARY_TAG,
  SURFACE_BOUNDARY_MOUNTED_EVENT,
  SURFACE_BOUNDARY_UNMOUNTED_EVENT,
  registerSurfaceBoundaryElement,
} from './SurfaceBoundaryElement';
import { SurfaceComponent } from './SurfaceComponent';
import { SurfaceManager } from './SurfaceManager';
import { create, makeFilter } from './types';

const RoleBound = Role.make<Record<string, unknown>>('org.dxos.test.role.bound');
const RoleInner = Role.make<Record<string, unknown>>('org.dxos.test.role.inner');

const testMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.test.surfaceRoot'), name: 'SurfaceRootTest' });

const TestPlugin = Plugin.define(testMeta).pipe(
  Plugin.addModule({
    id: 'surfaces',
    activatesOn: ActivationEvents.SetupReactSurface,
    activate: () =>
      Effect.succeed(
        Capability.contributes(Capabilities.ReactSurface, [
          create({
            id: 'bound',
            filter: makeFilter(RoleBound),
            component: ({ data }) => (
              <div>
                <span data-testid='bound'>{String((data as { label?: string })?.label ?? '')}</span>
                <SurfaceComponent type={RoleInner} />
              </div>
            ),
          }),
          create({ id: 'inner', filter: makeFilter(RoleInner), component: () => <span data-testid='inner' /> }),
        ]),
      ),
  }),
  Plugin.make,
);

const setup = async (harness: Awaited<ReturnType<typeof createTestApp>>) => {
  const surfaces = new SurfaceManager(harness.manager.capabilities);
  registerSurfaceBoundaryElement({ manager: harness.manager, surfaces });
  setSurfaceBoundaryRoles([RoleBound.role]);
};

describe('SurfaceBoundaryElement dispatch', () => {
  afterEach(async () => {
    setSurfaceBoundaryRoles([]);
    // Unmount now (idempotent for RTL's own auto-cleanup, which would otherwise run after this
    // hook) and drain the React scheduler's setImmediate chains, so the detached inner roots'
    // deferred unmount work finishes before the jsdom environment is torn down.
    cleanup();
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  });

  test('renders the contributed surface inside a detached root', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [TestPlugin()] });
    await setup(harness);

    const view = render(harness, <SurfaceComponent type={RoleBound} data={{ label: 'one' }} />);
    expect(view.container.querySelector(DX_SURFACE_BOUNDARY_TAG)).not.toBeNull();
    // The inner React root commits asynchronously (microtask-scheduled).
    expect((await view.findByTestId('bound')).textContent).toBe('one');
  });

  test('nested surfaces of other roles dispatch in-tree inside the boundary root', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [TestPlugin()] });
    await setup(harness);

    const view = render(harness, <SurfaceComponent type={RoleBound} />);
    await view.findByTestId('inner');
    // Only the outer dispatch crossed a boundary.
    expect(view.container.querySelectorAll(DX_SURFACE_BOUNDARY_TAG).length).toBe(1);
  });

  test('data updates propagate across the boundary by reference', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [TestPlugin()] });
    await setup(harness);

    const view = render(harness, <SurfaceComponent type={RoleBound} data={{ label: 'one' }} />);
    expect((await view.findByTestId('bound')).textContent).toBe('one');

    view.rerender(<SurfaceComponent type={RoleBound} data={{ label: 'two' }} />);
    await waitFor(() => {
      expect(view.getByTestId('bound').textContent).toBe('two');
    });
  });

  test('inside its own boundary scope the same role renders in-tree', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [TestPlugin()] });
    await setup(harness);

    const view = render(
      harness,
      <BoundaryScopeContext.Provider value={RoleBound.role}>
        <SurfaceComponent type={RoleBound} data={{ label: 'scoped' }} />
      </BoundaryScopeContext.Provider>,
    );
    expect(view.container.querySelector(DX_SURFACE_BOUNDARY_TAG)).toBeNull();
    expect((await view.findByTestId('bound')).textContent).toBe('scoped');
  });

  test('emits mounted/unmounted lifecycle events', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [TestPlugin()] });
    await setup(harness);

    let mounted = 0;
    let unmounted = 0;
    const onMounted = () => mounted++;
    const onUnmounted = () => unmounted++;
    document.addEventListener(SURFACE_BOUNDARY_MOUNTED_EVENT, onMounted);
    document.addEventListener(SURFACE_BOUNDARY_UNMOUNTED_EVENT, onUnmounted);

    try {
      const view = render(harness, <SurfaceComponent type={RoleBound} />);
      await view.findByTestId('bound');
      await waitFor(() => {
        expect(mounted).toBeGreaterThan(0);
      });

      view.unmount();
      await waitFor(() => {
        expect(unmounted).toBeGreaterThan(0);
      });
    } finally {
      document.removeEventListener(SURFACE_BOUNDARY_MOUNTED_EVENT, onMounted);
      document.removeEventListener(SURFACE_BOUNDARY_UNMOUNTED_EVENT, onUnmounted);
    }
  });

  test('without an allowlisted role, dispatch stays in-tree', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [TestPlugin()] });
    await setup(harness);
    setSurfaceBoundaryRoles([]);

    const view = render(harness, <SurfaceComponent type={RoleBound} data={{ label: 'direct' }} />);
    expect(view.container.querySelector(DX_SURFACE_BOUNDARY_TAG)).toBeNull();
    expect((await view.findByTestId('bound')).textContent).toBe('direct');
  });
});
