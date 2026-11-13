//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import * as EffectEx from '@dxos/effect/EffectEx';

import * as FieldstoneSpace from './FieldstoneSpace.ts';

const LINK = /echo:\/\/\/([0-9A-Z]{26})/g;

/** The partials' own suites assert their content; this asserts what holds only once they are composed. */
describe('Alien Labs template', () => {
  test('applies every partial into one space', { timeout: 300_000 }, async ({ expect }) => {
    const { result, json } = await EffectEx.runPromise(buildArchive(FieldstoneSpace.make()));
    const counts = histogram(json);
    const countOf = (typename: string) =>
      Object.entries(counts)
        .filter(([type]) => type.includes(typename))
        .reduce((total, [, count]) => total + count, 0);

    expect(countOf('type.organization')).toBe(18);
    expect(countOf('type.person')).toBe(34);
    expect(countOf('type.agent:')).toBe(4);
    expect(countOf('type.project:')).toBe(4);
    expect(countOf('type.event')).toBe(171);
    // 15 Alien Labs documents, 5 project artifacts, 3 architecture guides and the ECHO design document.
    expect(countOf('type.document')).toBe(24);
    // 5 Alien Labs drawings and 15 architecture diagrams.
    expect(countOf('type.drawing')).toBe(20);
    expect(Object.keys(result.docs.docs)).toHaveLength(15);

    // Links across partials resolve to an object or a feed entry in the same space.
    const archive: {
      objects: Array<{
        'id': string;
        '@type'?: string;
        'name'?: string;
        'content'?: string | { '/': string };
        'objects'?: Array<{ '/': string }>;
      }>;
      feeds?: Array<{ messages?: Array<{ id: string }> }>;
    } = JSON.parse(json);
    const ids = new Set([
      ...archive.objects.map((object) => object.id),
      ...(archive.feeds ?? []).flatMap((feed) => (feed.messages ?? []).map((message) => message.id)),
    ]);
    const targets = [...json.matchAll(LINK)].map(([, id]) => id);
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.filter((id) => !ids.has(id))).toEqual([]);

    // The Cairn architecture document links the Architecture partial's guides and embeds two of its drawings.
    const objects = new Map(archive.objects.map((object) => [object.id, object]));
    const body = objects.get(result.docs.docs.architecture.id)?.content;
    const text = String(typeof body === 'object' ? objects.get(body['/'].replace('echo:///', ''))?.content : body);
    const { drawings, docs } = result.architecture;
    for (const object of [docs.composer, docs.edge]) {
      expect(text).toContain(`](echo:///${object.id})`);
    }
    for (const key of ['composer-plugin', 'edge-compute']) {
      expect(text).toMatch(new RegExp(`!\\[[^\\]]*\\]\\(echo:///${drawings.get(key)?.id}\\)`));
    }

    // The Sales pipeline Kanban is in the navigation, first under Customers.
    const customers = archive.objects.find(
      (object) => object['@type']?.includes('type.collection') && object.name === 'Customers',
    );
    expect(customers?.objects?.[0]?.['/']).toBe(`echo:///${result.inboxCrm.pipeline.kanban.id}`);

    const subject = result.inboxCrm.threads.okapiIncident[0].properties?.subject;
    expect(result.projects.tasks.cacheKeyCollision.description).toContain(subject);
  });
});
