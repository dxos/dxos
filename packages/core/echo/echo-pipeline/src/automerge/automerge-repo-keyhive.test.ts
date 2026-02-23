//
// Copyright 2025 DXOS.org
//

import { type AutomergeUrl, type DocumentId, type PeerId, Repo, parseAutomergeUrl } from '@automerge/automerge-repo';
import {
  Access,
  type AutomergeRepoKeyhive,
  Identifier,
  DocumentId as KeyhiveDocumentId,
  initKeyhiveWasm,
  initializeAutomergeRepoKeyhive,
  verifyingKeyPeerIdWithoutSuffix,
} from '@automerge/automerge-repo-keyhive';
import { beforeAll, describe, onTestFinished, test } from 'vitest';

import { asyncTimeout, sleep } from '@dxos/async';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';

import { TestAdapter } from '../testing';

import { LevelDBStorageAdapter } from './leveldb-storage-adapter';

const TIMEOUT = 15_000;

const ALLOWED_ACCESS_LEVELS = new Set(['Pull', 'Read', 'Write', 'Admin']);

const identifierFromPeerId = (peerId: PeerId): Identifier => {
  const peerIdPrefix = verifyingKeyPeerIdWithoutSuffix(peerId);
  const verifyingKeyBytes = Uint8Array.from(atob(peerIdPrefix), (char) => char.charCodeAt(0));
  return new Identifier(verifyingKeyBytes);
};

const keyhiveDocIdFromAutomergeDocId = (documentId: DocumentId): KeyhiveDocumentId | undefined => {
  try {
    const { binaryDocumentId } = parseAutomergeUrl(`automerge:${documentId}` as AutomergeUrl);
    return new KeyhiveDocumentId(binaryDocumentId);
  } catch {
    return undefined;
  }
};

const createStorage = async () => {
  const level = createTestLevel();
  const storage = new LevelDBStorageAdapter({ db: level.sublevel('automerge') });
  await openAndClose(level, storage);
  return storage;
};

/**
 * Share config using keyhive access control for keyhive-managed documents.
 * `access` checks if the peer has sufficient keyhive access to the document.
 * `announce` uses the same check - only announce to peers that have access.
 * Non-keyhive documents default to allowed.
 */
const makeKeyhiveShareConfig = (kh: AutomergeRepoKeyhive) => {
  const checkAccess = async (peerId: PeerId, documentId: DocumentId): Promise<boolean> => {
    try {
      const khDocId = keyhiveDocIdFromAutomergeDocId(documentId);
      if (!khDocId) {
        return true;
      }
      const identifier = identifierFromPeerId(peerId);
      const access = await kh.keyhive.accessForDoc(identifier, khDocId);
      return access !== undefined && ALLOWED_ACCESS_LEVELS.has(access.toString());
    } catch {
      return true;
    }
  };

  return {
    access: checkAccess,
    announce: async (peerId: PeerId, documentId?: DocumentId): Promise<boolean> => {
      if (!documentId) {
        return false;
      }
      return checkAccess(peerId, documentId);
    },
  };
};

const exchangeContactCards = async (peer1: AutomergeRepoKeyhive, peer2: AutomergeRepoKeyhive) => {
  const contactCard1 = await peer1.keyhive.getExistingContactCard();
  const contactCard2 = await peer2.keyhive.getExistingContactCard();
  await peer1.receiveContactCard(contactCard2);
  await peer2.receiveContactCard(contactCard1);
};

const connectTestAdapters = async (adapters: [TestAdapter, TestAdapter]) => {
  await adapters[0].onConnect.wait();
  await adapters[1].onConnect.wait();
  adapters[0].peerCandidate(adapters[1].peerId!);
  adapters[1].peerCandidate(adapters[0].peerId!);
};

type KeyhivePeer = {
  kh: AutomergeRepoKeyhive;
  repo: Repo;
  adapter: TestAdapter;
};

