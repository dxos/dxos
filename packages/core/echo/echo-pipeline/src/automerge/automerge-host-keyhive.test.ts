//
// Copyright 2025 DXOS.org
//

import { type DocumentId } from '@automerge/automerge-repo';
import { Access, initKeyhiveWasm } from '@automerge/automerge-repo-keyhive';
import { beforeAll, describe, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';

import { TestReplicationNetwork } from '../testing';

import { AutomergeHost } from './automerge-host';

const TIMEOUT = 30_000;

const createLevel = async () => {
  const level = createTestLevel();
  await openAndClose(level);
  return level;
};

describe('AutomergeHost with keyhive', () => {
  beforeAll(() => {
    initKeyhiveWasm();
  });

  test(
    'two hosts replicate documents through keyhive',
    async ({ expect }) => {
      const network = await new TestReplicationNetwork().open();
      onTestFinished(async () => {
        await network.close();
      });

      const host1 = new AutomergeHost({
        db: await createLevel(),
        keyhive: { peerIdSuffix: 'host1' },
      });
      await host1.open();
      onTestFinished(async () => {
        await host1.close();
      });

      const host2 = new AutomergeHost({
        db: await createLevel(),
        keyhive: { peerIdSuffix: 'host2' },
      });
      await host2.open();
      onTestFinished(async () => {
        await host2.close();
      });

      await host1.addReplicator(await network.createReplicator());
      await host2.addReplicator(await network.createReplicator());

      const handle1 = await host1.createDoc<{ text: string }>();
      handle1.change((doc: any) => {
        doc.text = 'Hello through keyhive';
      });
      await host1.flush();

      const handle2 = await host2.loadDoc<{ text: string }>(Context.default(), handle1.url);
      await handle2.whenReady();
      expect(handle2.doc()?.text).to.equal('Hello through keyhive');
    },
    TIMEOUT,
  );

  test(
    'two hosts replicate multiple documents through keyhive',
    async ({ expect }) => {
      const network = await new TestReplicationNetwork().open();
      onTestFinished(async () => {
        await network.close();
      });

      const host1 = new AutomergeHost({
        db: await createLevel(),
        keyhive: { peerIdSuffix: 'host1' },
      });
      await host1.open();
      onTestFinished(async () => {
        await host1.close();
      });

      const host2 = new AutomergeHost({
        db: await createLevel(),
        keyhive: { peerIdSuffix: 'host2' },
      });
      await host2.open();
      onTestFinished(async () => {
        await host2.close();
      });

      await host1.addReplicator(await network.createReplicator());
      await host2.addReplicator(await network.createReplicator());

      const documentIds: DocumentId[] = [];
      for (let idx = 0; idx < 5; idx++) {
        const handle = await host1.createDoc({ index: idx, text: `doc-${idx}` });
        documentIds.push(handle.documentId);
      }
      await host1.flush();

      for (const documentId of documentIds) {
        await expect.poll(() => host2.getHeads([documentId]).then((heads) => heads[0])).toBeTruthy();
      }
    },
    TIMEOUT,
  );

  test(
    'access control: granted peer can replicate document',
    async ({ expect }) => {
      const network = await new TestReplicationNetwork().open();
      onTestFinished(async () => {
        await network.close();
      });

      const host1 = new AutomergeHost({
        db: await createLevel(),
        keyhive: { peerIdSuffix: 'host1', accessControl: true },
      });
      await host1.open();
      onTestFinished(async () => {
        await host1.close();
      });

      const host2 = new AutomergeHost({
        db: await createLevel(),
        keyhive: { peerIdSuffix: 'host2' },
      });
      await host2.open();
      onTestFinished(async () => {
        await host2.close();
      });

      const kh1 = host1.keyhive!;
      const kh2 = host2.keyhive!;

      // Exchange contact cards so host1 can grant membership to host2.
      const contactCard1 = await kh1.keyhive.getExistingContactCard();
      const contactCard2 = await kh2.keyhive.getExistingContactCard();
      await kh1.receiveContactCard(contactCard2);
      await kh2.receiveContactCard(contactCard1);

      const handle1 = await host1.createDoc<{ text: string }>();
      handle1.change((doc: any) => {
        doc.text = 'Access controlled doc';
      });
      await host1.flush();

      // Grant write access to host2.
      const writeAccess = Access.tryFromString('write')!;
      await kh1.addMemberToDoc(handle1.url, contactCard2, writeAccess);

      // Connect after granting access.
      await host1.addReplicator(await network.createReplicator());
      await host2.addReplicator(await network.createReplicator());

      const handle2 = await host2.loadDoc<{ text: string }>(Context.default(), handle1.url);
      await handle2.whenReady();
      expect(handle2.doc()?.text).to.equal('Access controlled doc');
    },
    TIMEOUT,
  );

  test(
    'access control: non-granted peer cannot replicate document',
    async ({ expect }) => {
      const network = await new TestReplicationNetwork().open();
      onTestFinished(async () => {
        await network.close();
      });

      const host1 = new AutomergeHost({
        db: await createLevel(),
        keyhive: { peerIdSuffix: 'host1', accessControl: true },
      });
      await host1.open();
      onTestFinished(async () => {
        await host1.close();
      });

      const host2 = new AutomergeHost({
        db: await createLevel(),
        keyhive: { peerIdSuffix: 'host2' },
      });
      await host2.open();
      onTestFinished(async () => {
        await host2.close();
      });

      const kh1 = host1.keyhive!;
      const kh2 = host2.keyhive!;

      // Exchange contact cards (needed for keyhive to recognize the peer).
      const contactCard1 = await kh1.keyhive.getExistingContactCard();
      const contactCard2 = await kh2.keyhive.getExistingContactCard();
      await kh1.receiveContactCard(contactCard2);
      await kh2.receiveContactCard(contactCard1);

      // Create document — do NOT grant access to host2.
      const handle1 = await host1.createDoc<{ text: string }>();
      handle1.change((doc: any) => {
        doc.text = 'Secret doc';
      });
      await host1.flush();

      await host1.addReplicator(await network.createReplicator());
      await host2.addReplicator(await network.createReplicator());

      // host2 requests the document but should be denied — loadDoc times out.
      await expect(
        host2.loadDoc<{ text: string }>(Context.default(), handle1.url, { timeout: 3_000 }),
      ).rejects.toThrow();
    },
    TIMEOUT,
  );
});
