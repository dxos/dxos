//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Operation from '@dxos/compute/Operation';
import { DXN, Obj, Ref, Type } from '@dxos/echo';
import { Connection } from '@dxos/link';

import * as ConnectorSpec from './ConnectorSpec.ts';

class Mailbox extends Type.makeObject<Mailbox>(DXN.make('org.dxos.test.targetConnectors.mailbox', '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String) }),
) {}

class Calendar extends Type.makeObject<Calendar>(DXN.make('org.dxos.test.targetConnectors.calendar', '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String) }),
) {}

const TestSync = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.targetConnectors.sync'), name: 'Test Sync' },
  input: Schema.Struct({ connection: Ref.Ref(Connection.Connection), priority: Schema.optional(Schema.String) }),
  output: Schema.Any,
});

const makeConnector = (id: string, targetTypename?: string): ConnectorSpec.ConnectorEntry => ({
  id,
  source: `${id}.example`,
  sync: { operation: TestSync, ...(targetTypename ? { targetTypename } : {}) },
});

/** A capability manager holding the given connectors, as the annotation resolver receives it. */
const withConnectors = (...connectors: ConnectorSpec.ConnectorEntry[]) => {
  const capabilities = CapabilityManager.make({ registry: Registry.make() });
  capabilities.contribute({ module: 'test', interface: ConnectorSpec.Connector, implementation: connectors });
  return capabilities;
};

describe('ConnectorSpec.idsForTarget', () => {
  test('resolves every connector that binds the object type', ({ expect }) => {
    const capabilities = withConnectors(
      makeConnector('gmail', Type.getTypename(Mailbox)),
      makeConnector('jmap-mail', Type.getTypename(Mailbox)),
      makeConnector('google-calendar', Type.getTypename(Calendar)),
    );

    expect(ConnectorSpec.idsForTarget(Obj.make(Mailbox, {}), capabilities)).toEqual(['gmail', 'jmap-mail']);
    expect(ConnectorSpec.idsForTarget(Obj.make(Calendar, {}), capabilities)).toEqual(['google-calendar']);
  });

  test('a targetless connector binds nothing', ({ expect }) => {
    // No `sync.targetTypename` — e.g. Google Contacts, which writes Person objects into the space.
    const capabilities = withConnectors(makeConnector('google-contacts'));
    expect(ConnectorSpec.idsForTarget(Obj.make(Mailbox, {}), capabilities)).toEqual([]);
  });

  test('a type with no registered provider resolves to nothing', ({ expect }) => {
    const capabilities = withConnectors(makeConnector('google-calendar', Type.getTypename(Calendar)));
    expect(ConnectorSpec.idsForTarget(Obj.make(Mailbox, {}), capabilities)).toEqual([]);
  });

  test('registering a provider is all it takes for a target type to offer it', ({ expect }) => {
    // The point of the inversion: the type names no providers, so this needs no edit to `Mailbox`.
    const before = withConnectors();
    expect(ConnectorSpec.idsForTarget(Obj.make(Mailbox, {}), before)).toEqual([]);

    const after = withConnectors(makeConnector('third-party-mail', Type.getTypename(Mailbox)));
    expect(ConnectorSpec.idsForTarget(Obj.make(Mailbox, {}), after)).toEqual(['third-party-mail']);
  });
});
