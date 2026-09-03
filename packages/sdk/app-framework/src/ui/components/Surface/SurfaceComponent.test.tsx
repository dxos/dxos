//
// Copyright 2026 DXOS.org
//

import { act } from '@testing-library/react';
import * as Effect from 'effect/Effect';
import React, { Profiler, useState } from 'react';
import { describe, test, vi } from 'vitest';

import { DXN } from '@dxos/keys';
import { Position } from '@dxos/util';

import { ActivationEvents, Capabilities } from '../../../common/index.ts';
import * as Role from '../../../common/Role.ts';
import { Capability, Plugin } from '../../../core/index.ts';
import { createTestApp } from '../../../testing/harness.ts';
import { render } from '../../../testing/react.tsx';
import { SurfaceComponent, useIsSurfaceAvailable, useSurfaces } from './SurfaceComponent.tsx';
import { setSurfaceDebug } from './SurfaceDebug.tsx';
import { surfaceMetrics } from './SurfaceMetrics.ts';
import { type Definition, create, makeFilter } from './types.ts';

// Flush the metrics store's rAF-batched notification (the actual signal it uses), not a fixed delay.
const flushMetrics = () =>
  act(async () => {
    await new Promise<void>((resolve) =>
      typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => resolve()) : queueMicrotask(resolve),
    );
  });

const RoleA = Role.make<Record<string, unknown>>('org.dxos.test.role.alpha');
const RoleB = Role.make<Record<string, unknown>>('org.dxos.test.role.beta');

const testMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.test.surfacePerf'), name: 'SurfacePerfTest' });

const TestPlugin = Plugin.define(testMeta).pipe(
  Plugin.addModule({
    id: 'surfaces',
    provides: [Capabilities.ReactSurface],
    activate: () =>
      Effect.succeed([
        Capability.contributeAll(Capabilities.ReactSurface, [
          create({ id: 'alpha', filter: makeFilter(RoleA), component: () => <span data-testid='a' /> }),
          create({ id: 'beta', filter: makeFilter(RoleB), component: () => <span data-testid='b' /> }),
        ]),
      ]),
  }),
  Plugin.make,
);

// Exercises `props`: `Plain` takes its own props, so registering it needs no adapter component.
const RoleSubject = Role.make<{ subject: string }>('org.dxos.test.role.subject');
const RoleEnvelope = Role.make<{ subject: string }>('org.dxos.test.role.envelope');

const Plain = ({ label }: { label: string }) => <span data-testid='mapped'>{label}</span>;

const mappedPropsMeta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.test.surfaceMappedProps'),
  name: 'SurfaceMappedPropsTest',
});

const MappedPropsPlugin = Plugin.define(mappedPropsMeta).pipe(
  Plugin.addModule({
    id: 'surfaces',
    provides: [Capabilities.ReactSurface],
    activate: () =>
      Effect.succeed([
        Capability.contributeAll(Capabilities.ReactSurface, [
          create({
            id: 'mapped',
            filter: makeFilter(RoleSubject),
            component: Plain,
            props: ({ data: { subject } }) => ({ label: subject }),
          }),
          create({
            id: 'envelope',
            filter: makeFilter(RoleEnvelope),
            component: ({ data: { subject } }) => <span data-testid='envelope'>{subject}</span>,
          }),
        ]),
      ]),
  }),
  Plugin.make,
);

const invalidIdMeta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.test.surfaceInvalidId'),
  name: 'SurfaceInvalidIdTest',
});

// Contributes a single surface with a hyphenated (invalid) local id for role A.
// Widened to `string` so it reaches the runtime check: `DXN.Path` rejects a malformed literal at the
// authoring site, and this exercises the computed ids it deliberately lets through.
const invalidId: string = 'gallery-article';

const InvalidIdPlugin = Plugin.define(invalidIdMeta).pipe(
  Plugin.addModule({
    id: 'surfaces',
    provides: [Capabilities.ReactSurface],
    activate: () =>
      Effect.succeed([
        Capability.contributeAll(Capabilities.ReactSurface, [
          create({ id: invalidId, filter: makeFilter(RoleA), component: () => <span data-testid='invalid' /> }),
        ]),
      ]),
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
    // Dispatch is synchronous (render() flushes effects in act), so the surface either rendered or it didn't.
    const view = render(harness, <SurfaceComponent type={RoleA} limit={0} />);
    expect(view.queryByTestId('a')).toBeNull();
  });

  test('drops a surface with an invalid id rather than dispatching it', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [InvalidIdPlugin()] });
    const view = render(harness, <SurfaceComponent type={RoleA} />);
    expect(view.queryByTestId('invalid')).toBeNull();
  });

  test('`props` maps the surface props onto a plain component', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [MappedPropsPlugin()] });
    const view = render(harness, <SurfaceComponent type={RoleSubject} data={{ subject: 'mapped' }} />);
    // The component receives only `{ label }`, never the surface's `data` envelope.
    expect((await view.findByTestId('mapped')).textContent).toBe('mapped');
  });

  test('a surface without `props` still receives the full surface props', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [MappedPropsPlugin()] });
    const view = render(harness, <SurfaceComponent type={RoleEnvelope} data={{ subject: 'envelope' }} />);
    expect((await view.findByTestId('envelope')).textContent).toBe('envelope');
  });
});