/**
 * Creates a pair of keyhive-connected peers.
 * When ownerAccessControl is enabled, peer1 (owner) uses keyhive shareConfig for both access and announce.
 * Peer2 (receiver) always accepts to allow replication from authorized owners.
 */
const createKeyhivePeerPair = async (options?: {
  ownerAccessControl?: boolean;
}): Promise<[KeyhivePeer, KeyhivePeer]> => {
  const [testAdapter1, testAdapter2] = createSafeTestAdapterPair();
  const storage1 = await createStorage();
  const storage2 = await createStorage();

  const kh1 = await initializeAutomergeRepoKeyhive({
    storage: storage1,
    peerIdSuffix: 'peer1',
    networkAdapter: testAdapter1,
    periodicallyRequestSync: false,
  });

  const kh2 = await initializeAutomergeRepoKeyhive({
    storage: storage2,
    peerIdSuffix: 'peer2',
    networkAdapter: testAdapter2,
    periodicallyRequestSync: false,
  });

  const repo1 = new Repo({
    peerId: kh1.peerId,
    network: [kh1.networkAdapter],
    idFactory: kh1.idFactory,
    ...(options?.ownerAccessControl ? { shareConfig: makeKeyhiveShareConfig(kh1) } : { sharePolicy: async () => true }),
  });
  kh1.linkRepo(repo1);

  const repo2 = new Repo({
    peerId: kh2.peerId,
    network: [kh2.networkAdapter],
    idFactory: kh2.idFactory,
    sharePolicy: async () => true,
  });
  kh2.linkRepo(repo2);

  return [
    { kh: kh1, repo: repo1, adapter: testAdapter1 },
    { kh: kh2, repo: repo2, adapter: testAdapter2 },
  ];
};

/**
 * Creates a TestAdapter pair that silently drops messages when either adapter is disconnected.
 * This prevents unhandled rejections from keyhive's async signing pipeline during cleanup.
 */
const createSafeTestAdapterPair = (): [TestAdapter, TestAdapter] => {
  const pair = TestAdapter.createPair() as [TestAdapter, TestAdapter];
  const origReceive0 = pair[0].receive.bind(pair[0]);
  const origReceive1 = pair[1].receive.bind(pair[1]);
  pair[0].receive = (message) => {
    if (pair[0].peerId) {
      origReceive0(message);
    }
  };
  pair[1].receive = (message) => {
    if (pair[1].peerId) {
      origReceive1(message);
    }
  };
  return pair;
};

const cleanupPeers = async (...peers: KeyhivePeer[]) => {
  for (const peer of peers) {
    peer.kh.networkAdapter.disconnect();
  }
};

