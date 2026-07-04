//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';
import { Entity } from '@dxos/echo';
import { type ObjectJSON } from '@dxos/echo/internal';
import { log } from '@dxos/log';

import { type FeedHandle } from './feed-handle';

/** Number of items requested per underlying cursor fetch while extending the window. */
const FETCH_BATCH_SIZE = 50;

/**
 * A single feed item currently retained in a {@link FeedWindow}'s buffer. Hydrated eagerly at
 * ingestion time so reads (`getSlice`) stay synchronous, matching `QueryContext.getResults()`.
 */
export type FeedWindowEntry = {
  id: string;
  json: ObjectJSON;
  entity: Entity.Unknown;
};

/**
 * A contiguous batch of entries fetched in one cursor read, in newest-first order. `nextCursor`/
 * `prevCursor` are the page's own boundaries (as returned by the fetch), so evicting this page
 * later doesn't lose the ability to resume fetching from either edge -- this is what makes
 * sliding the window back toward the head (after it has moved away) possible without discarding
 * everything and starting over.
 */
type FeedWindowPage = {
  entries: FeedWindowEntry[];
  /** Cursor to resume fetching newer items (pass as `after`). */
  nextCursor: string;
  /** Cursor to resume fetching older items (pass as `before`). */
  prevCursor: string;
};

/**
 * Maintains a bounded sliding window over a feed's items in newest-first (insertion) order,
 * backed by cursor reads instead of loading the whole feed.
 *
 * The window is a contiguous run of pages `[rangeStart, rangeStart + items.length)` measured in
 * items from the head (0 = newest); `pages[0]` is the newest loaded page, `pages[pages.length-1]`
 * the oldest. `setRange` moves this range to satisfy a requested `[skip, skip + limit)` slice in
 * *either* direction:
 *  - extends toward older items (`before`-cursor reads) when the requested range reaches past
 *    what is loaded on the tail end;
 *  - extends back toward the head (`after`-cursor reads from the current front page's boundary)
 *    when `skip` moves before `rangeStart` -- i.e. the caller is scrolling back up after eviction
 *    had advanced the window away from the head;
 *  - trims whole pages outside `[skip, skip + limit)` on either edge, so the caller (which picks
 *    `skip`/`limit` to keep its own window bounded -- see `usePagination`) never accumulates
 *    more than it currently needs. Pages (not individual items) are the eviction unit.
 *
 * Owned by a single {@link FeedHandle} and shared across all windowed queries against that feed;
 * only one contiguous range is tracked at a time, so concurrent consumers requesting disjoint
 * ranges will thrash. This matches the expected usage (one paginated view per feed).
 */
export class FeedWindow {
  readonly updated = new Event<void>();

  // Newest-to-oldest page order; concatenating `entries` gives the buffer in newest-first order.
  #pages: FeedWindowPage[] = [];
  #rangeStart = 0;
  #deletedIds = new Set<string>();
  // Absolute newest confirmed position, independent of eviction -- used by `pollHead` to detect
  // genuinely new appends regardless of where the window currently sits. Distinct from
  // `pages[0]?.nextCursor`, which is the (possibly much staler) boundary of the current front.
  #headCursor: string | undefined;
  #hasOlder = true;
  #initialFetchDone = false;
  #isLoading = false;
  #disposed = false;

  // Serializes `setRange`/`pollHead`/`jumpToHead` so a periodic poll can never interleave with
  // an in-flight range extension (both mutate `#pages` and the cursor fields).
  #mutex: Promise<unknown> = Promise.resolve();

  constructor(private readonly _handle: FeedHandle) {}

  get isLoading(): boolean {
    return this.#isLoading;
  }

  get atHead(): boolean {
    return this.#rangeStart === 0;
  }

