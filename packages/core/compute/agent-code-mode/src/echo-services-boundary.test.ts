//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import { describe, expect, onTestFinished, test } from 'vitest';

import { ClientRpcServer, makeClientServicesRpc } from '@dxos/client-protocol';
import { Filter, JsonSchema, Obj, Type } from '@dxos/echo';
import { EchoClient } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';

/**
 * The two contracts an out-of-process sandbox rests on, pinned here rather than discovered when a
 * worker fails to start.
 *
 * Code mode runs the model's code somewhere other than this thread, and that code needs a database.
 * Rather than invent a protocol for it, the sandbox reuses the boundary the client already speaks:
 * the host serves `ClientServices` over a port, and the far side is an ordinary `EchoClient`. What
 * cannot cross that boundary is the type registry — a registered type is a runtime class — so the
 * far side rebuilds each type from its JSON schema, which is how this codebase already ships
 * schemas to a remote runtime.
 */
describe('echo over the client-services boundary', () => {
  test('a client on the far side of a port reads the host database, with types rebuilt from JSON schema', async () => {
    const builder = new EchoTestBuilder();
    await builder.open();
    onTestFinished(async () => void (await builder.close()));

    const TYPENAME = 'com.example.type.task';
    const VERSION = '0.1.0';
    class Task extends Type.makeObject<Task>(DXN.make(TYPENAME, VERSION))(
      Schema.Struct({ title: Schema.String, status: Schema.String }),
    ) {}

    const peer = await builder.createPeer({ types: [Task] });
    const db = await peer.createDatabase();
    const task = db.add(Obj.make(Task, { title: 'Write the docs', status: 'open' }));
    await db.flush();

    // The host end serves the very services its own in-process client uses, over a real port.
    const channel = new MessageChannel();
    onTestFinished(() => {
      channel.port1.close();
      channel.port2.close();
    });
    const server = new ClientRpcServer({
      port: channel.port1,
      services: () => ({ DataService: peer.host.dataService, QueryService: peer.host.queryService }),
    });
    await server.open();
    onTestFinished(async () => void (await server.close()));

    // Everything below is what the far side does, wherever it runs.
    const scope = Effect.runSync(Scope.make());
    onTestFinished(() => EffectEx.runPromise(Scope.close(scope, Exit.void)));
    const rpc = await EffectEx.runPromise(makeClientServicesRpc(channel.port2).pipe(Scope.provide(scope)));

    const client = new EchoClient({});
    client.connectToService({ dataService: rpc, queryService: rpc });
    await client.open();
    onTestFinished(async () => void (await client.close()));

    // The class never crosses; only its JSON schema does.
    const rebuilt = Type.makeObjectFromJsonSchema({
      typename: TYPENAME,
      version: VERSION,
      jsonSchema: JsonSchema.toJsonSchema(Task),
    });
    expect(Type.getTypename(rebuilt)).toEqual(TYPENAME);
    await client.graph.registry.add([rebuilt]);

    const remote = client.constructDatabase({ spaceId: db.spaceId, spaceKey: db.spaceKey });
    await remote.setSpaceRoot(db.rootUrl!);
    await remote.open();
    onTestFinished(async () => void (await remote.close()));

    // Identity, not a copy: the far side resolved the same object the host wrote.
    const found = await remote.query(Filter.type(rebuilt)).run();
    expect(found.map((object) => object.id)).toEqual([task.id]);
  }, 30_000);
});
