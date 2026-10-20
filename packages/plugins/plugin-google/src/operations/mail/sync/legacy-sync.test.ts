//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as KeyValueStore from 'effect/persistence/KeyValueStore';
import * as Registry from 'effect/reactivity/AtomRegistry';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { ProcessManager, TriggerDispatcher, TriggerStateStore, credentialsLayerConfig } from '@dxos/compute-runtime';
import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Feed, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { AccessToken, Cursor } from '@dxos/link';

import { GoogleOperationHandlerSet } from '#operations';
import { GoogleOperation } from '#types';

const TestLayer = Layer.empty.pipe(
  Layer.provideMerge(TriggerDispatcher.layer({ timeControl: 'manual' })),
  Layer.provide(TriggerStateStore.layerMemory),
  Layer.provideMerge(ProcessManager.layer({ idGenerator: ProcessManager.SequentialIdGenerator })),
  Layer.provideMerge(
    ServiceResolver.layerRequirements(Database.Service, Capability.Service, Credential.CredentialsService),
  ),
  Layer.provideMerge(credentialsLayerConfig([])),
  Layer.provideMerge(Layer.succeed(Capability.Service, CapabilityManager.make({ registry: Registry.make() }))),
  Layer.provideMerge(
    TestDatabaseLayer({
      types: [Operation.PersistentOperation, Trigger.Trigger, Cursor.Cursor, Feed.Feed, AccessToken.AccessToken],
    }),
  ),
  Layer.provideMerge(KeyValueStore.layerMemory),
  Layer.provideMerge(OperationHandlerSet.provide(GoogleOperationHandlerSet.handlers)),
  Layer.provideMerge(Registry.layer),
  Layer.provideMerge(Trace.layerNoop),
);

describe('legacy Gmail sync key', () => {
  it.effect(
    'the handler set resolves the key persisted by per-binding sync Routines',
    Effect.fnUntraced(function* ({ expect }) {
      const handler = yield* OperationHandlerSet.getHandlerByKey(
        GoogleOperationHandlerSet.handlers,
        'dxn:org.dxos.plugin.inbox.operation.googleMailSync',
      );
      expect(handler.meta.key).toBe(GoogleOperation.LegacyGoogleMailSync.meta.key);
    }),
  );

  it.effect(
    'a trigger wired to the legacy key runs its handler instead of failing with NoHandlerError',
    Effect.fnUntraced(function* ({ expect }) {
      // A binding that is not an external cursor is skipped, so the run needs no Gmail credentials.
      const feed = yield* Database.add(Feed.make());
      const binding = yield* Database.add(
        Cursor.make({ spec: { kind: 'feed', source: Ref.make(feed), target: Ref.make(feed) } }),
      );

      expect(yield* fireLegacyTrigger(binding)).toEqual({ newMessages: 0 });
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'a binding whose Mailbox was deleted is skipped instead of failing the trigger',
    Effect.fnUntraced(function* ({ expect }) {
      const accessToken = yield* Database.add(AccessToken.make({ source: 'google.com', token: 'unused' }));
      const target = yield* Database.add(Feed.make());
      const binding = yield* Database.add(
        Cursor.makeExternal({ source: Ref.make(accessToken), target: Ref.make(target) }),
      );
      yield* Database.remove(target);

      expect(yield* fireLegacyTrigger(binding)).toEqual({ newMessages: 0 });
    }, Effect.provide(TestLayer)),
  );
});

/** Fires a timer trigger wired the way per-binding sync Routines persisted it; yields the output or the failure text. */
const fireLegacyTrigger = (binding: Cursor.Cursor) =>
  Effect.gen(function* () {
    const { db } = yield* Database.Service;
    db.registry.add([Operation.serialize(GoogleOperation.LegacyGoogleMailSync)]);
    const trigger = yield* Database.add(
      Trigger.make({
        runnable: Ref.fromURI(GoogleOperation.LegacyGoogleMailSync.meta.key),
        enabled: true,
        spec: Trigger.specTimer('*/10 * * * *'),
        input: { binding: Ref.make(binding) },
      }),
    );

    const dispatcher = yield* TriggerDispatcher;
    const { result } = yield* dispatcher.invokeTrigger({ trigger, event: { tick: 0 } });
    return Exit.isFailure(result) ? Cause.pretty(result.cause) : result.value;
  });
