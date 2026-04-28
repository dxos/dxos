//
// Copyright 2026 DXOS.org
//

import {
  next as A,
  type Heads,
  change,
  clone,
  equals,
  from,
  getBackend,
  getHeads,
  save,
  saveSince,
} from '@automerge/automerge';
import {
  type AutomergeUrl,
  type DocHandle,
  type DocumentId,
  type DocumentProgress,
  type Message,
  type PeerId,
  type QueryState,
  Repo,
  type StorageAdapterInterface,
  generateAutomergeUrl,
  initSubduction,
  parseAutomergeUrl,
} from '@automerge/automerge-repo';
import { beforeAll, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, sleep } from '@dxos/async';
import { randomBytes } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';
import { isNonNullable } from '@dxos/util';

import { TestAdapter, type TestConnectionStateProvider } from '../testing';
import { LevelDBStorageAdapter } from './leveldb-storage-adapter';

const HOST_AND_CLIENT: [string, string] = ['host', 'client'];
const SUBDUCTION_SERVICE_NAME = 'test-subduction-service';
const FIND_STATES: readonly QueryStateName[] = ['ready', 'loading'];

type QueryStateName = QueryState<unknown>['state'];

const waitForQueryState = async (
  progress: DocumentProgress<unknown>,
  awaitStates: readonly QueryStateName[],
  { timeout }: { timeout?: number } = {},
): Promise<void> => {
  if (awaitStates.includes(progress.peek().state)) {
    return;
  }
  const trigger = new Trigger();
  const unsubscribe = progress.subscribe((state) => {
    if (awaitStates.includes(state.state)) {
      trigger.wake();
    } else if (state.state === 'failed' && !awaitStates.includes('failed')) {
      trigger.throw(state.error);
    }
  });
  try {
    await trigger.wait({ timeout });
  } finally {
    unsubscribe();
  }
};

const findInStates = async <T>(
  repo: Repo,
  url: AutomergeUrl,
  awaitStates: readonly QueryStateName[] = ['ready'],
): Promise<DocHandle<T>> => {
  const { documentId } = parseAutomergeUrl(url);
  const progress = repo.findWithProgress<T>(url);
  await waitForQueryState(progress, awaitStates);
  return repo.handles[documentId] as DocHandle<T>;
};

