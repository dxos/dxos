//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { getObjectPathFromObject } from '@dxos/app-toolkit';
import { type AppSurface, useShowItem } from '@dxos/app-toolkit/ui';
import { type Database, Filter, Obj, Ref, type Tag } from '@dxos/echo';
import { log } from '@dxos/log';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Icon, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useSelected } from '@dxos/react-ui-attention';
import { Masonry } from '@dxos/react-ui-masonry';

import { meta } from '#meta';
import { FeedOperation } from '#operations';
import { type Magazine, Subscription } from '#types';

import { fetchArticle, findStarTag, hasMetaTag, useStarTag } from '../../util';
import { MagazineTile, formatPublished } from './MagazineTile';

export type MagazineArticleProps = AppSurface.ObjectArticleProps<Magazine.Magazine>;

export const MagazineArticle = ({ role, subject, attendableId }: MagazineArticleProps) => {
  const { t } = useTranslation(meta.id);
  const showItem = useShowItem();
  useObject(subject);
  const id = attendableId ?? Obj.getDXN(subject).toString();
  const currentId = useSelected(id, 'single');
  const [sort, setSort] = useState<'date' | 'rank'>('date');
  const [showArchived, setShowArchived] = useState(false);
  const [onlyStarred, setOnlyStarred] = useState(false);
  const db = Obj.getDatabase(subject);
  const starTag = useStarTag(db);
  // Sync feeds → curate magazine → apply per-feed keep, plus state/error
  // tracking. See `useCurate` at the bottom of the file.
  const { state, error, curate: handleCurate } = useCurate(subject, db);
  // Reactive query of every Subscription.Feed in the space — used to render the source
  // feed name on each tile without each tile having to subscribe to its own ref.
  const allFeeds = useQuery(db, Filter.type(Subscription.Feed));
  // Index feeds by bare object id (last DXN segment) — `Obj.getDXN(feed)`
  // returns the space-scoped form (`dxn:echo:<spaceId>:<id>`), but
  // `post.feed.dxn` from a `Ref.make` carries the local-id form
  // (`dxn:echo:@:<id>`). String-comparing the two never matches, so the
  // tile's `feedName` lookup silently fails. Indexing by bare id reconciles.
  const feedNamesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const feed of allFeeds) {
      const name = feed.name;
      if (name) {
        map.set((feed as { id: string }).id, name);
      }
    }
    return map;
  }, [allFeeds]);

  // Kick off load for any Post refs that aren't yet resolved so `ref.target`
  // becomes populated reactively on the next render cycle. Also pre-load each
  // resolved Post's `feed` ref so `MagazineTile` can show the feed name.
  useEffect(() => {
    for (const ref of subject.posts) {
      if (!ref.target) {
        void ref.load().catch((err) => log.catch(err));
        continue;
      }
      const feedRef = ref.target.feed;
      if (feedRef && !feedRef.target) {
        void feedRef.load().catch((err) => log.catch(err));
      }
    }
  }, [subject.posts]);

  // When the user removes a feed from the magazine via ObjectProperties, prune any
  // curated posts whose source feed is no longer present. Posts without a known
  // source feed (e.g. synced before `Post.feed` was added) are left alone.
  useEffect(() => {
    const feedDxns = new Set(subject.feeds.map((ref) => ref.dxn.toString()));
    const orphanIds = new Set<string>();
    for (const postRef of subject.posts) {
      const post = postRef.target;
      const feedRef = post?.feed;
      if (!feedRef) {
        continue;
      }
      if (!feedDxns.has(feedRef.dxn.toString())) {
        orphanIds.add(postRef.dxn.toString());
      }
    }
    if (orphanIds.size === 0) {
      return;
    }
    Obj.change(subject, (subject) => {
      subject.posts = subject.posts.filter((ref) => !orphanIds.has(ref.dxn.toString()));
    });
  }, [subject, subject.feeds, subject.posts]);

  const posts = useMemo(() => {
    const resolved: Subscription.Post[] = [];
    const seenDxn = new Set<string>();
    const seenLink = new Set<string>();
    const seenGuid = new Set<string>();
    for (const ref of subject.posts) {
      const target = ref.target;
      if (!target) {
        continue;
      }
      // Dedup by DXN, then by link, then by guid. Two different feeds can publish the
      // same article (distinct Post objects, same `link` / `guid`); without secondary
      // dedup the masonry shows them as duplicate tiles.
      const dxn = Obj.getDXN(target).toString();
      if (seenDxn.has(dxn)) {
        continue;
      }
      if (target.link && seenLink.has(target.link)) {
        continue;
      }
      if (target.guid && seenGuid.has(target.guid)) {
        continue;
      }
      seenDxn.add(dxn);
      if (target.link) {
        seenLink.add(target.link);
      }
      if (target.guid) {
        seenGuid.add(target.guid);
      }
      resolved.push(target);
    }

    // Filter archived unless explicitly shown, then optionally filter to starred only.
    let visible = showArchived ? resolved : resolved.filter((post) => !post.archived);
    if (onlyStarred) {
      visible = visible.filter((post) => hasMetaTag(post, starTag));
    }

    if (sort === 'rank') {
      // Lower rank = more relevant; posts without rank fall to the bottom.
      return [...visible].sort((postA, postB) => {
        const rankA = postA.rank ?? Number.POSITIVE_INFINITY;
        const rankB = postB.rank ?? Number.POSITIVE_INFINITY;
        return rankA - rankB;
      });
    }

    // Default: most recent first. Parse `published` to a timestamp because RSS feeds
    // commonly emit RFC 822 strings (e.g. "Mon, 25 Apr 2026 ...") which don't sort
    // correctly lexicographically. Posts without a parseable date fall to the bottom.
    const timestamp = (post: Subscription.Post): number => {
      if (!post.published) {
        return Number.NEGATIVE_INFINITY;
      }
      const ms = Date.parse(post.published);
      return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms;
    };

    return [...visible].sort((postA, postB) => timestamp(postB) - timestamp(postA));
    // `subject.posts` may return the same array proxy reference even when its
    // contents change (ECHO's reactive proxy is stable per-object).
    // Including `.length` and a content fingerprint as deps forces re-computation on
    // any add/remove, so the masonry tiles re-render after Curate / Clear.
  }, [
    subject.posts,
    subject.posts.length,
    subject.posts.map((ref) => ref.dxn.toString()).join(),
    sort,
    showArchived,
    onlyStarred,
    starTag,
  ]);

  // Reset the magazine's curated post list. Starred posts are preserved so
  // the user doesn't lose manually-saved items; a follow-up Curate will
  // repopulate from the source feeds.
  const handleClear = useCallback(() => {
    if (!db || subject.posts.length === 0) {
      return;
    }
    const tag = findStarTag(db);
    const tagDxn = tag ? Obj.getDXN(tag).toString() : undefined;
    const next = subject.posts.filter((ref) => {
      const post = ref.target;
      if (!post || !tagDxn) {
        return false;
      }
      return Obj.getMeta(post).tags?.includes(tagDxn) ?? false;
    });
    if (next.length === subject.posts.length) {
      return;
    }

    Obj.change(subject, (subject) => {
      subject.posts = next;
    });
  }, [subject, db]);

  const handleOpen = useCallback(
    (post: Subscription.Post) => {
      if (!post.readAt) {
        Obj.change(post, (post) => {
          const mutable = post as Obj.Mutable<typeof post>;
          mutable.readAt = new Date().toISOString();
        });
      }

      // Fetch the full article content in the background when we don't already have it.
      // Writes the extracted body to post.content so PostArticle can render the full article,
      // and picks the first image (if any) as the hero. Failures are logged and non-fatal.
      if (post.link && !post.content) {
        // In the browser, route through the dev-server CORS proxy. Server-side callers
        // (e.g. agent operations) pass no proxy and fetch directly.
        const corsProxy = typeof window !== 'undefined' ? '/api/rss?url=' : undefined;
        void fetchArticle(post.link, { corsProxy })
          .then(({ text, imageUrls }) => {
            const hero = imageUrls[0];
            Obj.change(post, (post) => {
              const mutable = post as Obj.Mutable<typeof post>;
              if (text) {
                mutable.content = text;
              }
              if (hero) {
                mutable.imageUrl = hero;
              }
            });
          })
          .catch((err) => log.catch(err, { postLink: post.link }));
      }

      void showItem({
        contextId: id,
        selectionId: post.id,
        companion: linkedSegment('post'),
        path: getObjectPathFromObject(post),
      });
    },
    [id, showItem],
  );

  const tileItems = useMemo(
    () =>
      posts.map((post) => {
        // Match the post's source feed by bare object id; `post.feed.dxn` is  local-id form, while `feedNamesById` is keyed by id directly.
        const feedId = post.feed ? (post.feed.dxn.toString().split(':').pop() ?? '') : '';
        return {
          post,
          current: post.id === currentId,
          feedName: feedId ? feedNamesById.get(feedId) : undefined,
          published: formatPublished(post),
          starTag,
          onOpen: handleOpen,
        };
      }),
    [posts, currentId, handleOpen, feedNamesById, starTag],
  );

  const curateDisabled = state !== 'idle' || subject.feeds.length === 0;
  const curateTooltip =
    subject.feeds.length === 0
      ? t('no-feeds.label')
      : state === 'syncing'
        ? t('syncing-feeds.label')
        : state === 'curating'
          ? t('curating-articles.label')
          : undefined;

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.ToggleGroup
            type='single'
            value={sort}
            onValueChange={(value) => {
              if (value === 'date' || value === 'rank') {
                setSort(value);
              }
            }}
          >
            <Toolbar.ToggleGroupItem value='date' aria-label={t('sort-by-date.label')} title={t('sort-by-date.label')}>
              <Icon icon='ph--calendar--regular' size={4} />
            </Toolbar.ToggleGroupItem>
            <Toolbar.ToggleGroupItem value='rank' aria-label={t('sort-by-rank.label')} title={t('sort-by-rank.label')}>
              <Icon icon='ph--list-numbers--regular' size={4} />
            </Toolbar.ToggleGroupItem>
          </Toolbar.ToggleGroup>
          <Toolbar.ToggleGroup
            type='single'
            value={onlyStarred ? 'on' : ''}
            onValueChange={(value) => setOnlyStarred(value === 'on')}
          >
            <Toolbar.ToggleGroupItem value='on' aria-label={t('only-starred.label')} title={t('only-starred.label')}>
              <Icon icon={onlyStarred ? 'ph--star--fill' : 'ph--star--regular'} size={4} />
            </Toolbar.ToggleGroupItem>
          </Toolbar.ToggleGroup>
          <Toolbar.ToggleGroup
            type='single'
            value={showArchived ? 'show' : ''}
            onValueChange={(value) => setShowArchived(value === 'show')}
          >
            <Toolbar.ToggleGroupItem
              value='show'
              aria-label={t('show-archived.label')}
              title={t('show-archived.label')}
            >
              <Icon icon='ph--archive--regular' size={4} />
            </Toolbar.ToggleGroupItem>
          </Toolbar.ToggleGroup>
          <Toolbar.Separator />
          <Toolbar.IconButton
            label={t('clear-magazine.label')}
            icon='ph--eraser--regular'
            iconOnly
            disabled={state !== 'idle'}
            onClick={handleClear}
          />
          <Toolbar.IconButton
            label={curateTooltip ?? t('curate.label')}
            icon={state === 'idle' ? 'ph--sparkle--regular' : 'ph--circle-notch--regular'}
            iconClassNames={state !== 'idle' ? 'animate-spin' : undefined}
            iconOnly
            disabled={curateDisabled}
            onClick={handleCurate}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        {posts.length === 0 ? (
          <div className='flex items-center justify-center h-full text-subdued text-sm'>
            {t('empty-magazine.message')}
          </div>
        ) : (
          <Masonry.Root Tile={TileAdapter} minColumnWidth={20} maxColumnWidth={25}>
            <Masonry.Content thin centered padding>
              <Masonry.Viewport
                classNames='py-2'
                items={tileItems}
                getId={(data) => (data?.post ? Obj.getDXN(data.post).toString() : '')}
              />
            </Masonry.Content>
          </Masonry.Root>
        )}
      </Panel.Content>
      {error && (
        <Panel.Statusbar>
          <p className='flex p-1 items-center text-error-text'>{error}</p>
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};

type TileData = {
  post: Subscription.Post;
  current: boolean;
  feedName?: string;
  published?: string;
  starTag?: Tag.Tag;
  onOpen: (post: Subscription.Post) => void;
};

const TileAdapter = ({ data }: { data: TileData | undefined; index: number }) => {
  if (!data?.post) {
    return null;
  }

  return (
    <MagazineTile
      post={data.post}
      current={data.current}
      feedName={data.feedName}
      published={data.published}
      starTag={data.starTag}
      onOpen={data.onOpen}
    />
  );
};

//
// Curate flow
//

type CurateState = 'idle' | 'syncing' | 'curating';

/**
 * Bare-object-id helper. `Ref.make(obj).dxn` produces the local-id form
 * (`dxn:echo:@:<id>`) while persisted refs may carry the space-scoped form
 * (`dxn:echo:<spaceId>:<id>`). The id (last segment) is the only stable
 * comparison key across DXN forms.
 */
const dxnTailId = (dxn: string): string => dxn.split(':').pop() ?? dxn;

/** Sortable timestamp from `post.published`; missing/unparseable falls last. */
const publishedTimestamp = (post: Subscription.Post): number => {
  if (!post.published) {
    return Number.NEGATIVE_INFINITY;
  }
  const ms = Date.parse(post.published);
  return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms;
};

/**
 * Apply each Subscription.Feed's `keep` bound to `magazine.posts`. Each
 * feed contributes up to its own `feed.keep ?? DEFAULT_KEEP` posts — NOT a
 * single magazine-wide cap. With a global cap, sorting all curated posts by
 * `published` and slicing top-N silently drops every post from the
 * older-dated feed; per-feed keep gives each feed a fair share. Starred
 * posts and unresolved refs are preserved unconditionally.
 *
 * Lands as a separate `Obj.change` write (not chained inside the
 * CurateMagazine operation) — chaining a second `mutable.posts = ...`
 * inside one change block trips ECHO's deep-mapper dedup invariant.
 */
const applyPerFeedKeep = (magazine: Magazine.Magazine, db: Database.Database | undefined): void => {
  const tag = db ? findStarTag(db) : undefined;
  const tagDxn = tag ? Obj.getDXN(tag).toString() : undefined;
  const isStarred = (post: Subscription.Post) =>
    tagDxn ? (Obj.getMeta(post).tags?.includes(tagDxn) ?? false) : false;

  // Build feed-id → keep map by walking magazine.feeds.
  const feedKeepById = new Map<string, number>();
  for (const feedRef of magazine.feeds) {
    const feed = feedRef.target;
    if (feed) {
      feedKeepById.set(dxnTailId(feedRef.dxn.toString()), feed.keep ?? Subscription.DEFAULT_KEEP);
    }
  }

  const resolvedPairs: Array<{ ref: Ref.Ref<Subscription.Post>; post: Subscription.Post }> = [];
  const unresolvedRefs: Ref.Ref<Subscription.Post>[] = [];
  for (const ref of magazine.posts) {
    const post = ref.target;
    if (post) {
      resolvedPairs.push({ ref, post });
    } else {
      unresolvedRefs.push(ref);
    }
  }

  // Group resolved posts by their source feed id. Posts without a known
  // source feed (e.g. older posts from before `Post.feed` was added) end up
  // in the `undefined` bucket and are kept unconditionally.
  const byFeedId = new Map<
    string | undefined,
    Array<{ ref: Ref.Ref<Subscription.Post>; post: Subscription.Post }>
  >();
  for (const pair of resolvedPairs) {
    const feedRefDxn = pair.post.feed?.dxn.toString();
    const feedId = feedRefDxn ? dxnTailId(feedRefDxn) : undefined;
    const arr = byFeedId.get(feedId) ?? [];
    arr.push(pair);
    byFeedId.set(feedId, arr);
  }

  const nextRefs: Ref.Ref<Subscription.Post>[] = [];
  for (const [feedId, pairs] of byFeedId) {
    if (feedId === undefined) {
      nextRefs.push(...pairs.map(({ ref }) => ref));
      continue;
    }
    const feedKeep = feedKeepById.get(feedId) ?? Subscription.DEFAULT_KEEP;
    const starredPairs = pairs.filter(({ post }) => isStarred(post));
    const candidatePairs = pairs
      .filter(({ post }) => !isStarred(post))
      .sort((pairA, pairB) => publishedTimestamp(pairB.post) - publishedTimestamp(pairA.post));
    const keptCandidates = candidatePairs.slice(0, Math.max(0, feedKeep));
    nextRefs.push(...starredPairs.map(({ ref }) => ref), ...keptCandidates.map(({ ref }) => ref));
  }
  nextRefs.push(...unresolvedRefs);

  if (nextRefs.length !== magazine.posts.length) {
    Obj.change(magazine, (magazine) => {
      magazine.posts = nextRefs;
    });
  }
};

/**
 * Drives the Curate button: load each magazine feed, sync the ones with a
 * url, run CurateMagazine to enrich + append queue items into the magazine,
 * then apply each feed's `keep` bound. Returns the in-flight `state`
 * (`'idle' | 'syncing' | 'curating'`), an `error` message on failure, and
 * the `curate` callback bound to the toolbar button.
 */
const useCurate = (subject: Magazine.Magazine, db: Database.Database | undefined) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const [state, setState] = useState<CurateState>('idle');
  const [error, setError] = useState<string>();

  const curate = useCallback(async () => {
    if (state !== 'idle') {
      return;
    }
    setError(undefined);
    try {
      setState('syncing');
      const feeds = await Promise.all(
        subject.feeds.map(async (ref) => {
          try {
            const feed = await ref.load();
            if (feed.feed) {
              await feed.feed.load();
            }
            return feed;
          } catch (err) {
            log.catch(err);
            return undefined;
          }
        }),
      );
      const validFeeds = feeds.filter((feed): feed is Subscription.Feed => Boolean(feed?.url));
      const syncResults = await Promise.allSettled(
        validFeeds.map((feed) => invokePromise(FeedOperation.SyncFeed, { feed })),
      );
      syncResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          log.catch(result.reason, { feedUrl: validFeeds[index]?.url });
        }
      });
      setState('curating');
      await invokePromise(FeedOperation.CurateMagazine, { magazine: Ref.make(subject) });
      applyPerFeedKeep(subject, db);
    } catch (err) {
      log.catch(err);
      setError(t('curate-error.message'));
    } finally {
      setState('idle');
    }
  }, [state, subject, db, invokePromise, t]);

  return { state, error, curate };
};
