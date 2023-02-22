import { DocumentModel, MutationBuilder } from "@dxos/document-model";
import { createModelMutation, encodeModelMutation, genesisMutation } from "@dxos/echo-db";
import { PublicKey } from "@dxos/keys";
import { describe, test } from "@dxos/test";
import { DatabaseTestRig } from "../testing/database-test-rig";
import expect from 'expect';
import { log } from "@dxos/log";
import { Timeframe } from "@dxos/timeframe";

describe('database (unit)', () => {
  test('create object and reload', async () => {
    const rig = new DatabaseTestRig();
    const peer = await rig.createPeer();

    const id = PublicKey.random().toHex();
    peer.proxy.mutate(genesisMutation(id, DocumentModel.meta.type));
    peer.proxy.mutate(createModelMutation(id, encodeModelMutation(DocumentModel.meta, new MutationBuilder().set('test', 42).build())));

    peer.confirm();
    expect(peer.confirmed).toEqual(1);
    expect(peer.timeframe).toEqual(new Timeframe([[peer.key, 1]]))

    const state = peer.items.getItem(id)!.state;

    {
      await peer.reload()
      const stateAfterReload = peer.items.getItem(id)!.state;

      expect(stateAfterReload).toEqual(state);
    }
  })

  test('create object and reload from snapshot', async () => {
    const rig = new DatabaseTestRig();
    const peer = await rig.createPeer();

    const id = PublicKey.random().toHex();
    peer.proxy.mutate(genesisMutation(id, DocumentModel.meta.type));
    peer.proxy.mutate(createModelMutation(id, encodeModelMutation(DocumentModel.meta, new MutationBuilder().set('test', 42).build())));

    peer.confirm();
    expect(peer.confirmed).toEqual(1);
    expect(peer.timeframe).toEqual(new Timeframe([[peer.key, 1]]))
    peer.makeSnapshot();
    
    const state = peer.items.getItem(id)!.state;

    {
      await peer.reload()
      const stateAfterReload = peer.items.getItem(id)!.state;

      expect(stateAfterReload).toEqual(state);
    }
  })

  test('two peers replicate', async () => {
    const rig = new DatabaseTestRig();
    const peer1 = await rig.createPeer();
    const peer2 = await rig.createPeer();

    const id = PublicKey.random().toHex();
    peer1.proxy.mutate(genesisMutation(id, DocumentModel.meta.type));
    peer1.proxy.mutate(createModelMutation(id, encodeModelMutation(DocumentModel.meta, new MutationBuilder().set('test', 42).build())));
    peer1.confirm();

    peer2.replicate(peer1.timeframe);

    // TODO(dmaretskyi): Helper functions to compare state.
    expect(peer1.items.getItem(id)!.state).toEqual(peer1.items.getItem(id)!.state);
  })
})