describe('AutomergeRepo with Subduction', () => {
  beforeAll(async () => {
    await initSubduction();
  });

  test('change events', () => {
    const repo = createRepo({ network: [] });
    const handle = repo.create<{ field?: string }>();

    let valueDuringChange: string | undefined;
    handle.addListener('change', () => {
      valueDuringChange = handle.doc()!.field;
    });

    handle.change((doc: any) => {
      doc.field = 'value';
    });

    expect(valueDuringChange).to.eq('value');
  });

  test('flush', async () => {
    const storage = await createLevelAdapter();
    const repo = createRepo({ network: [], storage });
    const handle = repo.create<{ field?: string }>();

    for (let i = 0; i < 10; i++) {
      const p = repo.flush([handle.documentId]);
      handle.change((doc: any) => {
        doc.field = (doc.field ?? '') + randomBytes(1024).toString('hex');
      });
      await p;
    }
  });

  test('getChangeByHash', async () => {
    const doc = from({ foo: 'bar' });
    const copy = clone(doc);
    const newDoc = change(copy, 'change', (doc: any) => {
      doc.foo = 'baz';
    });

    {
      const heads = getHeads(newDoc);
      const changes = heads.map((hash) => getBackend(newDoc).getChangeByHash(hash));
      expect(changes.length).to.equal(1);
      expect(changes[0]).to.not.be.null;
    }

    {
      const heads = getHeads(newDoc);
      const changes = heads.map((hash) => getBackend(doc).getChangeByHash(hash));
      expect(changes.length).to.equal(1);
      expect(changes[0]).to.be.null;
    }
  });

  test('heads equality', () => {
    const a: Heads = getHeads(from({ foo: 'bar' }));
    const b: Heads = getHeads(from({ foo: 'bar' }));
    const c: Heads = [...a];

    expect(equals(a, b)).to.be.false;
    expect(equals(a, c)).to.be.true;
  });

  test('documents missing from local storage go to loading state', async () => {
    const { repos, adapters } = await createHostClientRepoTopology();
    const [host] = repos;
    await connectAdapters(adapters);
    const url = 'automerge:3JN8F3Z4dUWEEKKFN7WE9gEGvVUT' as AutomergeUrl;

    const progress = host.findWithProgress(url);
    expect(progress.peek().state).to.equal('loading');
  });

  test('documents on disk go to ready state', async () => {
    const storage = await createLevelAdapter();
    let url: AutomergeUrl | undefined;

    {
      const repo = createRepo({ network: [], storage });
      const handle = repo.create<{ field?: string }>({ field: 'value' });
      url = handle.url;
      await repo.flush();
      await repo.shutdown();
    }

    {
      const repo = createRepo({ network: [], storage });
      const handle = await repo.find<{ field?: string }>(url as AutomergeUrl);
      await handle.whenReady(['ready']);
      expect(handle.doc()?.field).to.equal('value');
    }
  });

  describe('network', () => {
    test('basic networking', async () => {
      const { repos, adapters } = await createHostClientRepoTopology();
      const [host, client] = repos;
      await connectAdapters(adapters);

      const handle = host.create<{ text?: string }>();
      const text = 'Hello world';
      handle.change((doc: any) => {
        doc.text = text;
      });
      await waitForSubductionSave();

      await expect
        .poll(async () => (await client.find<{ text?: string }>(handle.url)).doc()?.text, { timeout: 5_000 })
        .toEqual(text);
    });

    test('share config does not gate subduction replication', async () => {
      const { repos, adapters } = await createHostClientRepoTopology({
        shareConfig: {
          access: async () => false,
          announce: async () => false,
        },
      });
      const [host, client] = repos;
      await connectAdapters(adapters);

      const handle = host.create<{ text?: string }>();
      handle.change((doc: any) => {
        doc.text = 'Hello world';
      });
      await waitForSubductionSave();

      await expect
        .poll(async () => (await client.find<{ text?: string }>(handle.url)).doc()?.text, { timeout: 5_000 })
        .toEqual('Hello world');
    });

    test('replication through a 4 peer chain', async () => {
      const { repos, adapters } = await createRepoTopology({
        peers: ['A', 'B', 'C', 'D'],
        connections: [
          ['A', 'B'],
          ['B', 'C'],
          ['C', 'D'],
        ],
      });
      const [repoA, repoB, repoC, repoD] = repos;
      await connectAdapters(adapters);

      const docA = repoA.create<{ text?: string }>();
      docA.change((doc: any) => {
        doc.text = 'Hello world';
      });
      await waitForSubductionSave();

      void findInStates(repoB, docA.url, FIND_STATES);
      void findInStates(repoC, docA.url, FIND_STATES);
      const docD = await findInStates<{ text?: string }>(repoD, docA.url, FIND_STATES);
      await expect.poll(() => docD.doc()?.text, { timeout: 5_000 }).toEqual('Hello world');
    });

    test('replication through a 3 peer chain', async () => {
      const { repos, adapters } = await createRepoTopology({
        peers: ['A', 'B', 'C'],
        connections: [
          ['A', 'B'],
          ['B', 'C'],
        ],
      });
      const [repoA, repoB, repoC] = repos;
      await connectAdapters(adapters);

      const docA = repoA.create<{ text?: string }>();
      docA.change((doc: any) => {
        doc.text = 'Hello world';
      });
      await waitForSubductionSave();

      void findInStates(repoB, docA.url, FIND_STATES);
      const docC = await findInStates<{ text?: string }>(repoC, docA.url, FIND_STATES);
      await expect.poll(() => docC.doc()?.text, { timeout: 5_000 }).toEqual('Hello world');
    });

    test('documents loaded from disk get replicated', async () => {
      const storage = await createLevelAdapter();
      let url: AutomergeUrl | undefined;

      {
        const peer1 = createRepo({ network: [], storage });
        const handle = peer1.create({ text: 'foo' });
        await peer1.flush();
        await waitForSubductionSave();
        url = handle.url;
        await peer1.shutdown();
      }

      const { repos, adapters } = await createHostClientRepoTopology({ storages: [storage] });
      const [peer1, peer2] = repos;
      await connectAdapters(adapters);

      const hostHandle = await peer1.find<any>(url as AutomergeUrl);
      await hostHandle.whenReady();
      await expect.poll(() => hostHandle.doc()?.text, { timeout: 5_000 }).toEqual('foo');
      const peer2Handle = await findInStates<any>(peer2, hostHandle.url, FIND_STATES);
      await expect.poll(() => peer2Handle.doc(), { timeout: 5_000 }).toEqual(hostHandle.doc());
    });

    test('client cold-starts and syncs doc from a Repo', async () => {
      const repo = createRepo({ network: [] });
      const serverHandle = repo.create<{ field?: string }>();

      let clientDoc: A.Doc<{ field?: string }> | undefined;
      const receiveByClient = (blob: Uint8Array) => {
        clientDoc = clientDoc === undefined ? A.load(blob) : A.loadIncremental(clientDoc, blob);
      };

      let syncedHeads = getHeads(serverHandle.doc()!);
      receiveByClient(save(serverHandle.doc()!));

      serverHandle.on('change', ({ doc }) => {
        const blob = saveSince(doc, syncedHeads);
        syncedHeads = getHeads(doc);
        receiveByClient(blob);
      });

      const value = 'text to test if sync works';
      serverHandle.change((doc: any) => {
        doc.field = value;
      });
      expect(clientDoc?.field).to.deep.equal(value);
    });

    test('client creates doc and syncs with a Repo', async () => {
      const repo = createRepo({ network: [] });
      const receiveByServer = (blob: Uint8Array, docId: DocumentId) => repo.import<any>(blob, { docId });
      let clientDoc = A.from<{ field?: string }>({});
      const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
      let sentHeads: Heads = [];

      const sendDoc = async (doc: A.Doc<any>) => {
        receiveByServer(saveSince(doc, sentHeads), documentId);
        sentHeads = getHeads(doc);
      };

      const value = 'text to test if sync works';
      clientDoc = A.change(clientDoc, (doc: any) => {
        doc.field = value;
      });
      await sendDoc(clientDoc);

      const serverHandle = await repo.find<any>(documentId);
      expect(serverHandle.doc()!.field).to.deep.equal(value);
    });

    test('client creates doc and Repo persists it to disk', async () => {
      const storage = await createLevelAdapter();
      const repo = createRepo({ network: [], storage });
      const receiveByServer = async (blob: Uint8Array, docId: DocumentId) => {
        repo.import<any>(blob, { docId });
        await repo.flush([docId]);
      };

      let clientDoc = A.from<{ field?: string }>({ field: 'foo' });
      const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
      let sentHeads: Heads = [];

      const sendDoc = async (doc: A.Doc<any>) => {
        await receiveByServer(saveSince(doc, sentHeads), documentId);
        sentHeads = getHeads(doc);
      };

      const value = 'text to test if sync works';
      clientDoc = A.change(clientDoc, (doc: any) => {
        doc.field = value;
      });
      await sendDoc(clientDoc);

      const serverHandle = await repo.find<any>(documentId);
      expect(serverHandle.doc()!.field).to.deep.equal(value);
      await waitForSubductionSave();
      await repo.shutdown();

      const repo2 = createRepo({ network: [], storage });
      const reloaded = await repo2.find<any>(documentId);
      expect(reloaded.doc()!.field).to.deep.equal(value);
    });

    test('two repo sync docs on `update` call', async () => {
      const { repos, adapters } = await createHostClientRepoTopology();
      const [repoA, repoB] = repos;
      await connectAdapters(adapters);

      const handleA = repoA.create<any>();
      const handleB = await findInStates<any>(repoB, handleA.url, FIND_STATES);

      const text = 'Hello world';
      handleA.update((doc: any) => {
        return A.change(doc, (doc: any) => {
          doc.text = text;
        });
      });
      await waitForSubductionSave();

      expect(handleA.doc()!.text).to.equal(text);
      await expect.poll(() => handleB.doc()?.text, { timeout: 5_000 }).toEqual(text);
    });
  });

  describe('create2 tests', () => {
    test('basic document creation', async () => {
      const repo = createRepo({ network: [] });
      const handle = await repo.create2<{ text: string }>();
      expect(handle.doc()).to.deep.equal({});

      handle.change((doc: any) => {
        doc.text = 'Hello World';
      });
      expect(handle.doc()?.text).to.equal('Hello World');
    });

    test('document mutation', async () => {
      const repo = createRepo({ network: [] });
      const handle = await repo.create2<{ counter: number }>({ counter: 0 });

      for (let i = 1; i <= 10; i++) {
        handle.change((doc: any) => {
          doc.counter = i;
        });
      }
      expect(handle.doc()?.counter).to.equal(10);
    });

    test('import document and mutate', async () => {
      const repo = createRepo({ network: [] });
      const original = await repo.create2<{ text: string }>({ text: 'original' });
      const blob = A.save(original.doc()!);

      const imported = repo.import<{ text: string }>(blob);
      expect(imported.doc()?.text).to.equal('original');

      imported.change((doc: any) => {
        doc.text = 'mutated';
      });
      expect(imported.doc()?.text).to.equal('mutated');
    });

    test('reload document with flush', async () => {
      const path = createTmpPath();
      const text = 'Hello World!';
      let url: AutomergeUrl;

      {
        const level = createTestLevel(path);
        const storage = await createLevelAdapter(level);
        const repo = createRepo({ network: [], storage });
        const handle = await repo.create2<{ text: string }>();
        url = handle.url;
        handle.change((doc: any) => {
          doc.text = text;
        });
        await repo.flush([handle.documentId]);
        await waitForSubductionSave();
        await repo.shutdown();
        await sleep(100);
        await level.close();
      }

      {
        const level = createTestLevel(path);
        const storage = await createLevelAdapter(level);
        const repo = createRepo({ network: [], storage });
        const handle = await repo.find<{ text: string }>(url);
        await handle.whenReady();
        expect(handle.doc()?.text).to.equal(text);
        await level.close();
      }
    });

    test('reload document without flush', async () => {
      const path = createTmpPath();
      const text = 'Hello World!';
      let url: AutomergeUrl;

      {
        const level = createTestLevel(path);
        const storage = await createLevelAdapter(level);
        const repo = createRepo({ network: [], storage });
        const handle = await repo.create2<{ text: string }>();
        url = handle.url;
        handle.change((doc: any) => {
          doc.text = text;
        });
        await sleep(300);
        await repo.shutdown();
        await sleep(100);
        await level.close();
      }

      {
        const level = createTestLevel(path);
        const storage = await createLevelAdapter(level);
        const repo = createRepo({ network: [], storage });
        const handle = await repo.find<{ text: string }>(url);
        await handle.whenReady();
        expect(handle.doc()?.text).to.equal(text);
        await level.close();
      }
    });
  });

  const createLevelAdapter = async (level = createTestLevel()) => {
    const storage = new LevelDBStorageAdapter({ db: level.sublevel('automerge') });
    await openAndClose(level, storage);
    return storage;
  };
});

