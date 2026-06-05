//
// Copyright 2026 DXOS.org
//

import { Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useContext, useEffect, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { getObjectPathFromObject, LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface, useShowItem } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useObject } from '@dxos/react-client/echo';
import { Panel, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useSelected } from '@dxos/react-ui-attention';
import { Masonry } from '@dxos/react-ui-masonry';

import { type MagazineView, useVisibleMagazinePosts } from '#atoms';
import { meta } from '#meta';
import { FeedOperation, Magazine, Subscription } from '#types';

import { MagazineTile } from './MagazineTile';
import { MagazineToolbar } from './MagazineToolbar';

export type MagazineArticleProps = AppSurface.ObjectArticleProps<Magazine.Magazine>;

export const MagazineArticle = ({ role, subject, attendableId }: MagazineArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const [magazine] = useObject(subject);
  const registry = useContext(RegistryContext);

  const showItem = useShowItem();
  const id = attendableId ?? Obj.getURI(magazine);
  const currentId = useSelected(id, 'single');
  // View filter and curate-busy flag are atoms so the toolbar's action graph subscribes to them
  // directly (via `get`) and rebuilds reactively, rather than being driven by React deps. The list
  // still needs the view value, so we read it here; `busy` is write-only here (read only by the toolbar).
  const viewAtom = useMemo(() => Atom.make<MagazineView>('default'), []);
  const busyAtom = useMemo(() => Atom.make(false), []);
  const view = useAtomValue(viewAtom);
  const db = Obj.getDatabase(magazine);
  // Atom families are keyed by the live `subject` (snapshots are fresh objects each change and would
  // break memoization). The list atom fires only on membership changes (add/remove, or a post
  // crossing the view filter); per-post state changes are isolated to their own tiles.
  const posts = useVisibleMagazinePosts(subject, view);

  const handleCurate = useCallback(async () => {
    if (registry.get(busyAtom)) {
      return;
    }
    registry.set(busyAtom, true);
    try {
      // Thread the spaceId so the handler's spawn environment has `space` — required for the
      // process-affinity services (Database.Service, and AgentPrompt when AI curation is restored).
      // Failures surface as a toast via `notify` (invokePromise resolves with `{ error }`, never throws).
      await invokePromise(
        FeedOperation.CurateMagazine,
        { magazine: Ref.make(subject) },
        { spaceId: db?.spaceId, notify: { error: ['curate-error.message', { ns: meta.id }] } },
      );
    } finally {
      registry.set(busyAtom, false);
    }
  }, [registry, busyAtom, subject, invokePromise, db]);

  const handleToggleStar = useCallback(
    async (post: Subscription.Post, starred: boolean) => {
      const subscription = await post.source?.load();
      if (db && subscription) {
        void Subscription.setTag(subscription, post.id, db, 'starred', !starred);
      }
    },
    [db],
  );

  const handleClear = useCallback(() => {
    // Failures surface as a toast via `notify`; invokePromise resolves with `{ error }`, never throws.
    void invokePromise(
      FeedOperation.ClearMagazine,
      { magazine: Ref.make(subject) },
      { spaceId: db?.spaceId, notify: { error: ['clear-error.message', { ns: meta.id }] } },
    );
  }, [invokePromise, subject, db]);

  const handleOpen = useCallback(
    async (post: Subscription.Post) => {
      const subscription = await post.source?.load();
      if (subscription && !Subscription.getReadAt(subscription, post.id)) {
        void Subscription.setReadAt(subscription, post.id, new Date().toISOString());
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
        magazine: subject,
        current: currentId === post.id,
        onToggleStar: handleToggleStar,
        onOpen: handleOpen,
      })),
    [posts, currentId, handleOpen, handleToggleStar],
  );

  return (
    <Panel.Root role={role}>
      <MagazineToolbar
        magazine={subject}
        viewAtom={viewAtom}
        busyAtom={busyAtom}
        attendableId={attendableId}
        onClear={handleClear}
        onCurate={handleCurate}
      />
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
    </Panel.Root>
  );
};

type TileData = {
  id: string;
  post: Subscription.Post;
  magazine: Magazine.Magazine;
  current: boolean;
  onToggleStar?: (post: Subscription.Post, starred: boolean) => void;
  onOpen?: (post: Subscription.Post) => void;
};

const TileAdapter = ({ data }: { data: TileData | undefined; index: number }) => {
  if (!data?.post) {
    return null;
  }

  return (
    <MagazineTile
      post={data.post}
      magazine={data.magazine}
      current={data.current}
      onOpen={data.onOpen}
      onToggleStar={data.onToggleStar}
    />
  );
};
