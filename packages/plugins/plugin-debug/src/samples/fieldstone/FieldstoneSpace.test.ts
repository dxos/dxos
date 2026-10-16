//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import * as EffectEx from '@dxos/effect/EffectEx';

import * as FieldstoneSpace from './FieldstoneSpace.ts';

const LINK = /echo:\/\/\/([0-9A-Z]{26})/g;

/** The partials' own suites assert their content; this asserts what holds only once they are composed. */
describe('Fieldstone template', () => {
  test('applies every partial into one space', { timeout: 300_000 }, async ({ expect }) => {
    const { result, json } = await EffectEx.runPromise(buildArchive(FieldstoneSpace.make()));
    const counts = histogram(json);
    const countOf = (typename: string) =>
      Object.entries(counts)
        .filter(([type]) => type.includes(typename))
        .reduce((total, [, count]) => total + count, 0);

    expect(countOf('type.organization')).toBe(10);
    expect(countOf('type.person')).toBe(25);
    expect(countOf('type.agent:')).toBe(4);
    expect(countOf('type.project:')).toBe(4);
    expect(countOf('type.event')).toBe(300);
    // 15 Fieldstone documents, 5 project artifacts, 3 architecture guides.
    expect(countOf('type.document')).toBe(23);
    // 5 Fieldstone drawings and 12 architecture diagrams.
    expect(countOf('type.drawing')).toBe(17);
    expect(Object.keys(result.docs.docs)).toHaveLength(15);

    // Links across partials resolve to an object or a feed entry in the same space.
    const archive: { objects: Array<{ id: string }>; feeds?: Array<{ messages?: Array<{ id: string }> }> } =
      JSON.parse(json);
    const ids = new Set([
      ...archive.objects.map((object) => object.id),
      ...(archive.feeds ?? []).flatMap((feed) => (feed.messages ?? []).map((message) => message.id)),
    ]);
    const targets = [...json.matchAll(LINK)].map(([, id]) => id);
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.filter((id) => !ids.has(id))).toEqual([]);

    const subject = result.inboxCrm.threads.okapiIncident[0].properties?.subject;
    expect(result.projects.tasks.cacheKeyCollision.description).toContain(subject);
  });
});