describe('AutomergeRepoKeyhive', () => {
  beforeAll(() => {
    initKeyhiveWasm();
  });

  test(
    'basic replication through keyhive network adapters',
    async ({ expect }) => {
      const [peer1, peer2] = await createKeyhivePeerPair();
      onTestFinished(() => cleanupPeers(peer1, peer2));

      await connectTestAdapters([peer1.adapter, peer2.adapter]);

      const handle = peer1.repo.create<{ text: string }>();
      handle.change((doc: any) => {
        doc.text = 'Hello from keyhive';
      });

      const remoteHandle = await peer2.repo.find<{ text: string }>(handle.url);
      await asyncTimeout(remoteHandle.whenReady(), 5_000);
      expect(remoteHandle.doc()?.text).to.equal('Hello from keyhive');
    },
    TIMEOUT,
  );

  test(
    'document created with keyhive idFactory has keyhive-managed ID',
    async ({ expect }) => {
      const [peer1, peer2] = await createKeyhivePeerPair();
      onTestFinished(() => cleanupPeers(peer1, peer2));

      await connectTestAdapters([peer1.adapter, peer2.adapter]);

      const handle = await peer1.repo.create2<{ text: string }>();
      handle.change((doc: any) => {
        doc.text = 'Keyhive-managed doc';
      });

      const khDocId = keyhiveDocIdFromAutomergeDocId(handle.documentId);
      expect(khDocId).not.toBeUndefined();

      const doc = await peer1.kh.keyhive.getDocument(khDocId!);
      expect(doc).not.toBeUndefined();

      const remoteHandle = await peer2.repo.find<{ text: string }>(handle.url);
      await asyncTimeout(remoteHandle.whenReady(), 5_000);
      expect(remoteHandle.doc()?.text).to.equal('Keyhive-managed doc');
    },
    TIMEOUT,
  );

  test(
    'access control: granted peer can replicate document',
    async ({ expect }) => {
      const [peer1, peer2] = await createKeyhivePeerPair({ ownerAccessControl: true });
      onTestFinished(() => cleanupPeers(peer1, peer2));

      await exchangeContactCards(peer1.kh, peer2.kh);

      const handle = await peer1.repo.create2<{ text: string }>();
      handle.change((doc: any) => {
        doc.text = 'Access controlled doc';
      });

      const writeAccess = Access.tryFromString('write')!;
      const contactCard2 = await peer2.kh.keyhive.getExistingContactCard();
      await peer1.kh.addMemberToDoc(handle.url, contactCard2, writeAccess);

      await connectTestAdapters([peer1.adapter, peer2.adapter]);

      const remoteHandle = await peer2.repo.find<{ text: string }>(handle.url);
      await asyncTimeout(remoteHandle.whenReady(), 5_000);
      expect(remoteHandle.doc()?.text).to.equal('Access controlled doc');
    },
    TIMEOUT,
  );

  test(
    'access control: non-granted peer cannot replicate document',
    async ({ expect }) => {
      const [peer1, peer2] = await createKeyhivePeerPair({ ownerAccessControl: true });
      onTestFinished(() => cleanupPeers(peer1, peer2));

      await exchangeContactCards(peer1.kh, peer2.kh);

      const handle = await peer1.repo.create2<{ text: string }>();
      handle.change((doc: any) => {
        doc.text = 'Secret doc';
      });

      // Do NOT grant access to peer2.
      await connectTestAdapters([peer1.adapter, peer2.adapter]);

      const remoteHandle = await peer2.repo.find<{ text: string }>(handle.url, {
        allowableStates: ['requesting', 'unavailable'],
      });
      await sleep(2_000);
      expect(remoteHandle.isReady()).to.be.false;
    },
    TIMEOUT,
  );

  test(
    'access control: revoked peer stops receiving updates',
    async ({ expect }) => {
      const [peer1, peer2] = await createKeyhivePeerPair({ ownerAccessControl: true });
      onTestFinished(() => cleanupPeers(peer1, peer2));

      await exchangeContactCards(peer1.kh, peer2.kh);

      const handle = await peer1.repo.create2<{ text: string }>();
      handle.change((doc: any) => {
        doc.text = 'Shared doc';
      });

      const writeAccess = Access.tryFromString('write')!;
      const contactCard2 = await peer2.kh.keyhive.getExistingContactCard();
      await peer1.kh.addMemberToDoc(handle.url, contactCard2, writeAccess);

      await connectTestAdapters([peer1.adapter, peer2.adapter]);

      const remoteHandle = await peer2.repo.find<{ text: string }>(handle.url);
      await asyncTimeout(remoteHandle.whenReady(), 5_000);
      expect(remoteHandle.doc()?.text).to.equal('Shared doc');

      // Revoke access.
      const contactCard2Hex = Array.from(contactCard2.id.toBytes())
        .map((byte: number) => byte.toString(16).padStart(2, '0'))
        .join('');
      await peer1.kh.revokeMemberFromDoc(handle.url, contactCard2Hex);
      peer1.repo.shareConfigChanged();

      // New changes from owner should not be replicated after revocation.
      handle.change((doc: any) => {
        doc.text = 'Updated after revocation';
      });

      await sleep(2_000);
      expect(remoteHandle.doc()?.text).not.to.equal('Updated after revocation');
    },
    TIMEOUT,
  );
});