  get #items(): FeedWindowEntry[] {
    return this.#pages.flatMap((page) => page.entries);
  }

  dispose(): void {
    this.#disposed = true;
  }

  /**
   * Ensures the window covers `[skip, skip + limit)`, extending in either direction as needed and
   * trimming whole pages outside that range, then returns whether older items remain beyond what
   * was loaded.
   *
   * A request for `skip: 0` always re-anchors to the live head, resetting first if eviction had
   * previously advanced `rangeStart` -- this is what makes `usePagination`'s `jumpToHead`
   * (which simply resets its own `skip` state to 0 and re-requests) work correctly.
   */
  setRange(skip: number, limit: number): Promise<{ hasMore: boolean }> {
    return this.#serialize(async () => {
      if (this.#disposed) {
        return { hasMore: false };
      }

      if (skip === 0 && this.#rangeStart !== 0) {
        this.#resetState();
      }

      this.#isLoading = true;
      try {
        // Extend back toward the head if the caller is scrolling toward newer items than what's
        // currently loaded (the window previously slid away from the head via eviction).
        while (skip < this.#rangeStart) {
          const progressed = await this.#fetchNewerPage();
          if (!progressed) {
            break;
          }
        }

        // Extend toward older items if the requested range reaches past what's loaded.
        const required = skip + limit;
        while (this.#items.length < required && this.#hasOlder) {
          await this.#fetchOlderPage();
        }
      } finally {
        this.#isLoading = false;
      }

      this.#trimToRange(skip, limit);

      // `rangeStart + items.length` is the absolute (from-head) position up to which items have
      // been fetched. More is available if that boundary lies beyond the requested slice, or if
      // the underlying feed still has older items to fetch.
      return { hasMore: this.#rangeStart + this.#items.length > skip + limit || this.#hasOlder };
    });
  }

  /**
   * Resets the window to the newest page, discarding the current range. Used to recover after
   * eviction has detached the window from the live head. `setRange(0, ...)` triggers the same
   * reset internally, so this is mainly useful to force a reload without waiting for a request.
   */
  jumpToHead(): Promise<void> {
    return this.#serialize(async () => {
      if (this.#disposed) {
        return;
      }
      this.#resetState();
      this.updated.emit();
    });
  }

  #resetState(): void {
    this.#pages = [];
    this.#rangeStart = 0;
    this.#headCursor = undefined;
    this.#hasOlder = true;
    this.#initialFetchDone = false;
  }

  /**
   * Drops whole pages that fall entirely outside `[skip, skip + limit)`, advancing `rangeStart`
   * past any dropped near-edge (newer) pages. Pages, not individual items, are the eviction unit.
   */
  #trimToRange(skip: number, limit: number): void {
    while (this.#pages.length > 0 && this.#rangeStart + this.#pages[0].entries.length <= skip) {
      this.#rangeStart += this.#pages.shift()!.entries.length;
    }
    while (this.#pages.length > 0) {
      const lastPage = this.#pages[this.#pages.length - 1];
      if (this.#rangeStart + this.#items.length - lastPage.entries.length >= skip + limit) {
        this.#pages.pop();
        // `#hasOlder` reflects whether *that specific page's* fetch found more beyond its own
        // boundary -- discarding it (e.g. sliding back toward the head after having reached the
        // true end, which trims away the now-unneeded tail pages) leaves `#hasOlder` stale: it can
        // still say "false" for a boundary that isn't the window's tail anymore. Force the next
        // older-extension to issue a real fetch and re-derive the answer for the new tail, rather
        // than trusting a conclusion drawn from a page that's no longer there. Without this,
        // scrolling to the end, back to the head, and down again gets permanently stuck refusing
        // to fetch, since the stale `false` never gets re-checked.
        this.#hasOlder = true;
      } else {
        break;
      }
    }
  }

  /**
   * Returns the currently loaded slice `[skip, skip + limit)`, relative to the tracked range.
   * Does not fetch -- call `setRange` first to ensure coverage.
   *
   * Callers are expected to only request `skip >= rangeStart` (i.e. `setRange` extends toward the
   * head itself rather than the caller seeking arbitrarily backwards); a request into evicted
   * history that wasn't first passed through `setRange` returns an empty slice rather than
   * misattributed items.
   */
  getSlice(skip: number, limit: number): FeedWindowEntry[] {
    const from = skip - this.#rangeStart;
    if (from < 0) {
      return [];
    }
    return this.#items.slice(from, from + limit);
  }

  /**
   * Applies an optimistic append. Only reflected in the window while it includes the live head;
   * otherwise the item will be picked up on the next `jumpToHead()`. Prepended into the existing
   * front page (rather than starting a fresh page) since an optimistic append has no cursor of
   * its own -- by the time the window could ever need to resume fetching from a boundary at this
   * position (i.e. after eviction moves away and later slides back), a real fetch will have
   * superseded this page.
   */
  notifyAppended(items: Entity.Unknown[]): void {
    if (!this.atHead || items.length === 0 || this.#pages.length === 0) {
      return;
    }
    const fresh: FeedWindowEntry[] = items
      .filter((item) => !this.#deletedIds.has(item.id))
      .map((item) => ({ id: item.id, json: Entity.toJSON(item), entity: item }));
    if (fresh.length === 0) {
      return;
    }
    // Optimistic appends arrive oldest-to-newest; the page is newest-first, so reverse before
    // prepending.
    this.#pages[0].entries = [...[...fresh].reverse(), ...this.#pages[0].entries];
    this.updated.emit();
  }

  /**
   * Applies an optimistic delete. Always reflected immediately, regardless of window position.
   */
  notifyDeleted(ids: string[]): void {
    if (ids.length === 0) {
      return;
    }
    for (const id of ids) {
      this.#deletedIds.add(id);
    }
    const before = this.#items.length;
    for (const page of this.#pages) {
      page.entries = page.entries.filter((item) => !this.#deletedIds.has(item.id));
    }
    if (this.#items.length !== before) {
      this.updated.emit();
    }
  }

  /**
   * Fetches items appended after the current head, prepending them. No-op unless the window
   * currently includes the live head (`atHead`) and an initial range has been loaded.
   */
  pollHead(): Promise<void> {
    return this.#serialize(async () => {
      if (this.#disposed || !this.atHead || !this.#initialFetchDone) {
        return;
      }

      let changed = false;
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const page = await this._handle.fetchPage({
            after: this.#headCursor,
            reverse: false,
            limit: FETCH_BATCH_SIZE,
          });
          if (page.objects.length === 0) {
            break;
          }
          this.#headCursor = page.nextCursor;
          const { entries, sawTombstone } = await this.#ingest(page.objects, { removeFromExisting: true });
          if (entries.length > 0 || sawTombstone) {
            if (entries.length > 0) {
              const front = this.#pages[0];
              const prepended = [...[...entries].reverse(), ...(front?.entries ?? [])];
              if (front) {
                front.entries = prepended;
              } else {
                this.#pages.unshift({
                  entries: prepended,
                  nextCursor: page.nextCursor ?? '',
                  prevCursor: page.prevCursor ?? '',
                });
              }
            }
            changed = true;
          }
          // `page.hasMore` may be `undefined` (not every backend populates it -- see
          // `#fetchOlderPage`'s identical fallback); treating that as "no more" would silently
          // stop after one batch and miss any additional newly-appended items beyond it.
          const hasMoreHead = page.hasMore ?? page.objects.length >= FETCH_BATCH_SIZE;
          if (!hasMoreHead) {
            break;
          }
        }
      } catch (err) {
        log.verbose('feed window head poll failed', { error: err });
      }

      if (changed) {
        this.updated.emit();
      }
    });
  }

  /**
   * Fetches the next older page and appends it to the tail of `#pages`.
   */
  async #fetchOlderPage(): Promise<void> {
    const before = this.#pages[this.#pages.length - 1]?.prevCursor;
    const page = await this._handle.fetchPage({ reverse: true, before, limit: FETCH_BATCH_SIZE });

    if (!this.#initialFetchDone) {
      // First page ever loaded: its nextCursor bounds the live head for pollHead().
      this.#headCursor = page.nextCursor;
      this.#initialFetchDone = true;
    }
    this.#hasOlder = page.hasMore ?? page.objects.length >= FETCH_BATCH_SIZE;

    const { entries } = await this.#ingest(page.objects, { removeFromExisting: false });
    this.#pages.push({
      entries,
      nextCursor: page.nextCursor ?? before ?? '',
      prevCursor: page.prevCursor ?? before ?? '',
    });

    if (page.objects.length === 0) {
      // Defensive: avoid an infinite loop if the service returns an empty page with hasMore=true.
      this.#hasOlder = false;
    }
  }

  /**
   * Fetches the page immediately newer than the current front page and prepends it, decreasing
   * `rangeStart`. Returns `false` when no progress could be made (nothing newer to recover, or no
   * reference point to resume from), so the caller's extend loop can terminate safely.
   */
  async #fetchNewerPage(): Promise<boolean> {
    const front = this.#pages[0];
    if (!front) {
      // No reference point to resume from; treat as already at the head.
      this.#rangeStart = 0;
      return false;
    }

    const page = await this._handle.fetchPage({ after: front.nextCursor, reverse: false, limit: FETCH_BATCH_SIZE });
    if (page.objects.length === 0) {
      // Nothing newer than our current front -- rangeStart shouldn't be > 0 in this state, but
      // guard against it so callers don't loop forever.
      this.#rangeStart = 0;
      return false;
    }

    // Blocks arrive oldest-of-the-gap-first (ascending); reverse to store newest-first, matching
    // the buffer's overall convention.
    const { entries } = await this.#ingest(page.objects, { removeFromExisting: false });
    entries.reverse();
    this.#pages.unshift({
      entries,
      nextCursor: page.nextCursor ?? front.nextCursor,
      prevCursor: page.prevCursor ?? front.nextCursor,
    });
    this.#rangeStart = Math.max(0, this.#rangeStart - entries.length);
    return true;
  }

  /**
   * Decodes, filters (tombstones/deletes), and hydrates a raw page of objects. When
   * `removeFromExisting` is set (live poll direction), a tombstone also removes any
   * already-buffered entry for that id, since it may already be in the window.
   */
  async #ingest(
    objects: readonly string[],
    opts: { removeFromExisting: boolean },
  ): Promise<{ entries: FeedWindowEntry[]; sawTombstone: boolean }> {
    const entries: FeedWindowEntry[] = [];
    let sawTombstone = false;
    for (const encoded of objects) {
      const parsed = FeedWindow.#tryParse(encoded);
      if (!parsed) {
        continue;
      }
      if (FeedWindow.#isTombstone(parsed)) {
        this.#deletedIds.add(parsed.id);
        sawTombstone = true;
        if (opts.removeFromExisting) {
          for (const page of this.#pages) {
            page.entries = page.entries.filter((item) => item.id !== parsed.id);
          }
        }
        continue;
      }
      if (this.#deletedIds.has(parsed.id)) {
        continue;
      }
      const entry = await this.#hydrate(parsed);
      if (entry) {
        entries.push(entry);
      }
    }
    return { entries, sawTombstone };
  }

  async #hydrate(json: ObjectJSON & { id: string }): Promise<FeedWindowEntry | undefined> {
    try {
      const entity = await this._handle.hydrateObject(json);
      return { id: json.id, json, entity };
    } catch (err) {
      // Tombstones and malformed payloads fail schema validation; skip rather than surface.
      log.verbose('feed window object hydration failed; object skipped', { json, error: err });
      return undefined;
    }
  }

  #serialize<T>(work: () => Promise<T>): Promise<T> {
    const result = this.#mutex.then(work, work);
    // Swallow rejections in the chain itself (callers still observe them via the returned
    // promise) so one failed operation doesn't permanently wedge the queue.
    this.#mutex = result.catch(() => {});
    return result;
  }

  static #tryParse(encoded: string): (ObjectJSON & { id: string }) | undefined {
    try {
      // `JSON.parse` is inherently untyped; the runtime `typeof` check just below is what
      // actually establishes the `id: string` narrowing.
      const parsed = JSON.parse(encoded) as ObjectJSON;
      return typeof parsed.id === 'string' ? (parsed as ObjectJSON & { id: string }) : undefined;
    } catch {
      return undefined;
    }
  }

  static #isTombstone(obj: ObjectJSON): boolean {
    return obj['@deleted'] === true;
  }
}