const RoleGated = Role.make<Record<string, unknown>>('org.dxos.test.role.gated');

const gatedMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.test.surfaceGated'), name: 'SurfaceGatedTest' });

// The surface module parks on its role's demand event instead of activating at startup —
// the shape the surface maker's `roles` option produces.
const GatedPlugin = Plugin.define(gatedMeta).pipe(
  Plugin.addModule({
    id: 'surfaces',
    provides: [Capabilities.ReactSurface],
    activatesOn: ActivationEvents.SurfacesRequested(RoleGated.role),
    activate: () =>
      Effect.succeed([
        Capability.contributeAll(Capabilities.ReactSurface, [
          create({ id: 'gated', filter: makeFilter(RoleGated), component: () => <span data-testid='gated' /> }),
        ]),
      ]),
  }),
  Plugin.make,
);

describe('SurfaceComponent demand activation', () => {
  test('a role-gated module loads when a surface for its role first renders', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [GatedPlugin()] });
    const view = render(harness, <SurfaceComponent type={RoleGated} />);
    // The mount fires SurfacesRequested(role); the module activates and its contribution
    // re-renders the surface through the candidates atom.
    expect(await view.findByTestId('gated')).toBeTruthy();
  });

  test('an availability miss fires the demand event so later checks see the module', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [GatedPlugin()] });
    let bump: () => void = () => {};
    const Probe = () => {
      const isSurfaceAvailable = useIsSurfaceAvailable();
      const [, setN] = useState(0);
      bump = () => setN((n) => n + 1);
      return <span data-testid='gated-available'>{String(isSurfaceAvailable({ type: RoleGated }))}</span>;
    };
    const view = render(harness, <Probe />);
    expect((await view.findByTestId('gated-available')).textContent).toBe('false');
    // The returned callback is deliberately non-reactive, so re-check on a fresh render.
    await vi.waitFor(() => {
      act(() => bump());
      expect(view.getByTestId('gated-available').textContent).toBe('true');
    });
  });
});

//
// A role served by BOTH an eager catch-all (`Position.last`, matching anything) and a gated module
// whose activation is held open by a latch — the shape behind #12717, where plugin-space's record
// article claimed a feed plank for a second while plugin-magazine's chunk loaded.
//

const RoleHeld = Role.make<Record<string, unknown>>('org.dxos.test.role.held');

const catchAllMeta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.test.surfaceCatchAll'),
  name: 'SurfaceCatchAllTest',
});

const CatchAllPlugin = Plugin.define(catchAllMeta).pipe(
  Plugin.addModule({
    id: 'surfaces',
    provides: [Capabilities.ReactSurface],
    activate: () =>
      Effect.succeed([
        Capability.contributeAll(Capabilities.ReactSurface, [
          create({
            id: 'catchAll',
            position: Position.last,
            filter: makeFilter(RoleHeld),
            component: () => <span data-testid='catch-all' />,
          }),
        ]),
      ]),
  }),
  Plugin.make,
);

const specificMeta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.test.surfaceSpecific'),
  name: 'SurfaceSpecificTest',
});

const SpecificPlugin = Plugin.define(specificMeta).pipe(
  Plugin.addModule({
    id: 'surfaces',
    provides: [Capabilities.ReactSurface],
    activate: () =>
      Effect.succeed([
        Capability.contributeAll(Capabilities.ReactSurface, [
          create({ id: 'specific', filter: makeFilter(RoleHeld), component: () => <span data-testid='specific' /> }),
        ]),
      ]),
  }),
  Plugin.make,
);

const heldMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.test.surfaceHeld'), name: 'SurfaceHeldTest' });

/** A role-gated surface module whose activation completes only when the returned latch is released. */
const makeHeldPlugin = () => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const plugin = Plugin.define(heldMeta).pipe(
    Plugin.addModule({
      id: 'surfaces',
      provides: [Capabilities.ReactSurface],
      activatesOn: ActivationEvents.SurfacesRequested(RoleHeld.role),
      activate: () =>
        Effect.promise(() => gate).pipe(
          Effect.map(() => [
            Capability.contributeAll(Capabilities.ReactSurface, [
              create({ id: 'held', filter: makeFilter(RoleHeld), component: () => <span data-testid='held' /> }),
            ]),
          ]),
        ),
    }),
    Plugin.make,
  );
  return { plugin, release: () => release() };
};