type ShareConfig = Exclude<ConstructorParameters<typeof Repo>[0], undefined>['shareConfig'];

type ConnectedRepoOptions = {
  storages?: StorageAdapterInterface[];
  connectionStateProvider?: TestConnectionStateProvider;
  shareConfig?: ShareConfig;
};

const createRepoTopology = async <Peers extends string[], Peer extends string = Peers[number]>(args: {
  peers: Peers;
  connections: [Peer, Peer][];
  options?: ConnectedRepoOptions;
  onMessage?: (message: Message) => void;
}) => {
  const adapters = args.connections.map(
    () => TestAdapter.createPair(args.options?.connectionStateProvider, args.onMessage) as [TestAdapter, TestAdapter],
  );
  const repos = args.peers.map((peerId, peerIndex) => {
    const network = adapters
      .map((pair, idx) => {
        return args.connections[idx].includes(peerId as Peer)
          ? peerId === args.connections[idx][0]
            ? pair[0]
            : pair[1]
          : null;
      })
      .filter(isNonNullable);

    return createRepo({
      peerId: peerId as PeerId,
      storage: args.options?.storages?.[peerIndex],
      network: [],
      shareConfig: args.options?.shareConfig,
      subductionAdapters: network.map((adapter) => ({
        adapter,
        serviceName: SUBDUCTION_SERVICE_NAME,
        role: 'connect' as const,
      })),
    });
  });
  return { repos, adapters };
};

const createHostClientRepoTopology = (options?: ConnectedRepoOptions) =>
  createRepoTopology({ peers: HOST_AND_CLIENT, connections: [HOST_AND_CLIENT], options });

const connectAdapters = async (pairs: [TestAdapter, TestAdapter][], options?: { noEmitPeerCandidate?: boolean }) => {
  for (const pair of pairs) {
    await pair[0].onConnect.wait();
    await pair[1].onConnect.wait();
    if (!options?.noEmitPeerCandidate) {
      pair[0].peerCandidate(pair[1].peerId!);
      pair[1].peerCandidate(pair[0].peerId!);
    }
  }
};

const createRepo = (options?: ConstructorParameters<typeof Repo>[0]) => {
  const repo = new Repo(options);
  onTestFinished(async () => {
    await repo.shutdown().catch(() => {});
  });
  return repo;
};

const waitForSubductionSave = async () => {
  await sleep(150);
};

export const createTmpPath = (): string => {
  return `/tmp/dxos-${PublicKey.random().toHex()}`;
};
