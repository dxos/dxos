//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { buildArchive } from '@dxos/app-toolkit/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as KanbanConstants from '@dxos/plugin-kanban/KanbanConstants';

import * as Team from '../team/index.ts';
import { REFERENCE } from '../util.ts';
import { Partial } from './partial.ts';
import { STAGES } from './pipeline.ts';

type Entry = {
  readonly 'id': string;
  readonly '@type'?: string;
  readonly 'name'?: string;
  readonly 'image'?: string;
  readonly 'spec'?: {
    readonly kind: string;
    readonly pivotField?: string;
    readonly items?: { readonly '/': string }[];
  };
  readonly 'arrangement'?: {
    readonly order: string[];
    readonly columns: Record<string, { readonly ids: string[]; readonly hidden?: boolean }>;
  };
};

describe('Alien Labs Sales pipeline', () => {
  test('is the only Kanban, its cards customer organizations with logos', { timeout: 120_000 }, async ({ expect }) => {
    const definition = SampleSpace.make({
      space: { name: 'Alien Labs Sales pipeline' },
      reference: REFERENCE,
      partials: { team: Team.Partial, inboxCrm: Partial },
      build: (partials) =>
        Effect.gen(function* () {
          const team = yield* partials.team();
          return yield* partials.inboxCrm({ team });
        }),
    });
    const { result, json } = await EffectEx.runPromise(buildArchive(definition));
    const { objects }: { objects: Entry[] } = JSON.parse(json);
    const ofType = (typename: string) => objects.filter((entry) => entry['@type']?.includes(typename));

    const kanbans = ofType('type.kanban:');
    expect(kanbans.map((kanban) => kanban.name)).toEqual(['Sales pipeline']);
    const [kanban] = kanbans;
    expect(kanban.id).toBe(result.pipeline.kanban.id);

    // An items board placed by its arrangement alone, so no card writes a stage into its organization.
    expect(kanban.spec?.kind).toBe('items');
    expect(kanban.spec?.pivotField).toBe('');
    expect(kanban.arrangement?.order).toEqual(STAGES);
    expect(kanban.arrangement?.columns[KanbanConstants.UNCATEGORIZED_VALUE]).toEqual({ ids: [], hidden: true });

    // Every card is a distinct customer organization in exactly one stage, in the board's item order.
    const orgIds = new Set(ofType('type.organization:').map((org) => org.id));
    const items = (kanban.spec?.items ?? []).map((ref) => ref['/'].replace('echo:///', ''));
    expect(items.length).toBeGreaterThanOrEqual(10);
    expect(new Set(items).size).toBe(items.length);
    expect(items.filter((id) => !orgIds.has(id))).toEqual([]);
    // Vendors and the venue stay off the board.
    for (const key of ['github', 'stripe', 'cloudflare', 'saltmarsh'] as const) {
      expect(items, key).not.toContain(result.orgs[key].id);
    }
    const placed = STAGES.flatMap((stage) => kanban.arrangement?.columns[stage]?.ids ?? []);
    expect(placed).toEqual(items);

    // Every stage holds 1 to 5 customers, and the board's early funnel (Lead, Qualified) is the fullest.
    for (const stage of STAGES) {
      const count = kanban.arrangement?.columns[stage]?.ids.length ?? 0;
      expect(count, stage).toBeGreaterThanOrEqual(1);
      expect(count, stage).toBeLessThanOrEqual(5);
    }
    expect(kanban.arrangement?.columns['Qualified']?.ids.length).toBe(3);

    // Every organization, on the board or not, carries a logo the card can show.
    for (const org of ofType('type.organization:')) {
      expect(org.image, org.name).toMatch(/^data:image\/(svg\+xml|webp;base64),/);
      expect((org.image ?? '').length, org.name).toBeLessThan(12_000);
    }
    expect(new Set(ofType('type.organization:').map((org) => org.image)).size).toBe(orgIds.size);
    // Every customer on the board shows its own logo rather than the generated mark.
    for (const org of ofType('type.organization:').filter((org) => items.includes(org.id))) {
      expect(org.image, org.name).toMatch(/^data:image\/webp;base64,/);
    }
  });
});