describe('SurfaceComponent fallback hold', () => {
  test("withholds a catch-all while the role's own module is still activating", async ({ expect }) => {
    const { plugin, release } = makeHeldPlugin();
    await using harness = await createTestApp({ plugins: [CatchAllPlugin(), plugin()] });

    const view = render(harness, <SurfaceComponent type={RoleHeld} />);
    // The catch-all matches and is already loaded, but rendering it here is the flash: the role's
    // own module has not settled, so nothing renders yet.
    expect(view.queryByTestId('catch-all')).toBeNull();
    expect(view.queryByTestId('held')).toBeNull();

    release();
    expect(await view.findByTestId('held')).toBeTruthy();
  });

  test('limit={0} renders nothing while the role is still activating', async ({ expect }) => {
    // `limit={0}` means render nothing, and a held fallback must not reintroduce output through the
    // placeholder — which is only visible with an explicit one, since the default is empty.
    const { plugin, release } = makeHeldPlugin();
    await using harness = await createTestApp({ plugins: [CatchAllPlugin(), plugin()] });

    const view = render(
      harness,
      <SurfaceComponent type={RoleHeld} limit={0} placeholder={<span data-testid='placeholder' />} />,
    );
    expect(view.queryByTestId('placeholder')).toBeNull();
    expect(view.queryByTestId('catch-all')).toBeNull();

    release();
  });

  test('renders the catch-all once no gated module for the role is left activating', async ({ expect }) => {
    // Guards the hazard in #12717: a hold that never lifts would strand every plank whose role has
    // only a fallback.
    await using harness = await createTestApp({ plugins: [CatchAllPlugin()] });
    const view = render(harness, <SurfaceComponent type={RoleHeld} />);
    expect(await view.findByTestId('catch-all')).toBeTruthy();
  });

  test('a specific match renders immediately, without waiting for the gated module', async ({ expect }) => {
    const { plugin, release } = makeHeldPlugin();
    await using harness = await createTestApp({ plugins: [SpecificPlugin(), plugin()] });

    const view = render(harness, <SurfaceComponent type={RoleHeld} />);
    // Only fallbacks are held; a surface that already has real content shows it.
    expect(await view.findByTestId('specific')).toBeTruthy();
    release();
  });
});

describe('useIsSurfaceAvailable', () => {
  const IsAvailableProbe = ({ role, testId }: { role: Role.Role<any>; testId: string }) => {
    const isSurfaceAvailable = useIsSurfaceAvailable();
    return <span data-testid={testId}>{String(isSurfaceAvailable({ type: role }))}</span>;
  };

  test('reports false when no surface is contributed for the role', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [] });
    const view = render(harness, <IsAvailableProbe role={RoleA} testId='result-none' />);
    expect((await view.findByTestId('result-none')).textContent).toBe('false');
  });

  test('reports true once a matching surface is contributed', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [TestPlugin()] });
    const view = render(harness, <IsAvailableProbe role={RoleA} testId='result-valid' />);
    expect((await view.findByTestId('result-valid')).textContent).toBe('true');
  });

  test('reports false when the only contribution for the role has an invalid id', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [InvalidIdPlugin()] });
    const view = render(harness, <IsAvailableProbe role={RoleA} testId='result-invalid' />);
    expect((await view.findByTestId('result-invalid')).textContent).toBe('false');
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
    console.log(
      `[surface-bench] ${rounds} unrelated contributions: roleA re-renders=${a.value - aBaseline}, ${elapsed.toFixed(1)}ms`,
    );
  });
});

// Reproduces the pre-change global subscription + per-render scan/sort dispatch.
const EMPTY_DATA: Record<string, unknown> = {};
const legacyFindCandidates = (surfaces: Definition[], role: string): Definition[] =>
  surfaces
    .filter((definition) =>
      Array.isArray(definition.role) ? definition.role.includes(role) : definition.role === role,
    )
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

  const roles = Array.from({ length: ROLE_COUNT }, (_, i) =>
    Role.make<Record<string, unknown>>(`org.dxos.test.role.r${i}`),
  );

  const benchMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.test.surfaceBench'), name: 'SurfaceBenchTest' });
  const BenchPlugin = Plugin.define(benchMeta).pipe(
    Plugin.addModule({
      id: 'surfaces',
      provides: [Capabilities.ReactSurface],
      activate: () =>
        Effect.succeed([
          Capability.contributeAll(
            Capabilities.ReactSurface,
            roles.flatMap((role, ri) =>
              Array.from({ length: SURFACES_PER_ROLE }, (_, si) =>
                create({ id: `r${ri}s${si}`, filter: makeFilter(role), component: () => <span /> }),
              ),
            ),
          ),
        ]),
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
            implementation: create({
              id: `extra${round}`,
              filter: makeFilter(role, () => false),
              component: () => null,
            }),
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
