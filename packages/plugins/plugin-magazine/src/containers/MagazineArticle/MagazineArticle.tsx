//
// Copyright 2026 DXOS.org
//

import { Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { useCallback, useContext, useEffect, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { type AppSurface, useShowItem } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { useObject } from '@dxos/react-client/echo';
import { Panel, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useSelection } from '@dxos/react-ui-attention';
import { Masonry } from '@dxos/react-ui-masonry';

import { type MagazineView, useVisibleMagazinePosts } from '#atoms';
import { meta } from '#meta';
import { FeedOperation, Magazine, Subscription } from '#types';

import { MagazineTile } from './MagazineTile';
import { MagazineToolbar } from './MagazineToolbar';

export type MagazineArticleProps = AppSurface.ObjectArticleProps<Magazine.Magazine>;

export const MagazineArticle = ({ role, subject, attendableId }: MagazineArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const invoker = useOperationInvoker();
  const [magazine] = useObject(subject);
  const registry = useContext(RegistryContext);

  const showItem = useShowItem();
  const id = attendableId ?? Obj.getURI(magazine);
  const currentId = useSelection(id, 'single');
  const viewAtom = useMemo(() => Atom.make<MagazineView>('default'), []);
  const busyAtom = useMemo(() => Atom.make(false), []);
  const view = useAtomValue(viewAtom);
  const db = Obj.getDatabase(magazine);
  const posts = useVisibleMagazinePosts(subject, view);

  const handleCurate = useCallback(() => {
    if (registry.get(busyAtom)) {
      return;
    }
    registry.set(busyAtom, true);
    void EffectEx.runAndForwardErrors(
      invoker
        .invoke(
          FeedOperation.CurateMagazine,
          { magazine: Ref.make(subject) },
          { spaceId: db?.spaceId, notify: { error: ['curate-error.message', { ns: meta.profile.key }] } },
        )
        .pipe(Effect.ensuring(Effect.sync(() => registry.set(busyAtom, false)))),
    );
  }, [registry, busyAtom, invoker, subject, db]);

  const handleClear = useCallback(() => {
    if (registry.get(busyAtom)) {
      return;
    }
    registry.set(busyAtom, true);
    void EffectEx.runAndForwardErrors(
      invoker
        .invoke(
          FeedOperation.ClearMagazine,
          { magazine: Ref.make(subject) },
          { spaceId: db?.spaceId, notify: { error: ['clear-error.message', { ns: meta.profile.key }] } },
        )
        .pipe(Effect.ensuring(Effect.sync(() => registry.set(busyAtom, false)))),
    );
  }, [registry, busyAtom, invoker, subject, db]);

  const handleToggleStar = useCallback(
    async (post: Subscription.Post, starred: boolean) => {
      const subscription = await post.source?.load();
      if (db && subscription) {
        void Subscription.setTag(subscription, post.id, db, 'starred', !starred);
      }
    },
    [db],
  );

  const handleOpen = useCallback(
    async (post: Subscription.Post) => {
      const subscription = await post.source?.load();
      if (subscription && !Subscription.getReadAt(subscription, post.id)) {
        void Subscription.setReadAt(subscription, post.id, new Date().toISOString());
      }
      if (post.link) {
        void invoker
          .invokePromise(FeedOperation.LoadPostContent, { post: Ref.make(post) })
          .catch((err) => log.catch(err, { postLink: post.link }));
      }
      void showItem({
        contextId: id,
        selectionId: post.id,
        companion: linkedSegment('post'),
        path: Paths.getObjectPathFromObject(subject),
      });
    },
    [id, showItem, invoker, subject],
  );

  const noPosts = posts.length === 0;
  useEffect(() => {
    if (noPosts) {
      void invoker.invokePromise(LayoutOperation.UpdateCompanion, {
        subject: linkedSegment('settings'),
      });
    }
  }, [noPosts, invoker]);

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
      <Panel.Toolbar asChild>
        <MagazineToolbar
          magazine={subject}
          viewAtom={viewAtom}
          busyAtom={busyAtom}
          attendableId={attendableId}
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
