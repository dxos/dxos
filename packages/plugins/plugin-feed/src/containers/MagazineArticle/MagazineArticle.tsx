//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { getObjectPathFromObject } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Entity, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useShowItem } from '@dxos/plugin-deck';
import { useObject } from '@dxos/react-client/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useSelected } from '@dxos/react-ui-attention';
import { Masonry } from '@dxos/react-ui-masonry';

import { meta } from '#meta';
import { FeedOperation } from '#operations';
import { type Magazine, type Subscription } from '#types';

import { fetchArticle } from '../../util/fetch-article';
import { MagazineTile } from './MagazineTile';

type CurateState = 'idle' | 'syncing' | 'curating';

export type MagazineArticleProps = AppSurface.ObjectArticleProps<Magazine.Magazine>;

export const MagazineArticle = ({ role, subject, attendableId }: MagazineArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const showItem = useShowItem();
  useObject(subject);
  const id = attendableId ?? Obj.getDXN(subject).toString();
  const currentId = useSelected(id, 'single');
  const [state, setState] = useState<CurateState>('idle');
  const [error, setError] = useState<string>();

  // Kick off load for any Post refs that aren't yet resolved so `ref.target`
  // becomes populated reactively on the next render cycle.
  useEffect(() => {
    for (const ref of subject.posts) {
      if (!ref.target) {
        void ref.load().catch((err) => log.catch(err));
      }
    }
  }, [subject.posts]);

  const posts = useMemo(() => {
    const resolved: Subscription.Post[] = [];
    for (const ref of subject.posts) {
      const target = ref.target;
      if (target) {
        resolved.push(target);
      }
    }
    return resolved.reverse();
  }, [subject.posts]);

  const handleCurate = useCallback(async () => {
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
    } catch (err) {
      log.catch(err);
      setError(t('curate-error.message'));
    } finally {
      setState('idle');
    }
  }, [state, subject, invokePromise, t]);

  const handleOpen = useCallback(
    (post: Subscription.Post) => {
      if (!post.readAt) {
        Obj.change(post, (post) => {
          const mutable = post as Obj.Mutable<typeof post>;
          mutable.readAt = new Date().toISOString();
        });
      }

      // Fetch the full article content in the background when we don't
      // already have it. Writes the extracted body to post.content so
      // PostArticle can render the full article, and picks the first image
      // (if any) as the hero. Failures are logged and non-fatal.
      if (post.link && !post.content) {
        void fetchArticle(post.link)
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
    () => posts.map((post) => ({ post, current: post.id === currentId, onOpen: handleOpen })),
    [posts, currentId, handleOpen],
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
          <Toolbar.Text>{Entity.getLabel(subject)}</Toolbar.Text>
          <Toolbar.Separator />
          <Toolbar.IconButton
            label={curateTooltip ?? t('curate.label')}
            icon={state === 'idle' ? 'ph--sparkle--regular' : 'ph--circle-notch--regular'}
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
            <Masonry.Content
              items={tileItems}
              getId={(data) => Obj.getDXN(data.post).toString()}
              thin
              centered
              padding
            />
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

type TileData = { post: Subscription.Post; current: boolean; onOpen: (post: Subscription.Post) => void };

const TileAdapter = ({ data }: { data: TileData; index: number }) => (
  <MagazineTile post={data.post} current={data.current} onOpen={data.onOpen} />
);
