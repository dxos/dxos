//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { bench, describe } from 'vitest';

import { DocHandleProxy } from './doc-handle-proxy.ts';

//
// The two per-update paths a client document runs on the main thread: integrating a change the host
// sends, and acknowledging a local write. Both record which heads the host holds, so both price that
// bookkeeping against a document with a long history and, for host changes, one head per peer.
//
//   DX_RUN_MANUAL_TESTS=1 pnpm exec vitest bench --run --project node src/automerge/doc-handle-proxy.bench.ts
//

type Counter = { count: number; items: Record<string, string> };

/** Changes already in the document; bookkeeping that looks a change up by hash pays for these. */
const HISTORY = 2_000;
/** Measured updates per bench, each a fresh change, so the pool is built before timing starts. */
const UPDATES = 1_000;
const WARMUP = 50;
/** tinybench calls the function once more before warmup and once before measuring, to detect async. */
const DETECTION_CALLS = 2;
const BENCH_OPTIONS = { time: 0, iterations: UPDATES, warmupTime: 0, warmupIterations: WARMUP };

const withHistory = (): A.Doc<Counter> => {
  let doc = A.from<Counter>({ count: 0, items: {} });
  for (let index = 0; index < HISTORY; index++) {
    doc = A.change(doc, (draft) => {
      draft.count++;
      draft.items[`k${index % 100}`] = `v${index}`;
    });
  }
  return doc;
};

/** A client handle holding the whole history, which the host has acknowledged. */
const loadedHandle = (history: A.Doc<Counter>): DocHandleProxy<Counter> => {
  const handle = new DocHandleProxy<Counter>({ onDelete: () => {} });
  handle._integrateHostUpdate(A.save(history));
  return handle;
};

/** Peers editing concurrently, as in a shared space; the document then has one head per peer. */
const PEERS = 8;

/**
 * One incremental change per update the bench will run, round-robin from {@link PEERS} peers that each
 * build only on their own changes, so the host relays concurrent changes and the heads stay many.
 */
const hostMutations = (history: A.Doc<Counter>): Uint8Array[] => {
  const peers = Array.from({ length: PEERS }, () => A.clone(history));
  return Array.from({ length: UPDATES + WARMUP + DETECTION_CALLS }, (unusedValue, index) => {
    const peer = index % PEERS;
    const heads = A.getHeads(peers[peer]);
    peers[peer] = A.change(peers[peer], (draft) => {
      draft.items[`peer${peer}`] = `v${index}`;
    });
    return A.saveSince(peers[peer], heads);
  });
};

const history = withHistory();

describe('DocHandleProxy', { tags: ['manual'], timeout: 120_000 }, () => {
  const integrating = loadedHandle(history);
  const mutations = hostMutations(history);
  let next = 0;
  bench(
    `integrate a host change (${HISTORY} changes of history, ${PEERS} concurrent peers)`,
    () => {
      const mutation = mutations[next++];
      if (!mutation) {
        throw new Error('host mutation pool exhausted');
      }
      integrating._integrateHostUpdate(mutation);
    },
    BENCH_OPTIONS,
  );

  const writing = loadedHandle(history);
  bench(
    `local write, send and acknowledge (${HISTORY} changes of history)`,
    () => {
      writing.change((draft: Counter) => {
        draft.count++;
      });
      writing._getPendingChanges();
      writing._confirmSync();
    },
    BENCH_OPTIONS,
  );
});
