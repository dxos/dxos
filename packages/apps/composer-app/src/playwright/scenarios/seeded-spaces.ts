//
// Copyright 2026 DXOS.org
//

import { type Page } from '@playwright/test';

import { type SpaceId } from '@dxos/keys';

/**
 * Documents in each seeded space, largest first: a few spaces of unequal size, as a workspace someone uses has.
 * Smaller than the reporter's largest (2,590 objects) so a nightly iteration seeds in minutes, large enough that a
 * switch and an open load real work.
 */
export const SEEDED_DOCUMENTS = [400, 150, 50];

/** Recorded as the rows' `scale`, so a trend breaks visibly if the seed changes shape. */
export const seedLabel = (documents: readonly number[]): string => `seeded=${documents.join('+')}docs`;

/** Concurrent document writes per batch, bounding how many are in flight at once. */
const CONCURRENCY = 25;

/**
 * Creates one space per entry of `documents`, each holding that many markdown documents in its root collection, through
 * the app's own operations. Returns the space ids, in the same order. The page must have booted the app.
 */
export const seedSpaces = async (page: Page, runId: string, documents: readonly number[]): Promise<string[]> =>
  page.evaluate(
    async ({ documents, runId, concurrency }) => {
      const invoke = globalThis.composer?.invoke;
      if (!invoke) {
        throw new Error('composer.invoke is unavailable: the app has not finished mounting');
      }
      // `SpaceId`'s own predicate cannot be imported into a page evaluation (`packages/common/keys/src/space-id.ts`).
      const isSpaceId = (value: unknown): value is SpaceId =>
        typeof value === 'string' && value.startsWith('B') && value.length === 33;
      const field = (value: unknown, name: string): unknown =>
        typeof value === 'object' && value !== null ? Reflect.get(value, name) : undefined;
      const readId = (value: unknown): string | undefined => {
        const id = field(value, 'id');
        return typeof id === 'string' ? id : undefined;
      };

      // Paragraphs of varying length, so line measurement and highlighting do not measure a cache.
      const words = ['the', 'switch', 'loads', 'every', 'object', 'this', 'space', 'holds', 'and', 'renders', 'its'];
      const paragraph = (seed: number) =>
        Array.from({ length: 12 + (seed % 30) }, (_, index) => words[(seed + index * 7) % words.length]).join(' ');
      const content = (seed: number) =>
        Array.from({ length: 4 + (seed % 20) }, (_, index) => paragraph(seed + index)).join('\n\n');

      const spaceIds: string[] = [];
      for (const [spaceIndex, count] of documents.entries()) {
        const created = await invoke('org.dxos.operation.space.create', {
          name: `PERF: Seeded ${spaceIndex + 1} ${runId}`,
        });
        const spaceId = readId(field(created, 'space')) ?? readId(created);
        if (!isSpaceId(spaceId)) {
          throw new Error(`space.create returned no id: ${JSON.stringify(created)?.slice(0, 200)}`);
        }
        for (let start = 0; start < count; start += concurrency) {
          await Promise.all(
            Array.from({ length: Math.min(concurrency, count - start) }, async (_, offset) => {
              const index = start + offset;
              const draft = await invoke('org.dxos.operation.markdown.createDraft', {
                name: `Document ${index + 1}`,
                content: `# Document ${index + 1}\n\n${content(index)}\n`,
              });
              // No target: a document files into the space's root collection.
              await invoke('org.dxos.operation.space.addObject', { object: field(draft, 'object') }, { spaceId });
            }),
          );
        }
        const space = globalThis.dxos?.spaces?.().find((candidate) => candidate.id === spaceId);
        if (!space) {
          throw new Error(`space ${spaceId} is not in the client's space list`);
        }
        await space.db.flush();
        spaceIds.push(spaceId);
      }
      return spaceIds;
    },
    { documents, runId, concurrency: CONCURRENCY },
  );
