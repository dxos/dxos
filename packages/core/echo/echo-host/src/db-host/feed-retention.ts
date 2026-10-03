//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as SqlClient from 'effect/sql/SqlClient';

import { scheduleTask, scheduleTaskInterval } from '@dxos/async';
import { Resource } from '@dxos/context';
import { EchoFeedCodec } from '@dxos/echo-protocol';
import { RuntimeProvider } from '@dxos/effect';
import { type FeedStore } from '@dxos/feed';
import type { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

/**
 * How long a feed namespace keeps its blocks, and which old blocks it may drop.
 */
export type FeedRetentionPolicy = {
  feedNamespace: string;

  /** Blocks written longer ago than this are candidates for pruning. */
  maxAgeMs: number;

  /**
   * Decides per candidate, given its decoded object JSON; every candidate is pruned when absent.
   * A block that fails to decode is kept.
   */
  shouldPrune?: (object: Record<string, unknown>) => boolean;
};

export type FeedRetentionProps = {
  feedStore: FeedStore;
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  getSpaceIds: () => SpaceId[];
  policies: readonly FeedRetentionPolicy[];
  /** Delay before the first run, so it does not compete with opening the spaces. */
  initialDelayMs?: number;
  /** Delay between the end of one run and the start of the next. */
  intervalMs?: number;
};

export const FEED_RETENTION_INITIAL_DELAY_MS = 30_000;
export const FEED_RETENTION_INTERVAL_MS = 60 * 60_000;

/**
 * Applies {@link FeedRetentionPolicy}s to every open space: once shortly after open, which compacts
 * a space that grew before retention existed, then periodically.
 */
export class FeedRetention extends Resource {
  readonly #feedStore: FeedStore;
  readonly #runtime: FeedRetentionProps['runtime'];
  readonly #getSpaceIds: FeedRetentionProps['getSpaceIds'];
  readonly #policies: readonly FeedRetentionPolicy[];
  readonly #initialDelayMs: number;
  readonly #intervalMs: number;

  constructor({ feedStore, runtime, getSpaceIds, policies, initialDelayMs, intervalMs }: FeedRetentionProps) {
    super();
    this.#feedStore = feedStore;
    this.#runtime = runtime;
    this.#getSpaceIds = getSpaceIds;
    this.#policies = policies;
    this.#initialDelayMs = initialDelayMs ?? FEED_RETENTION_INITIAL_DELAY_MS;
    this.#intervalMs = intervalMs ?? FEED_RETENTION_INTERVAL_MS;
  }

  protected override async _open(): Promise<void> {
    if (this.#policies.length === 0) {
      return;
    }
    scheduleTask(
      this._ctx,
      async () => {
        await this.prune();
        scheduleTaskInterval(this._ctx, () => this.prune().then(() => {}), this.#intervalMs);
      },
      this.#initialDelayMs,
    );
  }

  /**
   * Prunes every open space by every policy now.
   *
   * @returns Number of blocks deleted.
   */
  async prune(now = Date.now()): Promise<number> {
    let total = 0;
    for (const spaceId of this.#getSpaceIds()) {
      for (const policy of this.#policies) {
        const { shouldPrune } = policy;
        const deleted = await this.#feedStore
          .pruneBlocks({
            spaceId,
            feedNamespace: policy.feedNamespace,
            before: now - policy.maxAgeMs,
            shouldPrune: shouldPrune && ((block) => decodeAndTest(block, shouldPrune)),
          })
          .pipe(
            Effect.catchCause((cause) =>
              Effect.sync(() => {
                log.warn('feed retention failed', { spaceId, feedNamespace: policy.feedNamespace, cause });
                return 0;
              }),
            ),
            RuntimeProvider.runPromise(this.#runtime),
          );
        if (deleted > 0) {
          log('feed retention pruned blocks', { spaceId, feedNamespace: policy.feedNamespace, deleted });
        }
        total += deleted;
      }
    }
    return total;
  }
}

const decodeAndTest = (
  block: Parameters<typeof EchoFeedCodec.decodeBlock>[0],
  shouldPrune: (object: Record<string, unknown>) => boolean,
): boolean => {
  try {
    return shouldPrune(EchoFeedCodec.decodeBlock(block));
  } catch (err) {
    log.warn('feed retention could not decode block; keeping it', { err });
    return false;
  }
};
