//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import {
  type AutomergeUrl,
  type Repo,
  type SubductionPolicy,
  initSubduction,
  parseAutomergeUrl,
} from '@automerge/automerge-repo';
import { type ExpectStatic, beforeAll, describe, test } from 'vitest';

import { type TestConnectionStateProvider, type TestTransportOptions } from '../testing/index.ts';
import {
  connectAdapters,
  createCountingPolicy,
  createRepoTopology,
  waitForSubductionSave,
} from './subduction-test-utils.ts';

// Long enough that a round held to its deadline cannot pass the assertions below.
const ROUND_DEADLINE_MS = 30_000;
const WITHIN_MS = 10_000;

type Doc = { value?: number };

/**
 * A reader connected to `edge` and to `second`, whose link each test shapes.
 */
const createReader = async ({
  edgeTransport,
  secondLink,
  secondTransport,
  policies,
  healInitialDelayMs = 100,
}: {
  edgeTransport?: TestTransportOptions;
  secondLink?: TestConnectionStateProvider;
  secondTransport?: TestTransportOptions;
  policies?: Record<string, SubductionPolicy>;
  healInitialDelayMs?: number;
}) => {
  const transportByConnection: Record<number, TestTransportOptions> = {};
  if (edgeTransport) {
    transportByConnection[0] = edgeTransport;
  }
  if (secondTransport) {
    transportByConnection[1] = secondTransport;
  }
  const { repos, adapters, repoPairs } = await createRepoTopology({
    peers: ['reader', 'edge', 'second'],
    connections: [
      ['reader', 'edge'],
      ['reader', 'second'],
    ],
    options: {
      connectionStateProviderByConnection: secondLink ? { 1: secondLink } : {},
      transportByConnection,
      subductionPolicies: policies,
      subductionTimeouts: { syncMs: ROUND_DEADLINE_MS, healInitialDelayMs },
    },
  });
  const [reader, edge, second] = repos;
  const connect = async (expect: ExpectStatic) => {
    await connectAdapters(adapters, { repoPairs });
    // `connectAdapters` returns once either side of a pair binds; rounds only include peers the reader bound.
    await expect.poll(async () => (await reader.connectedSubductionPeerIds()).length, { timeout: WITHIN_MS }).toBe(2);
  };
  return { reader, edge, second, connect };
};

/**
 * Stores documents on the holders without keeping them loaded, so peers get them only by asking.
 */
const storeOnly = async (holders: Repo[], count: number): Promise<AutomergeUrl[]> => {
  const [creator, ...copies] = holders;
  const urls: AutomergeUrl[] = [];
  for (let value = 0; value < count; value++) {
    const handle = creator.create<Doc>();
    handle.change((doc) => {
      doc.value = value;
    });
    for (const copy of copies) {
      copy.import(A.save(handle.doc()), { docId: handle.documentId });
    }
    urls.push(handle.url);
  }
  await waitForSubductionSave(holders);
  for (const url of urls) {
    for (const holder of holders) {
      await holder.removeFromCache(parseAutomergeUrl(url).documentId);
    }
  }
  return urls;
};

