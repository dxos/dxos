//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as fc from 'fast-check';
import { describe, expect, onTestFinished, test } from 'vitest';

import { invariant } from '@dxos/invariant';

import * as Draft from './Draft.ts';
import * as Handle from './Handle.ts';
import { AutomergeOps, Host } from './host/index.ts';
import * as Op from './Op.ts';
import * as Repo from './Repo.ts';
import { MemoryStore, type Random, Transport, createRandom, initialDocument, randomOp } from './testing/index.ts';

type Doc = Record<string, unknown>;

/**
 * Clients with repos over their own transports to one host, which a test can restart over the same
 * store as a worker restart would.
 */
const setup = async (clients: number, random: Random) => {
  const store = new MemoryStore();
  let host = await new Host.DocumentHost({ store }).open();
  /** While set, a quarter of the host's responses are lost, so clients resend what the host already applied. */
  const network = { lossy: false };
  const transports = Array.from(
    { length: clients },
    () => new Transport({ host: () => host, random: random.next, lose: () => network.lossy && random.chance(0.25) }),
  );
  const repos = transports.map(
    (transport) =>
      new Repo.ProxyRepo({
        host: transport,
        createHandle: (options) => new Handle.DocHandle(options),
        // Many small batches rather than a few large ones, and quick resubscribing, so races happen often.
        maxSubmitRate: 1_000,
        resubscribeDelay: 5,
      }),
  );
  await Promise.all(repos.map((repo) => repo.open()));
  const refused: Repo.EditsRejectedEvent[] = [];
  repos.forEach((repo) => repo.editsRejected.on((event) => void refused.push(event)));
  const close = async () => {
    await Promise.all(repos.map((repo) => repo.close()));
    await host.close();
  };

  /** A new host over the same store; every client resubscribes from what it holds. */
  const restart = async () => {
    await host.close();
    host = await new Host.DocumentHost({ store }).open();
    transports.forEach((transport) => transport.drop());
    await Promise.all(repos.map((repo) => repo.reconnect()));
  };

  /** Waits until every client's edits are confirmed and every client holds what the host holds. */
  const settle = async (documentId: string) => {
    network.lossy = false;
    for (let attempt = 0; ; attempt++) {
      try {
        await Promise.all(repos.map((repo) => repo.flush()));
        break;
      } catch (err) {
        // A submit that raced a restart fails the flush waiting on it; its batch is resent.
        if (attempt >= 5) {
          throw err;
        }
      }
    }
    await Promise.all(repos.map((repo) => repo.catchUp(documentId)));
  };

  return { store, repos, network, refused, restart, settle, close };
};

/** Writes an op through a change callback's draft, as application code would. */
const applyToDraft = (draft: Doc, op: Op.Any): void => {
  if (op.type === 'splice') {
    Draft.splice(draft, op.path, op.index, op.remove, op.insert);
    return;
  }
  const parent = Op.getAt(draft, op.path.slice(0, -1));
  const key = op.path[op.path.length - 1];
  if (Array.isArray(parent)) {
    const index = Number(key);
    switch (op.type) {
      case 'put':
        parent[index] = op.value;
        return;
      case 'insert':
        parent.splice(index, 0, ...op.values);
        return;
      case 'remove':
        parent.splice(index, op.count);
        return;
    }
  }
  invariant(Op.isContainer(parent) && !Array.isArray(parent), `No map at ${JSON.stringify(op.path)}`);
  switch (op.type) {
    case 'put':
      parent[String(key)] = op.value;
      return;
    case 'del':
      delete parent[String(key)];
      return;
  }
  throw new Error(`Cannot apply ${op.type} to a map`);
};

/** Opens the same document in every repo once the first has created it. */
const share = async (repos: Repo.ProxyRepo[], value: Doc) => {
  const created = repos[0].create(value);
  await created.whenReady();
  const { documentId } = created;
  invariant(documentId, 'a ready handle names its document');
  const handles = [created, ...repos.slice(1).map((repo) => repo.find(documentId))];
  await Promise.all(handles.map((handle) => handle.whenReady()));
  return { documentId, handles };
};

