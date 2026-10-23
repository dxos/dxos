//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Lens, Type } from '@dxos/echo';
import { type DatabaseDirectory, EncodedReference, SpaceDocVersion } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { type VersionDoc, deriveVersionDoc, translate } from './version-translation.ts';

//
// Deriving a version for an object with a long history translates every edit since creation. The fixture
// pins the exact bytes translation writes, so a faster implementation must write the same changes; the
// benchmark (set DX_BENCH) times it for longer histories.
//

const TYPENAME = 'org.dxos.test.benchTask';
const OBJECT_ID = '01J00000000000000000000000';

const TaskV1 = Type.makeObject(DXN.make(TYPENAME, '0.1.0'))(
  Schema.Struct({ title: Schema.String, tags: Schema.Array(Schema.String), count: Schema.Number }),
);
const TaskV2 = Type.makeObject(DXN.make(TYPENAME, '0.2.0'))(
  Schema.Struct({ name: Schema.String, tags: Schema.Array(Schema.String), count: Schema.Number }),
);
const edges = [Lens.versionEdge(Lens.make(TaskV1, TaskV2, { name: 'title' }))];

/** An object with `edits` edits, every change authored by fixed actors at time 0, so its bytes are fixed. */
const history = (edits: number): VersionDoc => {
  let doc = A.change(A.init<DatabaseDirectory>({ actor: '0a' }), { time: 0 }, (draft) => {
    draft.version = SpaceDocVersion.CURRENT;
    draft.access = { spaceKey: 'a1b2' };
  });
  doc = A.change(doc, { time: 0 }, (draft) => {
    draft.objects = {
      [OBJECT_ID]: {
        system: { kind: 'object', type: EncodedReference.fromURI(Type.getURI(TaskV1)) },
        meta: { keys: [] },
        data: { title: 'Plan', tags: [], count: 0 },
      },
    };
  });
  for (let index = 0; index < edits; index++) {
    doc = A.change(doc, { time: 0 }, (draft) => {
      const data = draft.objects![OBJECT_ID].data;
      switch (index % 3) {
        case 0:
          data.tags.push(`tag-${index}`);
          break;
        case 1:
          A.splice(draft, ['objects', OBJECT_ID, 'data', 'title'], 0, 0, `${index % 10}`);
          break;
        default:
          data.count = index;
      }
    });
  }
  return doc;
};

/** Derives v2 for `origin` and translates its whole history into it. */
const derive = (origin: VersionDoc): VersionDoc => {
  const root = deriveVersionDoc({
    origin,
    originVersion: '0.1.0',
    version: '0.2.0',
    objectId: OBJECT_ID,
    typename: TYPENAME,
    edges,
  });
  invariant(root, 'no root');
  return translate({
    source: { doc: origin, version: '0.1.0' },
    target: { doc: root, version: '0.2.0' },
    objectId: OBJECT_ID,
    typename: TYPENAME,
    edges,
  });
};

/** The hashes of every change but the root's, whose actor is random by design (`deriveVersionDoc`). */
const translatedHashes = (doc: VersionDoc): string => {
  const [, ...rest] = A.getChangesMetaSince(doc, []);
  return rest
    .map((change) => change.hash)
    .sort()
    .join();
};

describe('version derivation over a long history', () => {
  test('writes the same changes as the reference implementation', () => {
    const derived = derive(history(60));
    expect(A.getChangesMetaSince(derived, [])).toHaveLength(61);
    expect(translatedHashes(derived)).toMatchSnapshot();
  });

  test.skipIf(!process.env.DX_BENCH)('benchmark', () => {
    for (const edits of (process.env.DX_BENCH ?? '').split(',').map(Number)) {
      const origin = history(edits);
      const start = performance.now();
      derive(origin);
      // eslint-disable-next-line no-console
      console.log(`derive ${edits} edits: ${Math.round(performance.now() - start)}ms`);
    }
  });
});
