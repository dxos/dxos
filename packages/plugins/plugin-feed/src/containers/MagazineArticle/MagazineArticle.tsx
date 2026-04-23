//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Entity, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useObject } from '@dxos/react-client/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';

import { meta } from '#meta';
import { FeedOperation } from '#operations';
import { type Magazine, type Subscription } from '#types';

import { ArticleReader } from './ArticleReader';
import { MagazineTile } from './MagazineTile';

export type MagazineArticleProps = AppSurface.ObjectArticleProps<Magazine.Magazine>;

type CurateState = 'idle' | 'syncing' | 'curating';

export const MagazineArticle = ({ role, subject }: MagazineArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  useObject(subject);
  const [state, setState] = useState<CurateState>('idle');
  const [error, setError] = useState<string>();
  const [readerPost, setReaderPost] = useState<Subscription.Post>();

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
            return await ref.load();
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

  const handleOpen = useCallback((post: Subscription.Post) => {
    setReaderPost(post);
    if (!post.readAt) {
      Obj.change(post, (post) => {
        const mutable = post as Obj.Mutable<typeof post>;
        mutable.readAt = new Date().toISOString();
      });
    }
  }, []);

  const tileItems = useMemo(() => posts.map((post) => ({ post, onOpen: handleOpen })), [posts, handleOpen]);

  const handleReaderOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setReaderPost(undefined);
    }
  }, []);

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
    <Panel.Root role={role} className='dx-document'>
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
          <Masonry.Root Tile={TileAdapter}>
            <Masonry.Content items={tileItems} getId={(data) => Obj.getDXN(data.post).toString()} />
          </Masonry.Root>
        )}
      </Panel.Content>
      <ArticleReader post={readerPost} onOpenChange={handleReaderOpenChange} />
      {error && (
        <Panel.Statusbar>
          <p className='flex p-1 items-center text-error-text'>{error}</p>
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};

type TileData = { post: Subscription.Post; onOpen: (post: Subscription.Post) => void };

const TileAdapter = ({ data }: { data: TileData; index: number }) => (
  <MagazineTile post={data.post} onOpen={data.onOpen} />
);
