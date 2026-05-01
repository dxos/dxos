//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getObjectPathFromObject } from '@dxos/app-toolkit';
import { type AppSurface, useShowItem } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref, type Tag } from '@dxos/echo';
import { log } from '@dxos/log';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Panel, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useSelected } from '@dxos/react-ui-attention';
import { Masonry } from '@dxos/react-ui-masonry';

import { meta } from '#meta';
import { FeedOperation } from '#operations';
import { type Magazine, Subscription } from '#types';

import { findStarTag, hasMetaTag, useStarTag } from '../../util';
import { MagazineTile, formatPublished } from './MagazineTile';
import { MagazineSort, type CurateState } from './MagazineToolbar';
import { MagazineToolbar, type MagazineView } from './MagazineToolbar';

export type MagazineArticleProps = AppSurface.ObjectArticleProps<Magazine.Magazine>;

export const MagazineArticle = ({ role, subject, attendableId }: MagazineArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  useObject(subject);

  const showItem = useShowItem();
  const id = attendableId ?? Obj.getDXN(subject).toString();
  const currentId = useSelected(id, 'single');
  const [sort, setSort] = useState<MagazineSort>('date');
  const [view, setView] = useState<MagazineView>('default');
  const db = Obj.getDatabase(subject);
  const starTag = useStarTag(db);

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
      await invokePromise(FeedOperation.RefreshMagazine, { magazine: Ref.make(subject) });
    } catch (err) {
      log.catch(err);
      setError(t('curate-error.message'));
    } finally {
      setState('idle');
    }
  }, [state, subject, invokePromise, t]);

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

  // Compute posts.
  const posts = useMagazinePosts(subject, sort, view, starTag);

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
  // curated posts whose source feed is no longer present.
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
      // The operation writes post.content / post.imageUrl on success and is a no-op when
      // already loaded; failures are logged and non-fatal.
      if (post.link && !post.content) {
        void invokePromise(FeedOperation.LoadPostContent, { post: Ref.make(post) }).catch((err) =>
          log.catch(err, { postLink: post.link }),
        );
      }

      void showItem({
        contextId: id,
        selectionId: post.id,
        companion: linkedSegment('post'),
        path: getObjectPathFromObject(post),
      });
    },
    [id, showItem, invokePromise],
  );

  // Auto-curate when the set of subscribed feeds changes so the post list reflects
  // the new selection without requiring a manual Curate click. Fingerprint by sorted
  // DXN so swaps that preserve `feeds.length` still trigger.
  const feedFingerprint = useMemo(
    () =>
      subject.feeds
        .map((ref) => ref.dxn.toString())
        .sort()
        .join(),
    [subject.feeds],
  );

  // Key on both magazine identity and feed fingerprint so switching to a different
  // magazine with the same feeds still triggers curation for the new magazine.
  const previousCurateKey = useRef({ subject, feedFingerprint });
  useEffect(() => {
    if (
      previousCurateKey.current.subject !== subject ||
      previousCurateKey.current.feedFingerprint !== feedFingerprint
    ) {
      previousCurateKey.current = { subject, feedFingerprint };
      void invokePromise(FeedOperation.CurateMagazine, { magazine: Ref.make(subject) }).catch((err) => log.catch(err));
    }
  }, [feedFingerprint, subject, invokePromise]);

  // Open the ObjectProperties companion when the magazine has no posts so the user
  // can configure subscription feeds without an empty pane staring back at them.
  // Use `subject.posts.length` (the unfiltered set) so view filters like 'archived'
  // or 'starred' don't trigger this when the magazine actually still has posts.
  useEffect(() => {
    if (subject.posts.length === 0) {
      void invokePromise(LayoutOperation.UpdateCompanion, {
        subject: linkedSegment('settings'),
      }).catch((err) => log.catch(err));
    }
  }, [subject, subject.posts.length, invokePromise]);

  const tileItems = useMemo<TileData[]>(
    () =>
      posts.map((post) => {
        // Match the post's source feed by bare object id; `post.feed.dxn` is local-id form,
        // while `feedNamesById` is keyed by id directly.
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

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <MagazineToolbar
          hasFeeds={subject.feeds.length > 0}
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
          <div role='none' className='flex items-center justify-center h-full text-subdued text-sm'>
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

const useMagazinePosts = (
  subject: Magazine.Magazine,
  sort: MagazineSort,
  view: MagazineView,
  starTag: Tag.Tag | undefined,
) => {
  const postFingerprint = subject.posts.map((ref) => ref.dxn.toString()).join();

  return useMemo<Subscription.Post[]>(() => {
    const seenDxn = new Set<string>();
    const seenLink = new Set<string>();
    const seenGuid = new Set<string>();

    const resolved: Subscription.Post[] = [];
    for (const ref of subject.posts) {
      const target = ref.target;
      if (!target) {
        continue;
      }

      // Dedup by DXN, then by link, then by guid. Two different feeds can publish the
      // same article (distinct Post objects, same `link` / `guid`); without secondary
      // dedup the masonry shows them as duplicate tiles.
      const dxn = Obj.getDXN(target).toString();
      if (
        seenDxn.has(dxn) ||
        (target.link && seenLink.has(target.link)) ||
        (target.guid && seenGuid.has(target.guid))
      ) {
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

    // View mode determines which posts the tile grid shows.
    // - 'archived'  → only archived posts.
    // - 'starred'   → only starred (non-archived) posts.
    // - 'default'   → everything except archived.
    let visible: Subscription.Post[];
    switch (view) {
      case 'archived':
        visible = resolved.filter((post) => post.archived);
        break;
      case 'starred':
        visible = resolved.filter((post) => !post.archived && hasMetaTag(post, starTag));
        break;
      default:
        visible = resolved.filter((post) => !post.archived);
        break;
    }

    if (sort === 'rank') {
      // Lower rank = more relevant; posts without rank fall to the bottom.
      return [...visible].sort(
        ({ rank: rankA = Number.POSITIVE_INFINITY }, { rank: rankB = Number.POSITIVE_INFINITY }) => rankA - rankB,
      );
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
    // `subject.posts` may return the same array proxy reference even when its
    // contents change (ECHO's reactive proxy is stable per-object).
    // Including `.length` and a content fingerprint as deps forces re-computation on
    // any add/remove, so the masonry tiles re-render after Curate / Clear.
    subject.posts,
    subject.posts.length,
    postFingerprint,
    sort,
    view,
    starTag,
  ]);
};
