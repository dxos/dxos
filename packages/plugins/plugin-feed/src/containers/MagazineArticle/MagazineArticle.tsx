//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { getObjectPathFromObject, LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface, useShowItem } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';
import { useObject } from '@dxos/react-client/echo';
import { Panel, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useSelected } from '@dxos/react-ui-attention';
import { Masonry } from '@dxos/react-ui-masonry';

import { meta } from '#meta';
import { FeedOperation, Magazine, Subscription } from '#types';

import { findSystemTagUri, getReadAt, hasTag, setReadAt, setTag, useVisibleMagazinePosts } from '../../state';
import { MagazineTile } from './MagazineTile';
import { type CurateState, MagazineToolbar, type MagazineView } from './MagazineToolbar';

export type MagazineArticleProps = AppSurface.ObjectArticleProps<Magazine.Magazine>;

export const MagazineArticle = ({ role, subject, attendableId }: MagazineArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const [magazine] = useObject(subject);

  const showItem = useShowItem();
  const id = attendableId ?? Obj.getURI(magazine);
  const currentId = useSelected(id, 'single');
  const [view, setView] = useState<MagazineView>('default');
  const db = Obj.getDatabase(magazine);
  // Atom families are keyed by the live `subject` (snapshots are fresh objects each change and would
  // break memoization). The list atom fires only on membership changes (add/remove, or a post
  // crossing the view filter); per-post state changes are isolated to their own tiles.
  const posts = useVisibleMagazinePosts(subject, view);

  const [state, setState] = useState<CurateState>('idle');
  const [error, setError] = useState<string>();
  const handleCurate = useCallback(async () => {
    if (state !== 'idle') {
      return;
    }
    setError(undefined);
    setState('busy');
    try {
      // Thread the spaceId so the handler's spawn environment has `space` — required for the
      // process-affinity services (Database.Service, and AgentPrompt when AI curation is restored).
      await invokePromise(FeedOperation.CurateMagazine, { magazine: Ref.make(subject) }, { spaceId: db?.spaceId });
    } catch (err) {
      log.catch(err);
      setError(t('curate-error.message'));
    } finally {
      setState('idle');
    }
  }, [state, subject, invokePromise, t, db]);

  const handleToggleStar = useCallback(
    async (post: Subscription.Post, starred: boolean) => {
      const subscription = await post.source?.load();
      if (db && subscription) {
        void setTag(subscription, post.id, db, 'starred', !starred);
      }
    },
    [db],
  );

  const handleClear = useCallback(
    () =>
      runAndForwardErrors(
        Effect.gen(function* () {
          if (!db || magazine.posts.length === 0) {
            return;
          }
          const starredUri = yield* Effect.promise(() => findSystemTagUri(db, 'starred'));
          const loaded = yield* Effect.all(magazine.posts.map((ref) => Effect.promise(() => ref.load())));
          const subscriptions = yield* Effect.all(
            loaded.map((post) => {
              const source = post.source;
              return source ? Effect.promise(() => source.load()) : Effect.succeed(undefined);
            }),
          );
          const next = Array.zipWith(loaded, subscriptions, (post, subscription) => ({ post, subscription }))
            .filter(({ post, subscription }) => hasTag(subscription, post.id, starredUri))
            .map(({ post }) => Ref.make(post));
          if (next.length === magazine.posts.length) {
            return;
          }
          Obj.update(subject, (subject) => {
            subject.posts = next;
          });
        }),
      ),
    [subject, magazine.posts, db],
  );

  const handleOpen = useCallback(
    async (post: Subscription.Post) => {
      const subscription = await post.source?.load();
      if (subscription && !getReadAt(subscription, post.id)) {
        void setReadAt(subscription, post.id, new Date().toISOString());
      }
      // Fetch the full article content in the background. The operation appends a PostContent entry
      // to the subscription's contentFeed and is idempotent (no-op when an entry already exists or
      // the Post has no link); failures are logged and non-fatal.
      if (post.link) {
        void invokePromise(FeedOperation.LoadPostContent, { post: Ref.make(post) }).catch((err) =>
          log.catch(err, { postLink: post.link }),
        );
      }
      // Use the Magazine's path (which lives in space.db) — the Post itself is a queue item and has
      // no graph path. `selectionId: post.id` carries the post identity through the showItem call.
      void showItem({
        contextId: id,
        selectionId: post.id,
        companion: linkedSegment('post'),
        path: getObjectPathFromObject(subject),
      });
    },
    [id, showItem, invokePromise, subject],
  );

  // Open the ObjectProperties companion when the magazine has no posts so the user
  // can configure subscription feeds without an empty pane staring back at them.
  const noPosts = posts.length === 0;
  useEffect(() => {
    if (noPosts) {
      void invokePromise(LayoutOperation.UpdateCompanion, {
        subject: linkedSegment('settings'),
      });
    }
  }, [noPosts, invokePromise]);

  const tileItems = useMemo<TileData[]>(
    () =>
      posts.map((post) => ({
        id: post.id,
        post,
        current: currentId === post.id,
        onToggleStar: handleToggleStar,
        onOpen: handleOpen,
      })),
    [posts, currentId, handleOpen, handleToggleStar],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <MagazineToolbar
          hasFeeds={magazine.feeds.length > 0}
          state={state}
          view={view}
          onViewChange={setView}
          onClear={handleClear}
          onCurate={handleCurate}
        />
      </Panel.Toolbar>
      <Panel.Content>
        {noPosts ? (
          <div className='flex items-center justify-center h-full text-subdued text-sm'>
            {t('empty-magazine.message')}
          </div>
        ) : (
          <Masonry.Root Tile={TileAdapter} minColumnWidth={20} maxColumnWidth={25}>
            <Masonry.Content thin centered padding>
              <Masonry.Viewport classNames='py-2' items={tileItems} />
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
  id: string;
  post: Subscription.Post;
  current: boolean;
  onToggleStar?: (post: Subscription.Post, starred: boolean) => void;
  onOpen?: (post: Subscription.Post) => void;
};

const TileAdapter = ({ data }: { data: TileData | undefined; index: number }) => {
  if (!data?.post) {
    return null;
  }

  return <MagazineTile post={data.post} current={data.current} onOpen={data.onOpen} onToggleStar={data.onToggleStar} />;
};
