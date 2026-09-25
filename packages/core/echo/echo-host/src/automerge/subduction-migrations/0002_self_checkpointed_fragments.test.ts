//
// Copyright 2026 DXOS.org
//

import { initSubduction } from '@automerge/automerge-repo';
import {
  CommitId,
  type FragmentWithBlob,
  MemorySigner,
  SedimentreeId,
  type SedimentreeStorage,
  Subduction,
} from '@automerge/automerge-subduction';
import { beforeAll, describe, expect, test } from 'vitest';

import { parseSignedFragmentRecord, selfCheckpointRepair } from './0002_self_checkpointed_fragments.ts';

const ID_LENGTH = 32;
const PREFIX_LENGTH = 12;

const id = (fill: number): Uint8Array => new Uint8Array(ID_LENGTH).fill(fill);
const prefixOf = (fullId: Uint8Array): Uint8Array => fullId.slice(0, PREFIX_LENGTH);
const padded = (prefix: Uint8Array): Uint8Array => {
  const out = new Uint8Array(ID_LENGTH);
  out.set(prefix);
  return out;
};

/** Encodes a bijou64 varint the way the engine does: one byte below `0xf8`, else a width byte and the offset value. */
const bijou64 = (value: number): number[] => {
  if (value < 0xf8) {
    return [value];
  }
  let rest = value - 0xf8;
  const bytes: number[] = [];
  do {
    bytes.unshift(rest & 0xff);
    rest = Math.floor(rest / 256);
  } while (rest > 0);
  return [0xf6 + bytes.length + 1, ...bytes];
};

type RecordSpec = {
  head: Uint8Array;
  boundary: Uint8Array[];
  checkpoints: Uint8Array[];
  blobSize?: number;
};

/** Builds a record in the `SignedFragment.encode()` layout with a zero signature. */
const buildRecord = ({ head, boundary, checkpoints, blobSize = 100 }: RecordSpec): Uint8Array => {
  const bytes: number[] = [
    0x53,
    0x54,
    0x46,
    0x00,
    ...id(0xa0),
    ...id(0xa1),
    ...head,
    ...id(0xa2),
    boundary.length,
    checkpoints.length >> 8,
    checkpoints.length & 0xff,
    ...bijou64(blobSize),
  ];
  for (const boundaryId of boundary) {
    bytes.push(...boundaryId);
  }
  for (const checkpoint of checkpoints) {
    bytes.push(...checkpoint);
  }
  bytes.push(...new Array(64).fill(0));
  return Uint8Array.from(bytes);
};

describe('parseSignedFragmentRecord', () => {
  test.each([0, 1, 247, 248, 300, 65_535, 70_000, 20_000_000, 2 ** 40, Number.MAX_SAFE_INTEGER])(
    'parses a record whose blob size is %i',
    (blobSize) => {
      const head = id(0x22);
      const record = parseSignedFragmentRecord(
        buildRecord({ head, boundary: [id(0x33)], checkpoints: [prefixOf(id(0x44))], blobSize }),
      );
      expect(record).toBeDefined();
      expect(record!.head).toEqual(head);
      expect(record!.boundary).toEqual([id(0x33)]);
      expect(record!.checkpoints).toEqual([prefixOf(id(0x44))]);
    },
  );

  test('parses many boundary ids and checkpoints', () => {
    const boundary = Array.from({ length: 200 }, (_, index) => id(index));
    const checkpoints = Array.from({ length: 1_000 }, (_, index) => prefixOf(id(255 - (index % 256))));
    const record = parseSignedFragmentRecord(buildRecord({ head: id(0x22), boundary, checkpoints }));
    expect(record!.boundary).toEqual(boundary);
    expect(record!.checkpoints).toEqual(checkpoints);
    expect(record!.issuer).toEqual(id(0xa0));
    expect(record!.sedimentreeId).toEqual(id(0xa1));
    expect(record!.blobDigest).toEqual(id(0xa2));
  });

  test('rejects foreign, truncated, and over-long bytes', () => {
    const good = buildRecord({ head: id(0x22), boundary: [id(0x33)], checkpoints: [prefixOf(id(0x44))] });
    expect(parseSignedFragmentRecord(good)).toBeDefined();
    expect(parseSignedFragmentRecord(new Uint8Array())).toBeUndefined();
    expect(parseSignedFragmentRecord(new Uint8Array(500).fill(0x53))).toBeUndefined();
    const foreign = Uint8Array.from(good);
    foreign[3] = 0x01;
    expect(parseSignedFragmentRecord(foreign)).toBeUndefined();
    expect(parseSignedFragmentRecord(good.subarray(0, good.length - 1))).toBeUndefined();
    expect(parseSignedFragmentRecord(good.subarray(0, 140))).toBeUndefined();
    expect(parseSignedFragmentRecord(Uint8Array.from([...good, 0]))).toBeUndefined();
  });
});

