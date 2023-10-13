//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { DocumentModel, type DocumentModelState, MutationBuilder } from '@dxos/document-model';
import { createModelMutation, encodeModelMutation, genesisMutation } from '@dxos/echo-db';
import { type WriteReceipt } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { MemorySignalManagerContext } from '@dxos/messaging';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { describe, test } from '@dxos/test';
import { Timeframe } from '@dxos/timeframe';
import { range } from '@dxos/util';

import { createServiceContext, syncItemsLocal } from '../testing';
import { performInvitation } from '../testing/invitation-utils';

describe('services/ServiceContext', () => {
  test('existing space is synchronized on device invitations', async () => {
    const networkContext = new MemorySignalManagerContext();
    const device1 = createServiceContext({ signalContext: networkContext });
    await device1.createIdentity();
    const space1 = await device1.dataSpaceManager!.createSpace();

    const itemId = PublicKey.random().toHex();
    await space1.dataPipeline.databaseHost!.getWriteStream()?.write({
      batch: genesisMutation(itemId, DocumentModel.meta.type),
    });

    let counter = 0;

    for (const _ in range(5)) {
      const receipts: WriteReceipt[] = [];
      for (const _ in range(50)) {
        receipts.push(
          await space1.dataPipeline.databaseHost!.getWriteStream()!.write({
            batch: createModelMutation(
              itemId,
              encodeModelMutation(DocumentModel.meta, new MutationBuilder().set('counter', ++counter).build()),
            ),
          }),
        );
      }

      await space1.dataPipeline.pipelineState!.waitUntilTimeframe(
        Timeframe.merge(...receipts.map((receipt) => new Timeframe([[receipt.feedKey, receipt.seq]]))),
      );

      await space1.createEpoch();
      log('epoch', { number: space1.dataPipeline.currentEpoch?.subject.assertion.number });
    }

    const device2 = createServiceContext({ signalContext: networkContext });
    await Promise.all(performInvitation({ host: device1, guest: device2, options: { kind: Invitation.Kind.DEVICE } }));

    await device2.dataSpaceManager!.waitUntilSpaceReady(space1!.key);
    const space2 = await device2.dataSpaceManager!.spaces.get(space1.key);

    log('peer 2', {
      currentEpoch: space2!.dataPipeline.currentEpoch?.subject.assertion.number,
      appliedEpoch: space2!.dataPipeline.appliedEpoch?.subject.assertion.number,
    });

    await space2?.dataPipeline.onNewEpoch.waitForCondition(
      () =>
        space2!.dataPipeline.appliedEpoch?.subject.assertion.number ===
        space1.dataPipeline.currentEpoch?.subject.assertion.number,
    );

    expect(space2!.dataPipeline.currentEpoch!.subject.assertion.number).to.equal(
      space1.dataPipeline.currentEpoch!.subject.assertion.number,
    );
    expect(space2!.dataPipeline.appliedEpoch!.subject.assertion.number).to.equal(
      space1.dataPipeline.appliedEpoch!.subject.assertion.number,
    );

    const item2 = space2!.dataPipeline.itemManager.entities.get(itemId);
    expect((item2!.state as DocumentModelState).data.counter).to.equal(counter);

    await syncItemsLocal(space1.dataPipeline, space2!.dataPipeline);
  });

  test('new space is synchronized on device invitations', async () => {
    const networkContext = new MemorySignalManagerContext();
    const device1 = createServiceContext({ signalContext: networkContext });
    await device1.createIdentity();

    const device2 = createServiceContext({ signalContext: networkContext });
    await Promise.all(performInvitation({ host: device1, guest: device2, options: { kind: Invitation.Kind.DEVICE } }));

    const space1 = await device1.dataSpaceManager!.createSpace();
    await device2.dataSpaceManager!.waitUntilSpaceReady(space1!.key);
    const space2 = await device2.dataSpaceManager!.spaces.get(space1.key);
    await syncItemsLocal(space1.dataPipeline, space2!.dataPipeline);
  }).tag('flaky');

  test('joined space is synchronized on device invitations', async () => {
    const networkContext = new MemorySignalManagerContext();
    const device1 = createServiceContext({ signalContext: networkContext });
    await device1.createIdentity();

    const device2 = createServiceContext({ signalContext: networkContext });
    await Promise.all(performInvitation({ host: device1, guest: device2, options: { kind: Invitation.Kind.DEVICE } }));

    const identity2 = createServiceContext({ signalContext: networkContext });
    await identity2.createIdentity();
    const space1 = await identity2.dataSpaceManager!.createSpace();
    await Promise.all(
      performInvitation({
        host: identity2,
        guest: device1,
        options: { kind: Invitation.Kind.SPACE, spaceKey: space1.key },
      }),
    );

    await device2.dataSpaceManager!.waitUntilSpaceReady(space1!.key);
    const space2 = await device2.dataSpaceManager!.spaces.get(space1.key);
    await syncItemsLocal(space1.dataPipeline, space2!.dataPipeline);
  });
});
