//
// Copyright 2026 DXOS.org
//

import { act } from '@testing-library/react';
import * as Effect from 'effect/Effect';
import React, { Profiler, useState } from 'react';
import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';

import { Position } from '@dxos/util';

import { ActivationEvents, Capabilities } from '../../../common';
import { Capability, Plugin } from '../../../core';
import { createTestApp } from '../../../testing/harness';
import { render } from '../../../testing/react';
import { SurfaceComponent, useSurfaces } from './SurfaceComponent';
import { setSurfaceDebug } from './SurfaceDebug';
import { surfaceMetrics } from './SurfaceMetrics';
import { type Definition, create, makeFilter, makeType } from './types';

const flushMetrics = () => act(async () => void (await new Promise((resolve) => setTimeout(resolve, 30))));

const RoleA = makeType<Record<string, unknown>>('org.dxos.test.role.alpha');
const RoleB = makeType<Record<string, unknown>>('org.dxos.test.role.beta');

const testMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.test.surfacePerf'), name: 'SurfacePerfTest' });

const TestPlugin = Plugin.define(testMeta).pipe(
  Plugin.addModule({
    id: 'surfaces',
    activatesOn: ActivationEvents.SetupReactSurface,
    activate: () =>
      Effect.succeed(
        Capability.contributes(Capabilities.ReactSurface, [
          create({ id: 'alpha', filter: makeFilter(RoleA), component: () => <span data-testid='a' /> }),
          create({ id: 'beta', filter: makeFilter(RoleB), component: () => <span data-testid='b' /> }),
        ]),
      ),
  }),
  Plugin.make,
);

// A counter increments once per commit of the wrapped Surface subtree (mount or update).
const probe = (counts: { value: number }) => () => {
  counts.value++;
};

describe('SurfaceComponent dispatch', () => {
  test('limit={0} renders nothing', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [TestPlugin()] });
    const view = render(harness, <SurfaceComponent type={RoleA} limit={0} />);
    // Allow any async dispatch to settle, then assert the surface did not render.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(view.queryByTestId('a')).toBeNull();
  });
});

describe('SurfaceComponent per-role subscription', () => {
  test('contributions to one role do not re-render surfaces of other roles', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [TestPlugin()] });
    const a = { value: 0 };
    const b = { value: 0 };

    const view = render(
      harness,
      <>
        <Profiler id='a' onRender={probe(a)}>
          <SurfaceComponent type={RoleA} />
        </Profiler>
        <Profiler id='b' onRender={probe(b)}>
          <SurfaceComponent type={RoleB} />
        </Profiler>
      </>,
    );
    await view.findByTestId('a');
    await view.findByTestId('b');

    const aBaseline = a.value;
    const bBaseline = b.value;

    // Contribute a new surface for role B only.
    act(() => {
      harness.manager.capabilities.contribute({
        module: 'late',
        interface: Capabilities.ReactSurface,
        implementation: create({ id: 'beta2', filter: makeFilter(RoleB, () => false), component: () => null }),
      });
    });

    // Role A was untouched; role B's bucket changed and re-rendered.
    expect(a.value).toBe(aBaseline);
    expect(b.value).toBeGreaterThan(bBaseline);
  });

  test('cost of unrelated contributions is independent of other roles (scales flat)', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [TestPlugin()] });
    const a = { value: 0 };

    const view = render(
      harness,
      <Profiler id='a' onRender={probe(a)}>
        <SurfaceComponent type={RoleA} />
      </Profiler>,
    );
    await view.findByTestId('a');

    const aBaseline = a.value;
    const rounds = 50;
    const start = performance.now();
    for (let i = 0; i < rounds; i++) {
      act(() => {
        harness.manager.capabilities.contribute({
          module: `late-${i}`,
          interface: Capabilities.ReactSurface,
          implementation: create({
            id: `beta${i}`,
            filter: makeFilter(RoleB, () => false),
            component: () => null,
          }),
        });
      });
    }
    const elapsed = performance.now() - start;

    // Role A never re-renders despite 50 unrelated contributions.
    expect(a.value).toBe(aBaseline);
    // eslint-disable-next-line no-console
    console.log(`[surface-bench] ${rounds} unrelated contributions: roleA re-renders=${a.value - aBaseline}, ${elapsed.toFixed(1)}ms`);
  });
});

// Reproduces the pre-change global subscription + per-render scan/sort dispatch.
const EMPTY_DATA: Record<string, unknown> = {};
const legacyFindCandidates = (surfaces: Definition[], role: string): Definition[] =>
  surfaces
    .filter((definition) => (Array.isArray(definition.role) ? definition.role.includes(role) : definition.role === role))
    .filter(({ filter }) => (filter ? filter(EMPTY_DATA, role) : true))
    .toSorted(Position.compare);

const LegacySurface = ({ role }: { role: string }) => {
  // Subscribes to ALL surface contributions (the pre-change behaviour).
  const surfaces = useSurfaces();
  const candidates = legacyFindCandidates(surfaces, role);
  return <span data-count={candidates.length} />;
};