describe('selfCheckpointRepair', () => {
  test('returns the valid shape for a record that lists its own head and boundary as checkpoints', () => {
    const head = id(0x22);
    const boundary = [id(0x33), id(0x34)];
    const kept = [prefixOf(id(0x44)), prefixOf(id(0x45))];
    const repair = selfCheckpointRepair(
      buildRecord({ head, boundary, checkpoints: [prefixOf(head), kept[0], prefixOf(boundary[1]), kept[1]] }),
    );
    expect(repair).toBeDefined();
    expect(repair!.head).toEqual(head);
    expect(repair!.boundary).toEqual(boundary);
    expect(repair!.blobDigest).toEqual(id(0xa2));
    expect(repair!.checkpoints).toEqual(kept.map(padded));
  });

  test('a head that is the only checkpoint repairs to no checkpoints', () => {
    const head = id(0x22);
    const repair = selfCheckpointRepair(buildRecord({ head, boundary: [], checkpoints: [prefixOf(head)] }));
    expect(repair!.checkpoints).toEqual([]);
  });

  test('leaves a record alone that does not list its own head', () => {
    const head = id(0x22);
    expect(selfCheckpointRepair(buildRecord({ head, boundary: [id(0x33)], checkpoints: [] }))).toBeUndefined();
    expect(
      selfCheckpointRepair(buildRecord({ head, boundary: [id(0x33)], checkpoints: [prefixOf(id(0x44))] })),
    ).toBeUndefined();
    // The boundary id as a checkpoint is not the self-checkpoint shape on its own.
    expect(
      selfCheckpointRepair(buildRecord({ head, boundary: [id(0x33)], checkpoints: [prefixOf(id(0x33))] })),
    ).toBeUndefined();
  });

  test('leaves bytes alone that are not a fragment record', () => {
    expect(selfCheckpointRepair(new Uint8Array(300).fill(0x22))).toBeUndefined();
  });
});

/**
 * Pins the hand-built layout above against what the engine actually encodes, so the parser fails
 * loudly here rather than silently skipping every real record after a format change.
 */
describe('against the engine encoder', () => {
  beforeAll(async () => {
    await initSubduction();
  });

  test('a stored self-checkpointed fragment parses and repairs', async () => {
    const stored: Uint8Array[] = [];
    const signer = MemorySigner.generate();
    const subduction = new Subduction({
      signer,
      storage: capturingStorage(stored),
      serviceName: 'fragment-checkpoints-test',
    });
    const sedimentreeId = SedimentreeId.fromBytes(id(0x11));
    const head = CommitId.fromBytes(id(0x22));
    const boundary = CommitId.fromBytes(id(0x33));
    const checkpoint = CommitId.fromBytes(id(0x44));
    const blob = new Uint8Array(300).fill(7);
    await subduction.storeFragment(sedimentreeId, head, [boundary], [head, boundary, checkpoint], blob);

    expect(stored).toHaveLength(1);
    const record = parseSignedFragmentRecord(stored[0]);
    expect(record!.sedimentreeId).toEqual(id(0x11));
    expect(record!.head).toEqual(id(0x22));
    expect(record!.boundary).toEqual([id(0x33)]);
    expect(record!.checkpoints).toEqual([prefixOf(id(0x22)), prefixOf(id(0x33)), prefixOf(id(0x44))]);
    expect(record!.issuer).toEqual(signer.verifyingKey());

    const repair = selfCheckpointRepair(stored[0]);
    expect(repair!.checkpoints).toEqual([padded(prefixOf(id(0x44)))]);
  });
});

/** The narrowest storage the engine accepts, recording every signed fragment it saves. */
const capturingStorage = (stored: Uint8Array[]): SedimentreeStorage => ({
  saveSedimentreeId: async () => {},
  deleteSedimentreeId: async () => {},
  loadAllSedimentreeIds: async () => [],
  saveCommit: async () => {},
  loadCommit: async () => null,
  listCommitIds: async () => [],
  loadAllCommits: async () => [],
  deleteCommit: async () => {},
  deleteAllCommits: async () => {},
  saveFragment: async (_sedimentreeId, _head, signedFragment) => {
    stored.push(new Uint8Array(signedFragment.encode()));
  },
  loadFragment: async () => null,
  listFragmentIds: async () => [],
  loadAllFragments: async (): Promise<FragmentWithBlob[]> => [],
  deleteFragment: async () => {},
  deleteAllFragments: async () => {},
  saveBatchAll: async (_sedimentreeId, commits, fragments) => {
    for (const { signedFragment } of fragments) {
      stored.push(new Uint8Array(signedFragment.encode()));
    }
    return commits.length + fragments.length;
  },
});
