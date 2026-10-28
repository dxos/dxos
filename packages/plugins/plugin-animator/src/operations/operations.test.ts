//
// Copyright 2026 DXOS.org
//

import { beforeEach, describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import { AnimatorOperationHandlerSet } from '#operations';
import { Animation, AnimatorCapabilities, AnimatorOperation } from '#types';

import { Dots, dotsStage, makeDots } from '../testing/index.ts';

let manager: ReturnType<typeof CapabilityManager.make>;

// `Layer.sync`: built per test, after `beforeEach` has replaced the manager.
const TestLayer = AssistantTestLayer({
  operationHandlers: AnimatorOperationHandlerSet.handlers,
  types: [Animation.Animation, Animation.Effect, Dots],
  extraServices: Layer.sync(Capability.Service, () => manager),
  disableLlmMemoization: true,
});

const setup = Effect.fn(function* () {
  const dots = yield* Database.add(
    makeDots([
      { id: 'a', label: 'A', x: 0, y: 0, color: '#ff0000' },
      { id: 'b', label: 'B', x: 10, y: 0, color: '#0000ff' },
    ]),
  );
  const { animation } = yield* Operation.invoke(AnimatorOperation.CreateAnimation, {
    name: 'Film',
    stages: [Ref.make(dots), Ref.make(dots)],
  });
  const loaded = yield* Database.load(animation);
  return { animation, loaded };
});

describe('animator operations', () => {
  beforeEach(() => {
    const registry = AtomRegistry.make();
    manager = CapabilityManager.make({ registry });
    manager.contribute({ module: 'test', interface: Capabilities.AtomRegistry, implementation: registry });
    manager.contribute({ module: 'test', interface: AnimatorCapabilities.Stage, implementation: dotsStage });
  });

  it.effect(
    'create an animation with a shot per stage',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { loaded } = yield* setup();
        expect(loaded.name).toBe('Film');
        expect(loaded.fps).toBe(Animation.DEFAULT_FPS);
        expect(loaded.shots).toHaveLength(2);
        expect(loaded.shots[0].timeline.tracks).toEqual({});
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'key a target property, the camera, and past the end of a shot',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { animation, loaded } = yield* setup();
        const shot = loaded.shots[0].id;
        const first = yield* Operation.invoke(AnimatorOperation.SetKey, {
          animation,
          shot,
          t: 1,
          path: 'a:position',
          value: { x: 5, y: 5 },
        });
        expect(first.keys).toBe(1);
        yield* Operation.invoke(AnimatorOperation.SetKey, { animation, shot, t: 2, path: 'camera:zoom', value: 2 });
        yield* Operation.invoke(AnimatorOperation.SetKey, {
          animation,
          shot,
          t: 8,
          path: 'a:position',
          value: { x: 0, y: 0 },
        });
        const { timeline, duration } = loaded.shots[0];
        expect(timeline.tracks['a:position']).toMatchObject({ kind: 'point', keys: [{ t: 1 }, { t: 8 }] });
        expect(timeline.tracks['camera:zoom'].keys).toHaveLength(1);
        expect(duration).toBe(8);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a key on an unknown target, a property that is not animatable, or a missing shot fails',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { animation, loaded } = yield* setup();
        const shot = loaded.shots[0].id;
        const unknown = yield* Effect.exit(
          Operation.invoke(AnimatorOperation.SetKey, { animation, shot, t: 1, path: 'z:position', value: 0 }),
        );
        const inert = yield* Effect.exit(
          Operation.invoke(AnimatorOperation.SetKey, { animation, shot, t: 1, path: 'a:label', value: 'x' }),
        );
        const missing = yield* Effect.exit(
          Operation.invoke(AnimatorOperation.SetKey, { animation, shot: 'nope', t: 1, path: 'a:scale', value: 1 }),
        );
        expect(Exit.isFailure(unknown)).toBe(true);
        expect(Exit.isFailure(inert)).toBe(true);
        expect(Exit.isFailure(missing)).toBe(true);
        expect(loaded.shots[0].timeline.tracks).toEqual({});
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'set a script; one naming an unknown target fails and leaves the shot',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { animation, loaded } = yield* setup();
        const shot = loaded.shots[1].id;
        const { keys } = yield* Operation.invoke(AnimatorOperation.SetScript, {
          animation,
          shot,
          script: [
            { duration: 1, show: ['b'] },
            { duration: 1, layout: { kind: 'ring', targets: ['a', 'b'] } },
          ],
        });
        expect(keys).toBeGreaterThan(0);
        expect(loaded.shots[1].script).toHaveLength(2);

        const failed = yield* Effect.exit(
          Operation.invoke(AnimatorOperation.SetScript, { animation, shot, script: [{ duration: 1, show: ['z'] }] }),
        );
        expect(Exit.isFailure(failed)).toBe(true);
        expect(loaded.shots[1].script).toHaveLength(2);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