describe('SurfaceComponent quantified comparison (per-role vs global subscription)', () => {
  const ROLE_COUNT = 10;
  const SURFACES_PER_ROLE = 10;
  const ROUNDS = ROLE_COUNT; // one contribution per role.

  const roles = Array.from({ length: ROLE_COUNT }, (_, i) => makeType<Record<string, unknown>>(`org.dxos.test.role.r${i}`));

  const benchMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.test.surfaceBench'), name: 'SurfaceBenchTest' });
  const BenchPlugin = Plugin.define(benchMeta).pipe(
    Plugin.addModule({
      id: 'surfaces',
      activatesOn: ActivationEvents.SetupReactSurface,
      activate: () =>
        Effect.succeed(
          Capability.contributes(
            Capabilities.ReactSurface,
            roles.flatMap((role, ri) =>
              Array.from({ length: SURFACES_PER_ROLE }, (_, si) =>
                create({ id: `r${ri}s${si}`, filter: makeFilter(role), component: () => <span /> }),
              ),
            ),
          ),
        ),
    }),
    Plugin.make,
  );

  test('per-role subscription scales re-renders by role count, not fleet size', async ({ expect }) => {
    const fleet = ROLE_COUNT * SURFACES_PER_ROLE;

    const measure = async (mode: 'new' | 'legacy') => {
      await using harness = await createTestApp({ plugins: [BenchPlugin()] });
      const commits = { value: 0 };
      const tree = roles.flatMap((role, ri) =>
        Array.from({ length: SURFACES_PER_ROLE }, (_, si) => (
          <Profiler key={`${ri}.${si}`} id={`${ri}.${si}`} onRender={() => commits.value++}>
            {mode === 'new' ? <SurfaceComponent type={role} /> : <LegacySurface role={role.role} />}
          </Profiler>
        )),
      );
      render(harness, <>{tree}</>);

      const baseline = commits.value;
      const start = performance.now();
      for (let round = 0; round < ROUNDS; round++) {
        const role = roles[round % ROLE_COUNT];
        act(() => {
          harness.manager.capabilities.contribute({
            module: `extra-${round}`,
            interface: Capabilities.ReactSurface,
            implementation: create({ id: `extra${round}`, filter: makeFilter(role, () => false), component: () => null }),
          });
        });
      }
      const elapsed = performance.now() - start;
      return { reRenders: commits.value - baseline, elapsed };
    };

    const legacy = await measure('legacy');
    const next = await measure('new');

    const legacyPerContribution = legacy.reRenders / ROUNDS;
    const nextPerContribution = next.reRenders / ROUNDS;
    // eslint-disable-next-line no-console
    console.log(
      `[surface-bench] fleet=${fleet} surfaces across ${ROLE_COUNT} roles, ${ROUNDS} contributions (1/role):\n` +
        `  legacy (global subscription): ${legacy.reRenders} re-renders (${legacyPerContribution}/contribution), ${legacy.elapsed.toFixed(1)}ms\n` +
        `  per-role subscription:        ${next.reRenders} re-renders (${nextPerContribution}/contribution), ${next.elapsed.toFixed(1)}ms\n` +
        `  reduction: ${(legacy.reRenders / Math.max(next.reRenders, 1)).toFixed(1)}x`,
    );

    // Legacy: the entire fleet re-renders on every contribution.
    expect(legacyPerContribution).toBe(fleet);
    // Per-role: re-renders per contribution are bounded by the affected role's surfaces
    // (plus a small fleet-independent commit-phase constant) — NOT the fleet size.
    expect(nextPerContribution).toBeLessThanOrEqual(3 * SURFACES_PER_ROLE);
    expect(next.reRenders).toBeLessThan(legacy.reRenders / 2);
  });
});

describe('SurfaceComponent dev metrics', () => {
  test('records dispatch + candidate count and flags unstable data', async ({ expect }) => {
    setSurfaceDebug(true);
    surfaceMetrics.clear();
    try {
      await using harness = await createTestApp({ plugins: [TestPlugin()] });

      // Host passes a fresh `data` object of identical content on every render — the unstable-prop footgun.
      let bump: () => void = () => {};
      const Host = () => {
        const [, setN] = useState(0);
        bump = () => setN((n) => n + 1);
        return <SurfaceComponent type={RoleA} data={{ k: 1 }} />;
      };

      const view = render(harness, <Host />);
      await view.findByTestId('a');
      for (let i = 0; i < 5; i++) {
        act(() => bump());
      }
      await flushMetrics();

      const metric = surfaceMetrics.getSnapshot().find((entry) => entry.surfaceId === 'alpha');
      expect(metric?.candidates).toBe(1);
      expect(metric?.dispatches).toBeGreaterThan(1);
      expect(metric?.mounts).toBe(1);
      expect(metric?.dataUnstable).toBe(true);
    } finally {
      setSurfaceDebug(false);
    }
  });

  test('stable data is not flagged unstable', async ({ expect }) => {
    setSurfaceDebug(true);
    surfaceMetrics.clear();
    try {
      await using harness = await createTestApp({ plugins: [TestPlugin()] });

      // Same `data` reference across renders.
      const STABLE = { k: 1 };
      let bump: () => void = () => {};
      const Host = () => {
        const [, setN] = useState(0);
        bump = () => setN((n) => n + 1);
        return <SurfaceComponent type={RoleA} data={STABLE} />;
      };

      const view = render(harness, <Host />);
      await view.findByTestId('a');
      for (let i = 0; i < 5; i++) {
        act(() => bump());
      }
      await flushMetrics();

      const metric = surfaceMetrics.getSnapshot().find((entry) => entry.surfaceId === 'alpha');
      expect(metric?.dataUnstable).toBe(false);
    } finally {
      setSurfaceDebug(false);
    }
  });
});
