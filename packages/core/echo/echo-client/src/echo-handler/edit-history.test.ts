//
// Copyright 2026 DXOS.org
//

import { next as A, type Doc as AutomergeDoc } from '@automerge/automerge';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import * as Doc from '../automerge/Doc';
import { EchoTestBuilder } from '../testing';
import { getObjectCore } from './echo-handler';
import { checkoutVersion, getEditHistory, getEditHistoryWithDiffs } from './edit-history';

describe('edit-history', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('getEditHistoryWithDiffs reports additions and deletions per version', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TestSchema.Task]);

    const obj = db.add(Obj.make(TestSchema.Task, { description: 'aaa' }));
    const accessor = getObjectCore(obj).getDocAccessor(['description']);

    // Insert four characters at the end.
    accessor.handle.change((doc: AutomergeDoc<TestSchema.Task>) => {
      A.splice(doc, accessor.path.slice(), 3, 0, 'bbbb');
    });
    expect(Doc.getValue<string>(accessor)).toBe('aaabbbb');

    let diffs = getEditHistoryWithDiffs(obj);
    // One diff per change.
    expect(diffs.length).toBe(getEditHistory(obj).length);
    // The newest version is the insertion: additions, no deletions.
    expect(diffs.at(-1)!.added).toBeGreaterThanOrEqual(4);
    expect(diffs.at(-1)!.removed).toBe(0);
    expect(diffs.at(-1)!.time).toBeGreaterThan(0);

    // Delete three characters.
    accessor.handle.change((doc: AutomergeDoc<TestSchema.Task>) => {
      A.splice(doc, accessor.path.slice(), 0, 3);
    });
    expect(Doc.getValue<string>(accessor)).toBe('bbbb');

    diffs = getEditHistoryWithDiffs(obj);
    expect(diffs.at(-1)!.removed).toBeGreaterThanOrEqual(3);
    expect(diffs.at(-1)!.added).toBe(0);
  });

  test('getEditHistoryWithDiffs produces cumulative-frontier heads across concurrent history', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TestSchema.Task]);

    const obj = db.add(Obj.make(TestSchema.Task, { description: 'base' }));
    const accessor = getObjectCore(obj).getDocAccessor(['description']);
    const path = accessor.path.slice();
    const baseHeads = [getEditHistory(obj).at(-1)!.change.hash];

    // Edit the live branch, then make a second edit branching from the base version — concurrent
    // with the first. Integrating it leaves the history non-linear (two frontier heads).
    accessor.handle.change((doc: AutomergeDoc<TestSchema.Task>) => {
      A.splice(doc, path, 4, 0, ' [live]');
    });
    accessor.handle.changeAt(baseHeads, (doc: AutomergeDoc<TestSchema.Task>) => {
      A.splice(doc, path, 4, 0, ' [fork]');
    });

    const liveValue = Doc.getValue<string>(accessor);
    expect(liveValue).toContain('[fork]');
    expect(liveValue).toContain('[live]');

    // Reconstructing the newest version must reproduce the full merged content. A single
    // branch-tip hash (the prior behaviour) drops the concurrent branch's edit.
    const diffs = getEditHistoryWithDiffs(obj);
    // The newest version's frontier is genuinely non-linear (two concurrent heads); this is what
    // a single change hash fails to represent.
    expect(diffs.at(-1)!.heads.length).toBe(2);
    const latest = checkoutVersion(obj, diffs.at(-1)!.heads) as { description: string };
    expect(latest.description).toBe(liveValue);
  });
});
