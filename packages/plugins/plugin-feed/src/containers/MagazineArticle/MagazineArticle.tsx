//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getObjectPathFromObject } from '@dxos/app-toolkit';
import { type AppSurface, useShowItem } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref, type URI } from '@dxos/echo';
import { log } from '@dxos/log';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Panel, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useSelected } from '@dxos/react-ui-attention';
import { Masonry } from '@dxos/react-ui-masonry';

import { meta } from '#meta';
import { FeedOperation } from '#types';
import { type Magazine, Subscription } from '#types';

import { dxnToEntityId, getReadAt, hasTag, setReadAt, setTag, useSystemTags } from '../../util';
import { MagazineTile, formatPublished } from './MagazineTile';
import { MagazineSort, type CurateState } from './MagazineToolbar';
import { MagazineToolbar, type MagazineView } from './MagazineToolbar';

export type MagazineArticleProps = AppSurface.ObjectArticleProps<Magazine.Magazine>;

export const MagazineArticle = ({ role, subject, attendableId }: MagazineArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const [magazine] = useObject(subject);

  const showItem = useShowItem();
  const id = attendableId ?? Obj.getURI(magazine);
  const currentId = useSelected(id, 'single');
  const [sort, setSort] = useState<MagazineSort>('date');
  const [view, setView] = useState<MagazineView>('default');
  const db = Obj.getDatabase(magazine);
  const { starredUri, archivedUri } = useSystemTags(db);

  const handleToggleStar = useCallback(
    (post: Subscription.Post) => {
      const subscription = post.source?.target;
      if (db && subscription) {
        void setTag(
          subscription,
          (post as { id: string }).id,
          db,
          'starred',
          !hasTag(subscription, post.id, starredUri),
        );
      }
    },
    [db, starredUri],
  );

  // Sync feeds → curate magazine → apply per-feed keep.
  // State machine wraps the {@link FeedOperation.RefreshMagazine} invocation.
  const [state, setState] = useState<CurateState>('idle');
  const [error, setError] = useState<string>();
  const handleCurate = useCallback(async () => {
    if (state !== 'idle') {
      return;
    }
    setError(undefined);
    setState('busy');
    try {
      await invokePromise(FeedOperation.CurateMagazine, { magazine: Ref.make(subject) });
    } catch (err) {
      log.catch(err);
      setError(t('curate-error.message'));
    } finally {
      setState('idle');
    }
  }, [state, subject, invokePromise, t]);

  // Reactive query of every Subscription.Subscription in the space — used to render the source
  // feed name on each tile without each tile having to subscribe to its own ref.
  const allFeeds = useQuery(db, Filter.type(Subscription.Subscription));

  // Per-Post read/star/archive state lives on the source Subscriptions (postState/tags). `useQuery`
  // only re-fires on result-set changes, not nested mutations, so subscribe directly and bump a
  // revision counter — threaded into the derived memos below so they recompute when a `setTag` /
  // `setReadAt` mutates a Subscription.
  const [revision, bumpRevision] = useReducer((value: number) => value + 1, 0);
  useEffect(() => {
    const unsubs = allFeeds.map((feed) => Obj.subscribe(feed, bumpRevision));
    return () => unsubs.forEach((unsub) => unsub());
  }, [allFeeds]);

  // Index feeds by bare object id (last DXN segment) — `Obj.getURI(feed)`
  // returns the space-scoped form (`uri:echo:<spaceId>:<id>`), but
  // `post.feed.uri` from a `Ref.make` carries the local-id form
  // (`uri:echo:@:<id>`). String-comparing the two never matches, so the
  // tile's `feedName` lookup silently fails. Indexing by bare id reconciles.
  const feedNamesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const feed of allFeeds) {
      // Fall back to URL when sync hasn't populated `name` yet (or the source RSS has no
      // `<title>`) so each tile still shows provenance. Use `||` so empty-string names
      // (parser-supplied empty `<title>`) also fall through to the URL.
      const label = feed.name || feed.url;
      if (label) {
        map.set((feed as { id: string }).id, label);
      }
    }
    return map;
  }, [allFeeds]);

  // Compute posts. `byId` exposes every hydrated post (regardless of view) for
  // consumers that must not read an unresolved `ref.target` (prune, Clear).
  const { posts, byId } = useMagazinePosts(subject, sort, view, starredUri, archivedUri, revision);

  // Post ref resolution (incl. their source feed refs) is owned by
  // `useMagazinePosts`, which loads them via `ref.load()` into state — see the
  // note there.

  // When the user removes a feed from the magazine via ObjectProperties, prune any
  // curated posts whose source feed is no longer present.
  // Compare by bare object id rather than full DXN — `magazine.feeds[i].uri` and
  // `post.feed.uri` may carry different prefixes (`uri:echo:@:<id>` vs
  // `uri:echo:<spaceId>:<id>`) depending on how each ref was constructed, so
  // string-comparing the full DXN flags every post as an orphan and wipes the
  // magazine on mount.
  useEffect(() => {
    const feedIds = new Set(magazine.feeds.map((ref) => dxnToEntityId(ref.uri)));
    const orphanIds = new Set<string>();
    for (const postRef of magazine.posts) {
      // Use the hydrated post (queue-backed `ref.target` is undefined until
      // loaded); skip unresolved posts so they're never pruned prematurely. The
      // `byId` dep reruns this effect once hydration completes.
      const post = byId.get(dxnToEntityId(postRef.uri));
      const feedRef = post?.source;
      if (!feedRef) {
        continue;
      }
      if (!feedIds.has(dxnToEntityId(feedRef.uri))) {
        orphanIds.add(dxnToEntityId(postRef.uri));
      }
    }
    if (orphanIds.size === 0) {
      return;
    }

    Obj.update(subject, (subject) => {
      subject.posts = subject.posts.filter((ref) => !orphanIds.has(dxnToEntityId(ref.uri)));
    });
  }, [subject, magazine.feeds, magazine.posts, byId]);

  // Reset the magazine's curated post list. Starred posts are preserved so
  // the user doesn't lose manually-saved items; a follow-up Curate will
  // repopulate from the source feeds.
  const handleClear = useCallback(() => {
    if (!db || magazine.posts.length === 0) {
      return;
    }

    const next = magazine.posts.filter((ref) => {
      const post = byId.get(dxnToEntityId(ref.uri));
      // Preserve posts that haven't hydrated yet — we can't determine their
      // starred state, and dropping them would lose manually-saved items.
      if (!post) {
        return true;
      }
      const subscription = post.source?.target;
      return hasTag(subscription, (post as { id: string }).id, starredUri);
    });

    if (next.length === magazine.posts.length) {
      return;
    }

    Obj.update(subject, (subject) => {
      subject.posts = next;
    });
  }, [subject, magazine.posts, db, starredUri, byId]);

  const handleOpen = useCallback(
    (post: Subscription.Post) => {
      const subscription = post.source?.target;
      const postId = (post as { id: string }).id;
      if (subscription && !getReadAt(subscription, postId)) {
        setReadAt(subscription, postId, new Date().toISOString());
      }

      // Fetch the full article content in the background. The operation
      // appends a PostContent entry to the subscription's contentFeed and is
      // idempotent (no-op when an entry already exists or the Post has no
      // link); failures are logged and non-fatal.
      if (post.link) {
        void invokePromise(FeedOperation.LoadPostContent, { post: Ref.make(post) }).catch((err) =>
          log.catch(err, { postLink: post.link }),
        );
      }

      // Use the Magazine's path (which lives in space.db) — the Post itself is
      // a queue item and has no graph path. `selectionId: post.id` carries the
      // post identity through the showItem call regardless.
      void showItem({
        contextId: id,
        selectionId: post.id,
        companion: linkedSegment('post'),
        path: getObjectPathFromObject(subject),
      });
    },
    [id, showItem, invokePromise],
  );

  // Open the ObjectProperties companion when the magazine has no posts so the user
  // can configure subscription feeds without an empty pane staring back at them.
  // Use `magazine.posts.length` (the unfiltered set) so view filters like 'archived'
  // or 'starred' don't trigger this when the magazine actually still has posts.
  useEffect(() => {
    if (magazine.posts.length === 0) {
      void invokePromise(LayoutOperation.UpdateCompanion, {
        subject: linkedSegment('settings'),
      }).catch((err) => log.catch(err));
    }
  }, [magazine.posts.length, invokePromise]);

  const tileItems = useMemo<TileData[]>(
    () =>
      posts.map((post) => {
        // Match the post's source feed by bare object id; `post.feed.uri` is local-id form,
        // while `feedNamesById` is keyed by id directly.
        const feedId = post.source ? (post.source.uri.split(':').pop() ?? '') : '';
        const subscription = post.source?.target;
        return {
          post,
          current: post.id === currentId,
          read: subscription ? getReadAt(subscription, post.id) !== undefined : false,
          starred: hasTag(subscription, post.id, starredUri),
          onToggleStar: handleToggleStar,
          feedName: feedId ? feedNamesById.get(feedId) : undefined,
          published: formatPublished(post),
          onOpen: handleOpen,
        };
      }),
    [posts, currentId, handleOpen, handleToggleStar, starredUri, feedNamesById, revision],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <MagazineToolbar
          hasFeeds={magazine.feeds.length > 0}
          state={state}
          sort={sort}
          onSortChange={setSort}
          view={view}
          onViewChange={setView}
          onClear={handleClear}
          onCurate={handleCurate}
        />
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
                getId={(data) => (data?.post ? Obj.getURI(data.post) : '')}
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
  read: boolean;
  starred: boolean;
  onToggleStar: (post: Subscription.Post) => void;
  feedName?: string;
  published?: string;
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
      read={data.read}
      starred={data.starred}
      onToggleStar={data.onToggleStar}
      feedName={data.feedName}
      published={data.published}
      onOpen={data.onOpen}
    />
  );
};