describe('Subduction sync with a slow peer', () => {
  beforeAll(async () => {
    await initSubduction();
  });

  test('a document loads from the peer that has it while another connected peer never answers', async ({ expect }) => {
    let secondLink: 'on' | 'off' = 'on';
    const { reader, edge, connect } = await createReader({ secondLink: () => secondLink });
    const [url] = await storeOnly([edge], 1);
    await connect(expect);
    secondLink = 'off';

    const handle = await reader.find<Doc>(url);
    await expect.poll(() => handle.doc()?.value, { timeout: WITHIN_MS }).toBe(0);
  });

  test('a peer on a one-message-per-round-trip link does not hold back a bulk load', async ({ expect }) => {
    // Like a mesh peer: it has every document too, but its link carries one message per 100 ms.
    const { reader, edge, second, connect } = await createReader({ secondTransport: { serialRoundTripMs: 100 } });
    // More documents than MAX_IN_FLIGHT_DOC_SYNCS, so later documents wait for earlier rounds' slots.
    const urls = await storeOnly([edge, second], 150);
    await connect(expect);

    const handles = await Promise.all(urls.map((url) => reader.find<Doc>(url)));
    await expect
      .poll(() => handles.filter((handle) => handle.doc()?.value !== undefined).length, { timeout: WITHIN_MS })
      .toBe(urls.length);
  });

  test('a peer without the document does not end the first load before the peer that has it answers', async ({
    expect,
  }) => {
    // `second` answers first, with nothing; `edge` has the document behind a link carrying one message per second.
    const { reader, edge, connect } = await createReader({ edgeTransport: { serialRoundTripMs: 1_000 } });
    const [url] = await storeOnly([edge], 1);
    await connect(expect);

    const progress = reader.findWithProgress<Doc>(url);
    const states: string[] = [progress.peek().state];
    const unsubscribe = progress.subscribe((state) => states.push(state.state));
    try {
      await expect.poll(() => progress.peek().state, { timeout: WITHIN_MS }).toBe('ready');
    } finally {
      unsubscribe();
    }
    expect(states).not.toContain('unavailable');
    expect((await reader.find<Doc>(url)).doc()?.value).toBe(0);
  });
  test('heal retries do not hold round slots while a connected peer never answers', async ({ expect }) => {
    let refuse = true;
    let secondLink: 'on' | 'off' = 'on';
    const refusing = () =>
      createCountingPolicy({
        authorizeFetch: async () => {
          if (refuse) {
            throw new Error('fetch refused');
          }
        },
      });
    const edgePolicy = refusing();
    const secondPolicy = refusing();
    // The heal delay leaves time to change the peers between the failed first rounds and the retries.
    const { reader, edge, second, connect } = await createReader({
      secondLink: () => secondLink,
      policies: { edge: edgePolicy.policy, second: secondPolicy.policy },
      healInitialDelayMs: 2_000,
    });
    // More documents than MAX_IN_FLIGHT_DOC_SYNCS, so their heal retries alone can take every round slot.
    const failing = await storeOnly([edge, second], 120);
    const [late] = await storeOnly([edge], 1);
    await connect(expect);

    // Both peers refuse, so every first round fails at once and schedules a heal retry.
    const progresses = failing.map((url) => reader.findWithProgress<Doc>(url));
    await expect
      .poll(() => progresses.filter((progress) => progress.peek().state === 'unavailable').length, {
        timeout: WITHIN_MS,
      })
      .toBe(failing.length);
    const refusals = edgePolicy.counters.authorizeFetch;
    refuse = false;
    secondLink = 'off';
    // The retries have started once `edge` is asked again.
    await expect
      .poll(() => edgePolicy.counters.authorizeFetch - refusals, { timeout: WITHIN_MS })
      .toBeGreaterThanOrEqual(100);

    const progress = reader.findWithProgress<Doc>(late);
    await expect.poll(() => progress.peek().state, { timeout: WITHIN_MS }).toBe('ready');
    expect((await reader.find<Doc>(late)).doc()?.value).toBe(0);
  }, 60_000);
  test('a heal retry still asks the peers for an evicted document', async ({ expect }) => {
    let refuse = true;
    let secondLink: 'on' | 'off' = 'on';
    const refusing = () =>
      createCountingPolicy({
        authorizeFetch: async () => {
          if (refuse) {
            throw new Error('fetch refused');
          }
        },
      });
    const edgePolicy = refusing();
    const { reader, edge, second, connect } = await createReader({
      secondLink: () => secondLink,
      policies: { edge: edgePolicy.policy, second: refusing().policy },
      healInitialDelayMs: 2_000,
    });
    const [url] = await storeOnly([edge, second], 1);
    await connect(expect);

    const progress = reader.findWithProgress<Doc>(url);
    await expect.poll(() => progress.peek().state, { timeout: WITHIN_MS }).toBe('unavailable');
    // Evicted while its heal retry waits: with no handle left, the retry syncs the stored tree.
    await reader.removeFromCache(parseAutomergeUrl(url).documentId);
    const asked = edgePolicy.counters.authorizeFetch;
    refuse = false;
    secondLink = 'off';
    await expect.poll(() => edgePolicy.counters.authorizeFetch - asked, { timeout: WITHIN_MS }).toBeGreaterThan(0);
  });
});
