//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import * as Operation from '@dxos/compute/Operation';
import { DXN, Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { Connection, Cursor } from '@dxos/link';
import { OAuthProvider } from '@dxos/protocols';

import { ConnectorAnnotations, ConnectorSpec } from '#types';

import * as ConnectorAuth from '../ConnectorAuth.ts';
import connectorGraphBuilder from './app-graph-builder.ts';

const SUBJECT_ID = 'subject';

const TestSync = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.connectorAuthGraph.sync'), name: 'Test Sync' },
  input: Schema.Struct({ connection: Ref.Ref(Connection.Connection), priority: Schema.optional(Schema.String) }),
  output: Schema.Any,
});

/** A bindable target, annotated exactly as Mailbox and Calendar are. */
class Target extends Type.makeObject<Target>(DXN.make('org.dxos.test.connectorAuthGraph.target', '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String) }).pipe(
    ConnectorAnnotations.ConnectorAuthAnnotation.set({ connectorIds: ConnectorSpec.idsForTarget, bindTarget: true }),
  ),
) {}

/** A provider for that target, with an auth flow so it is offered rather than merely reusable. */
const provider: ConnectorSpec.ConnectorEntry = {
  id: 'test-mail',
  source: 'mail.test',
  label: 'Test Mail',
  oauth: { provider: OAuthProvider.GOOGLE, scopes: [] },
  sync: { operation: TestSync, targetTypename: Type.getTypename(Target) },
};

/**
 * The toolbar's Connect control, driven through the real extension.
 *
 * A unit test over `ConnectorAuth.actions` cannot see what matters here: the extension decides from the
 * reactive connector list, where a provider that has not activated yet looks exactly like one that is
 * not installed — which is how a disabled placeholder came to stick on a toolbar whose provider was
 * present all along.
 */
describe('connectorAuth graph extension', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('offers an enabled Connect group once a provider is registered', async ({ expect }) => {
    const group = await getConnectGroup([provider]);

    expect(group).toBeDefined();
    // The regression: a provider is installed, so this must be actionable, not a disabled placeholder.
    expect(group?.properties?.disabled).toBe(false);
    // The group's children are materialized as its own actions by app-graph, not as an inline array.
    expect(await getGroupChildIds(group)).toContain(`connect-${provider.id}`);
  });

  test('offers a disabled Connect group when providers exist but none binds this type', async ({ expect }) => {
    const group = await getConnectGroup([{ ...provider, id: 'other', sync: undefined }]);

    expect(group?.properties?.disabled).toBe(true);
    expect(await getGroupChildIds(group)).toEqual([]);
  });

  test('contributes nothing while the connector registry is still empty', async ({ expect }) => {
    // Startup: provider modules activate lazily. An empty registry means "not yet", not "none
    // installed", so a disabled control here would freeze into the toolbar and never recover.
    const group = await getConnectGroup([]);

    expect(group).toBeUndefined();
  });

  test('re-enables the placeholder when a binding provider registers later', async ({ expect }) => {
    // The reported bug, in sequence: a mailbox that loaded before plugin-google/plugin-jmap activated
    // saw providers but none binding its type, so it got the disabled placeholder — and the live group
    // that replaced it once they registered carries no `disabled` key of its own, so a graph node that
    // merges properties over the previous generation kept showing the frozen `true`. A mailbox created
    // after activation never had that first generation, which is why only pre-existing ones were dead.
    const group = await getConnectGroup([{ ...provider, id: 'other', sync: undefined }]);
    expect(group?.properties?.disabled).toBe(true);

    const enabled = await registerConnectors([{ ...provider, id: 'other', sync: undefined }, provider]);

    expect(enabled?.properties?.disabled).toBe(false);
    expect(await getGroupChildIds(enabled)).toContain(`connect-${provider.id}`);
  });

  let lastContext: ReturnType<typeof setupGraphBuilder> | undefined;
  let lastManager: CapabilityManager.CapabilityManager | undefined;

  /** Builds the graph the toolbar reads, with `connectors` registered as the provider list. */
  const getConnectGroup = async (connectors: ConnectorSpec.ConnectorEntry[]) => {
    const { db, graph: echoGraph } = await builder.createDatabase();
    echoGraph.registry.add([Target, Cursor.Cursor]);
    const target = db.add(Obj.make(Target, { name: 'Inbox' }));
    await db.flush({ indexes: true });

    // One registry for both: in the app the capability manager and the graph builder share it, and a
    // capability atom read through a different registry never sees the contributions.
    const registry = Registry.make();
    const manager = CapabilityManager.make({ registry });
    if (connectors.length > 0) {
      manager.contribute({ module: 'test', interface: ConnectorSpec.Connector, implementation: connectors });
    }

    // The module's effect requires a Scope; the extensions it returns are plain values that outlive it.
    const contribution: Capability.AnyContribution = await EffectEx.runPromise(
      Effect.scoped(connectorGraphBuilder().pipe(Effect.provideService(Capability.Service, manager))),
    );
    // A contribution carries its implementations in `values`; the graph builder wants the extensions.
    const extensions = contribution.values.flat() as AppGraphBuilder.BuilderExtensions;
    const rootExtensions = await EffectEx.runPromise(
      AppGraphBuilder.createExtension({
        id: 'testRoot',
        match: GraphNodeMatcher.whenRoot,
        connector: () => Effect.succeed([{ id: SUBJECT_ID, type: 'test', data: target }]),
      }),
    );

    const context = setupGraphBuilder({ registry, extensions: [rootExtensions, extensions].flat() });
    await context.expand(GraphNode.RootId);
    await context.expand(GraphNode.qualifyId(GraphNode.RootId, SUBJECT_ID), 'action');

    const actions: any[] = context.registry.get(
      context.graph.actions(GraphNode.qualifyId(GraphNode.RootId, SUBJECT_ID)),
    );
    lastContext = context;
    lastManager = manager;
    return actions.find((action) => action.id.endsWith(ConnectorAuth.GROUP_ID));
  };

  /** Registers a later provider list on the standing graph and re-reads the group it produces. */
  const registerConnectors = async (connectors: ConnectorSpec.ConnectorEntry[]) => {
    lastManager!.contribute({ module: 'late', interface: ConnectorSpec.Connector, implementation: connectors });
    await lastContext!.expand(GraphNode.qualifyId(GraphNode.RootId, SUBJECT_ID), 'action');
    const actions: any[] = lastContext!.registry.get(
      lastContext!.graph.actions(GraphNode.qualifyId(GraphNode.RootId, SUBJECT_ID)),
    );
    return actions.find((action) => action.id.endsWith(ConnectorAuth.GROUP_ID));
  };

  /** Ids of the entries inside a Connect group, unqualified, as the dropdown renders them. */
  const getGroupChildIds = async (group: any): Promise<string[]> => {
    if (!group || !lastContext) {
      return [];
    }
    await lastContext.expand(group.id, 'action');
    const children: any[] = lastContext.registry.get(lastContext.graph.actions(group.id));
    return children.map((child) => child.id.split('/').at(-1)!);
  };
});
