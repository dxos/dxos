//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { type AppSurface, useShowItem } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useObject } from '@dxos/react-client/echo';
import { Panel, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useSelection } from '@dxos/react-ui-attention';
import { Masonry } from '@dxos/react-ui-masonry';
import { Menu } from '@dxos/react-ui-menu';

import { useVisibleMagazinePosts } from '#atoms';
import { meta } from '#meta';
import { FeedOperation, Magazine, Subscription } from '#types';

import { MagazineTile } from './MagazineTile';
import { useToolbar } from './useToolbar';

export type MagazineArticleProps = AppSurface.ObjectArticleProps<Magazine.Magazine>;

export const MagazineArticle = ({ role, subject, attendableId }: MagazineArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const invoker = useOperationInvoker();
  const [magazine] = useObject(subject);

  // The toolbar owns the view-filter atom and the curate/clear handlers; the article reads `view` to
  // filter the visible posts.
  const { menu, viewAtom } = useToolbar({ magazine: subject });
  const view = useAtomValue(viewAtom);

  const showItem = useShowItem();
  const id = attendableId ?? Obj.getURI(magazine);
  const currentId = useSelection(id, 'single');
  const db = Obj.getDatabase(magazine);
  const posts = useVisibleMagazinePosts(subject, view);

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
      <Menu.Root {...menu} attendableId={attendableId}>
        <Panel.Toolbar asChild>
          <Menu.Toolbar />
        </Panel.Toolbar>
      </Menu.Root>
      <Panel.Content>
        {noPosts ? (
          // TODO(burdon): Factor out common EmptyState component; of push into Masonry, List, etc.
          <div className='h-full flex items-center justify-center text-subdued text-sm'>
            {t('empty-magazine.message')}
          </div>
        ) : (
          <Masonry.Root Tile={TileAdapter} minColumnWidth={20} maxColumnWidth={25}>
            <Masonry.Content thin centered padding>
              {/* TODO(burdon): Move items into Root. */}
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