const useMagazinePosts = (
  subject: Magazine.Magazine,
  sort: MagazineSort,
  view: MagazineView,
  starredUri: string | undefined,
  archivedUri: string | undefined,
  // Bumped when a source Subscription's tags/read state mutate (the filter reads them).
  revision: number,
) => {
  const postFingerprint = subject.posts.map((ref) => ref.uri).join();

  // Resolve each Post (and its source feed) ref via `load()` into state. Curated
  // Posts live in a queue, so their synchronous `ref.target` accessor stays
  // `undefined` until loaded — reading `ref.target` directly would silently drop
  // every curated post. Loading into state also re-renders once resolution
  // completes (the ref URIs don't change when a target loads, so a memo keyed on
  // them would never recompute).
  const [resolved, setResolved] = useState<Subscription.Post[]>([]);
  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      subject.posts.map(async (ref) => {
        try {
          const post = ref.target ?? (await ref.load());
          if (post?.source && !post.source.target) {
            await post.source.load().catch((err) => log.catch(err));
          }
          return post ?? undefined;
        } catch (err) {
          log.catch(err);
          return undefined;
        }
      }),
    ).then((posts) => {
      if (!cancelled) {
        setResolved(posts.filter((post): post is Subscription.Post => Boolean(post)));
      }
    });
    return () => {
      cancelled = true;
    };
    // Re-resolve whenever the set of post refs changes (add/remove/curate).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postFingerprint]);

  // All hydrated posts keyed by bare object id. Consumers that operate on the
  // full set regardless of view (prune, Clear) read from this so they never act
  // on an unresolved `ref.target` mid-hydration.
  const byId = useMemo(() => {
    const map = new Map<string, Subscription.Post>();
    for (const post of resolved) {
      map.set((post as { id: string }).id, post);
    }
    return map;
  }, [resolved]);

  const posts = useMemo<Subscription.Post[]>(() => {
    const seenDxn = new Set<URI.URI>();
    const seenLink = new Set<string>();
    const seenGuid = new Set<string>();

    // Dedup by DXN, then by link, then by guid. Two different feeds can publish the
    // same article (distinct Post objects, same `link` / `guid`); without secondary
    // dedup the masonry shows them as duplicate tiles.
    const deduped: Subscription.Post[] = [];
    for (const target of resolved) {
      const uri = Obj.getURI(target);
      if (
        seenDxn.has(uri) ||
        (target.link && seenLink.has(target.link)) ||
        (target.guid && seenGuid.has(target.guid))
      ) {
        continue;
      }

      seenDxn.add(uri);
      if (target.link) {
        seenLink.add(target.link);
      }
      if (target.guid) {
        seenGuid.add(target.guid);
      }

      deduped.push(target);
    }

    // View mode determines which posts the tile grid shows.
    // - 'archived'  → only archived posts.
    // - 'starred'   → only starred (non-archived) posts.
    // - 'default'   → everything except archived.
    const isArchived = (post: Subscription.Post) => hasTag(post.source?.target, post.id, archivedUri);
    const isStarred = (post: Subscription.Post) => hasTag(post.source?.target, post.id, starredUri);
    let visible: Subscription.Post[];
    switch (view) {
      case 'archived':
        visible = deduped.filter((post) => isArchived(post));
        break;
      case 'starred':
        visible = deduped.filter((post) => !isArchived(post) && isStarred(post));
        break;
      default:
        visible = deduped.filter((post) => !isArchived(post));
        break;
    }

    if (sort === 'rank') {
      // Lower rank = more relevant; posts without rank fall to the bottom.
      // Rank lives on `Magazine.postState`; the post itself no longer carries it.
      const rankFor = (post: Subscription.Post) => {
        const id = (post as { id: string }).id;
        return subject.postState?.[id]?.rank ?? Number.POSITIVE_INFINITY;
      };
      return [...visible].sort((postA, postB) => rankFor(postA) - rankFor(postB));
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
  }, [
    // `resolved` is the state populated by the load effect above; it changes
    // identity on every (re-)resolution, driving the masonry to re-render after
    // Curate / Clear. `revision` bumps on Subscription tag/read mutations.
    resolved,
    sort,
    view,
    subject.postState,
    starredUri,
    archivedUri,
    revision,
  ]);

  return { posts, byId };
};
