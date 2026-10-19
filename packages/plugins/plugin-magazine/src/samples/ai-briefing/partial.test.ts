//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Collection, Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';

import { FeedOperation, Magazine, Subscription } from '#types';

import * as AiBriefingSpace from './AiBriefingSpace.ts';
import { FEEDS, MAGAZINE } from './feeds.ts';

type Ref = { readonly '/': string };
type Entry = {
  readonly 'id': string;
  readonly '@type'?: string;
  readonly '@parent'?: string;
  readonly 'name'?: string;
  readonly 'url'?: string;
  readonly 'type'?: string;
  readonly 'content'?: string;
  readonly 'enabled'?: boolean;
  readonly 'feeds'?: Ref[];
  readonly 'posts'?: Ref[];
  readonly 'objects'?: Ref[];
  readonly 'triggers'?: Ref[];
  readonly 'instructions'?: Ref;
  readonly 'text'?: Ref;
  readonly 'input'?: { readonly magazine?: Ref };
  readonly 'spec'?: { readonly kind?: string; readonly cron?: string; readonly runnable?: Ref };
};
type Archive = { readonly objects: Entry[] };

const typename = (schema: Type.AnyEntity) => `dxn:${Type.getTypename(schema)}:`;
const idOf = (ref: Ref | undefined) => ref?.['/'].split('/').at(-1);

describe('AI Briefing', () => {
  test(
    'seeds five live feeds, an empty unparented magazine and its disabled routine',
    { timeout: 120_000 },
    async ({ expect }) => {
      const scheduled: Array<{ key: string; input: unknown }> = [];
      const operations = {
        invoke: () => Effect.die('unused'),
        schedule: (op, ...args) => Effect.sync(() => void scheduled.push({ key: String(op.meta.key), input: args[0] })),
        invokePromise: () => Promise.resolve({}),
      } satisfies Operation.OperationService;
      const { json } = await EffectEx.runPromise(
        buildArchive(AiBriefingSpace.make()).pipe(Effect.provideService(Operation.Service, operations)),
      );
      const counts = histogram(json);
      const count = (schema: Type.AnyEntity) =>
        Object.entries(counts).find(([type]) => type.startsWith(typename(schema)))?.[1] ?? 0;
      expect(count(Subscription.Subscription)).toBe(5);
      expect(count(Subscription.Post)).toBe(0);
      expect(count(Magazine.Magazine)).toBe(1);
      expect(count(Routine.Routine)).toBe(1);

      const archive: Archive = JSON.parse(json);
      const objects = new Map(archive.objects.map((object) => [object.id, object]));
      const get = (ref: Ref | undefined) => objects.get(idOf(ref) ?? '');
      const ofType = (schema: Type.AnyEntity) =>
        archive.objects.filter((entry) => entry['@type']?.startsWith(typename(schema)));

      const subscriptions = ofType(Subscription.Subscription);
      expect(subscriptions.map(({ name, url, type }) => ({ name, url, type }))).toEqual(
        FEEDS.map(({ name, url }) => ({ name, url, type: 'rss' })),
      );

      const [magazine] = ofType(Magazine.Magazine);
      expect((magazine.feeds ?? []).map((ref) => get(ref)?.name)).toEqual(FEEDS.map(({ name }) => name));
      expect(magazine.posts).toEqual([]);
      expect(get(get(magazine.instructions)?.text)?.content).toContain(MAGAZINE.topic);

      expect(scheduled.map(({ key, input }) => ({ key, input: JSON.parse(JSON.stringify(input)) }))).toEqual([
        {
          key: String(FeedOperation.CurateMagazine.meta.key),
          input: { magazine: expect.objectContaining({ '/': expect.stringContaining(magazine.id) }) },
        },
      ]);

      const [routine] = ofType(Routine.Routine);
      expect(routine.spec?.runnable?.['/']).toBe(FeedOperation.CurateMagazine.meta.key.toString());
      expect(routine.triggers).toHaveLength(1);
      const trigger = get(routine.triggers?.[0]);
      expect(trigger?.['@type']?.startsWith(typename(Trigger.Trigger))).toBe(true);
      expect(trigger?.enabled).toBe(false);
      expect(trigger?.spec).toEqual({ kind: 'timer', cron: '0 9 * * *' });
      expect(idOf(trigger?.input?.magazine)).toBe(magazine.id);

      expect(count(Collection.Collection)).toBe(0);
      expect([magazine, ...subscriptions].map((entry) => entry['@parent'])).toEqual(Array(6).fill(undefined));
    },
  );
});