describe('Repo.ProxyRepo with Host.DocumentHost', () => {
  test('a document one client creates reaches another with its edits', async () => {
    const { close, repos } = await setup(2, createRandom(1));
    onTestFinished(close);
    const { handles } = await share(repos, { title: 'draft', items: [] });
    handles[0].change((doc) => {
      doc.title = 'final';
      doc.items.push('one');
    });
    await repos[0].flush();
    await expect.poll(() => handles[1].doc()).toEqual({ title: 'final', items: ['one'] });
  });

  test('concurrent text edits from two clients converge with the host', async () => {
    const { close, repos, store, settle, refused } = await setup(2, createRandom(2));
    onTestFinished(close);
    const { documentId, handles } = await share(repos, { text: 'hello world' });
    handles[0].change((doc) => Draft.splice(doc, ['text'], 5, 0, ' there'));
    handles[1].change((doc) => Draft.splice(doc, ['text'], 11, 0, '!'));
    await settle(documentId);
    const expected = AutomergeOps.toValue(store.get(documentId));
    expect(expected).toEqual({ text: 'hello there world!' });
    handles.forEach((handle) => expect(handle.doc()).toEqual(expected));
    expect(refused).toEqual([]);
  });

  test('a restart in the middle of editing loses and doubles nothing', async () => {
    const { close, repos, store, restart, settle, refused } = await setup(2, createRandom(3));
    onTestFinished(close);
    const { documentId, handles } = await share(repos, { list: [] });
    for (let index = 0; index < 5; index++) {
      handles[index % 2].change((doc) => doc.list.push(`item ${index}`));
    }
    await restart();
    for (let index = 5; index < 10; index++) {
      handles[index % 2].change((doc) => doc.list.push(`item ${index}`));
    }
    await settle(documentId);
    const list = AutomergeOps.toValue(store.get(documentId));
    handles.forEach((handle) => expect(handle.doc()).toEqual(list));
    expect(Op.getAt(list, ['list'])).toHaveLength(10);
    expect(refused).toEqual([]);
  });

  test('cursors made on one client resolve on another', async () => {
    const { close, repos, settle } = await setup(2, createRandom(4));
    onTestFinished(close);
    const { documentId, handles } = await share(repos, { text: 'abcdef' });
    const [cursor] = await repos[0].cursors(documentId, ['text']).create([3]);
    invariant(cursor, 'no cursor');
    handles[0].change((doc) => Draft.splice(doc, ['text'], 0, 0, 'XY'));
    await settle(documentId);
    const tracker = repos[1].cursors(documentId, ['text']);
    await tracker.track([cursor]);
    expect(tracker.position(cursor)).toBe(5);
  });

  test('a subscription request held past a reconnect is not answered on the new stream', async () => {
    const store = new MemoryStore();
    const host = await new Host.DocumentHost({ store }).open();
    const transport = new Transport({ host: () => host, random: createRandom(5).next });
    // Holds `updateSubscription` calls while armed, releasing them in whatever order the test picks.
    const held: { armed: boolean; releases: (() => void)[] } = { armed: false, releases: [] };
    const gated: Repo.Host = {
      subscribe: (request, handlers) => transport.subscribe(request, handlers),
      updateSubscription: async (request) => {
        if (held.armed) {
          await new Promise<void>((resolve) => held.releases.push(resolve));
        }
        await transport.updateSubscription(request);
      },
      submit: (request) => transport.submit(request),
      createDocument: (initialValue) => transport.createDocument(initialValue),
      flush: (documentIds) => transport.flush(documentIds),
      resolveCursors: (request) => transport.resolveCursors(request),
      createCursors: (request) => transport.createCursors(request),
    };
    const repo = await new Repo.ProxyRepo({
      host: gated,
      createHandle: (options) => new Handle.DocHandle(options),
    }).open();
    onTestFinished(async () => {
      await repo.close();
      await host.close();
    });
    const { documentId, handles } = await share([repo], { list: [] });

    // A catch-up whose request, made before the remote insert, is still on its way.
    held.armed = true;
    void repo.catchUp(documentId).catch(() => {});
    await expect.poll(() => held.releases.length).toBe(1);
    store.merge(
      documentId,
      A.change(A.clone(store.get(documentId)), (draft) => {
        AutomergeOps.applyOps(draft, [{ type: 'insert', path: ['list', 0], values: ['r'] }]);
      }),
    );
    await expect.poll(() => handles[0].doc()).toEqual({ list: ['r'] });

    // The new stream's own request waits too, so the old one reaches the host first.
    void repo.reconnect();
    await expect.poll(() => held.releases.length).toBe(2);
    held.armed = false;
    const [stale, fresh] = held.releases;
    stale();
    await new Promise((resolve) => setTimeout(resolve, 20));
    fresh();
    await repo.catchUp(documentId);
    expect(handles[0].doc()).toEqual({ list: ['r'] });
    expect(AutomergeOps.toValue(store.get(documentId))).toEqual({ list: ['r'] });
  });

  const Step = fc.oneof(
    fc.record({ kind: fc.constant('edit' as const), client: fc.nat(), seed: fc.nat() }),
    fc.record({ kind: fc.constant('remote' as const), seed: fc.nat(), sync: fc.boolean() }),
    fc.record({ kind: fc.constant('pause' as const), ms: fc.integer({ min: 0, max: 5 }) }),
    fc.record({ kind: fc.constant('restart' as const) }),
  );

  // The timeout leaves room for fast-check to shrink a failure, which replays many runs.
  test('clients, a remote peer, lost responses and host restarts converge with the host', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }),
        fc.array(Step, { minLength: 10, maxLength: 60 }),
        fc.nat(),
        fc.boolean(),
        async (clients, steps, seed, lossy) => {
          const { repos, store, network, restart, settle, refused, close } = await setup(clients, createRandom(seed));
          try {
            const { documentId, handles } = await share(repos, initialDocument());
            network.lossy = lossy;
            // A peer with its own replica, merged into the host's store as network sync would.
            let remote = A.clone(store.get(documentId));
            for (const step of steps) {
              switch (step.kind) {
                case 'edit': {
                  const handle = handles[step.client % clients];
                  const op = randomOp(createRandom(step.seed), handle.doc(), `c${step.client % clients}:`);
                  if (op) {
                    handle.change((doc) => applyToDraft(doc, op));
                  }
                  break;
                }
                case 'remote': {
                  if (step.sync) {
                    remote = A.merge(remote, store.get(documentId));
                  }
                  const op = randomOp(createRandom(step.seed), AutomergeOps.toValue(remote), 'r:');
                  if (op) {
                    remote = A.change(remote, (draft) => {
                      AutomergeOps.applyOps(draft, [op]);
                    });
                    store.merge(documentId, remote);
                  }
                  break;
                }
                case 'pause':
                  await new Promise((resolve) => setTimeout(resolve, step.ms));
                  break;
                case 'restart':
                  await restart();
                  break;
              }
            }
            await settle(documentId);
            const expected = AutomergeOps.toValue(store.get(documentId));
            handles.forEach((handle) => expect(handle.doc()).toEqual(expected));
            expect(refused).toEqual([]);
          } finally {
            await close();
          }
        },
      ),
      { numRuns: 25 },
    );
  }, 120_000);

  const AppendStep = fc.oneof(
    fc.record({ kind: fc.constant('push' as const), client: fc.nat() }),
    fc.record({ kind: fc.constant('type' as const), client: fc.nat(), at: fc.nat() }),
    fc.record({ kind: fc.constant('remote' as const), sync: fc.boolean() }),
    fc.record({ kind: fc.constant('pause' as const), ms: fc.integer({ min: 0, max: 5 }) }),
    fc.record({ kind: fc.constant('restart' as const) }),
  );

  test('every edit lands exactly once through lost responses and host restarts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }),
        fc.array(AppendStep, { minLength: 10, maxLength: 60 }),
        fc.nat(),
        async (clients, steps, seed) => {
          const { repos, store, network, restart, settle, refused, close } = await setup(clients, createRandom(seed));
          try {
            const { documentId, handles } = await share(repos, { list: [], text: '' });
            network.lossy = true;
            let remote = A.clone(store.get(documentId));
            // Every token is unique, and edits only add, so each must appear exactly once at the end.
            const tokens: string[] = [];
            const texts: string[] = [];
            for (const step of steps) {
              switch (step.kind) {
                case 'push': {
                  const token = `c${step.client % clients}-${tokens.length}`;
                  tokens.push(token);
                  handles[step.client % clients].change((doc) => doc.list.push(token));
                  break;
                }
                case 'type': {
                  const handle = handles[step.client % clients];
                  const token = `<${step.client % clients}.${texts.length}>`;
                  texts.push(token);
                  // Between tokens, so a later insertion cannot split an earlier token.
                  const boundaries = [
                    0,
                    ...[...handle.doc().text.matchAll(/>/g)].map((match) => (match.index ?? 0) + 1),
                  ];
                  const at = boundaries[step.at % boundaries.length];
                  handle.change((doc) => Draft.splice(doc, ['text'], at, 0, token));
                  break;
                }
                case 'remote': {
                  if (step.sync) {
                    remote = A.merge(remote, store.get(documentId));
                  }
                  const token = `r-${tokens.length}`;
                  tokens.push(token);
                  remote = A.change(remote, (draft) => {
                    AutomergeOps.applyOps(draft, [{ type: 'insert', path: ['list', 0], values: [token] }]);
                  });
                  store.merge(documentId, remote);
                  break;
                }
                case 'pause':
                  await new Promise((resolve) => setTimeout(resolve, step.ms));
                  break;
                case 'restart':
                  await restart();
                  break;
              }
            }
            await settle(documentId);
            const expected = AutomergeOps.toValue(store.get(documentId));
            handles.forEach((handle) => expect(handle.doc()).toEqual(expected));
            const list = Op.getAt(expected, ['list']);
            const text = Op.getAt(expected, ['text']);
            invariant(Array.isArray(list) && typeof text === 'string', 'the document lost its shape');
            expect([...list].sort()).toEqual([...tokens].sort());
            expect(text.match(/<[^>]*>/g)?.sort() ?? []).toEqual([...texts].sort());
            expect(refused).toEqual([]);
          } finally {
            await close();
          }
        },
      ),
      { numRuns: 25 },
    );
  }, 120_000);
});
