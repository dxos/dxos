//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { NewsItem, storyKey } from './news-item.ts';

const decode = Schema.decodeUnknownSync(Schema.fromJsonString(NewsItem));

/**
 * The fetched items, kept as JSON lines so a rerun resumes: an item whose id (guid or link) or story (outlet and
 * headline) is already stored is not added again.
 */
export class ItemStore {
  readonly #items: NewsItem[] = [];
  readonly #ids = new Set<string>();
  readonly #stories = new Set<string>();

  constructor(
    /** The JSON-lines file; undefined keeps the store in memory. */
    readonly path?: string,
  ) {
    if (path && existsSync(path)) {
      for (const line of readFileSync(path, 'utf8').split('\n')) {
        if (line.trim().length > 0) {
          this.#remember(decode(line));
        }
      }
    }
  }

  get items(): readonly NewsItem[] {
    return this.#items;
  }

  get size(): number {
    return this.#items.length;
  }

  has(item: Pick<NewsItem, 'id' | 'title' | 'publisher'>): boolean {
    return this.#ids.has(item.id) || this.#stories.has(storyKey(item));
  }

  /** Adds the items not yet stored, appending them to the file; returns those added. */
  add(items: Iterable<NewsItem>): NewsItem[] {
    const added: NewsItem[] = [];
    for (const item of items) {
      if (!this.has(item)) {
        this.#remember(item);
        added.push(item);
      }
    }
    if (this.path && added.length > 0) {
      mkdirSync(dirname(this.path), { recursive: true });
      appendFileSync(this.path, added.map((item) => `${JSON.stringify(item)}\n`).join(''));
    }
    return added;
  }

  #remember(item: NewsItem): void {
    this.#items.push(item);
    this.#ids.add(item.id);
    this.#stories.add(storyKey(item));
  }
}
