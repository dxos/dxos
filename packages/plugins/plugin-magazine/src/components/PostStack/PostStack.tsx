//
// Copyright 2025 DXOS.org
//

import React, { type KeyboardEvent, forwardRef, useCallback, useMemo, useState } from 'react';

import { Type } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { MarkdownView } from '@dxos/react-ui-markdown';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { Next } from '@dxos/react-ui/next';

import { Subscription } from '#types';

export type PostStackAction = { type: 'current'; postId: string };

export type PostStackActionHandler = (action: PostStackAction) => void;

export type PostStackProps = {
  id: string;
  posts?: Subscription.Post[];
  currentId?: string;
  onAction?: PostStackActionHandler;
};

export const PostStack = composable<HTMLDivElement, PostStackProps>(
  ({ posts = [], currentId, onAction, ...props }, forwardedRef) => {
    const [viewport, setViewport] = useState<HTMLElement | null>(null);
    const items = useMemo(() => posts.map((post) => ({ post, onAction })), [posts, onAction]);

    const handleCurrentChange = useCallback(
      (id: string | undefined) => {
        if (id) {
          onAction?.({ type: 'current', postId: id });
        }
      },
      [onAction],
    );

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        (document.activeElement as HTMLElement | null)?.click();
      }
    }, []);

    return (
      <Focus.Group asChild {...composableProps(props)} onKeyDown={handleKeyDown} ref={forwardedRef}>
        <Mosaic.Container
          asChild
          withFocus
          autoScroll={viewport}
          currentId={currentId}
          onCurrentChange={handleCurrentChange}
        >
          <Next.ScrollArea.Root orientation='vertical'>
            <Next.ScrollArea.Viewport ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={PostTile}
                gap={8}
                items={items}
                draggable={false}
                getId={(item) => item.post.id}
                getScrollElement={() => viewport}
                estimateSize={() => 120}
              />
            </Next.ScrollArea.Viewport>
          </Next.ScrollArea.Root>
        </Mosaic.Container>
      </Focus.Group>
    );
  },
);

PostStack.displayName = 'PostStack';

type PostTileData = {
  post: Subscription.Post;
  onAction?: PostStackActionHandler;
};

type PostTileProps = Pick<MosaicTileProps<PostTileData>, 'data' | 'location' | 'current'>;

const PostTile = forwardRef<HTMLDivElement, PostTileProps>(({ data, location, current }, forwardedRef) => {
  const post = data?.post;
  const { setCurrentId } = useMosaicContainer('PostTile');
  const { t } = useTranslation(Type.getTypename(Subscription.Post));

  const handleCurrentChange = useCallback(() => {
    if (post) {
      setCurrentId(post.id);
    }
  }, [post, setCurrentId]);

  if (!post) {
    return null;
  }

  const published = post.published ? new Date(post.published).toLocaleDateString() : undefined;

  return (
    <Mosaic.Tile asChild classNames='dx-hover dx-current' id={post.id} data={data} location={location}>
      <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
        <Next.Card.Root ref={forwardedRef}>
          <Next.Card.Header>
            <Next.Block>
              <Next.Icon icon='ph--rss-simple--regular' />
            </Next.Block>
            <Next.Card.Text truncate>{post.title ?? t('post-title.placeholder')}</Next.Card.Text>
            {post.link && (
              <Next.Block end>
                <a href={post.link} target='_blank' rel='noreferrer' className='shrink-0'>
                  <Next.Icon icon='ph--arrow-square-out--regular' size='md' />
                </a>
              </Next.Block>
            )}
          </Next.Card.Header>
          <Next.Card.Body>
            {post.author && (
              <Next.Card.Row>
                <Next.Block>
                  <Next.Icon icon='ph--user--regular' />
                </Next.Block>
                <Next.Card.Text variant='description'>{post.author}</Next.Card.Text>
              </Next.Card.Row>
            )}
            {(post.description || post.content) && (
              <Next.Card.Row>
                <MarkdownView
                  content={post.description ?? post.content}
                  classNames='line-clamp-5 text-sm text-description'
                />
              </Next.Card.Row>
            )}
            {published && (
              <Next.Card.Row>
                <Next.Block>
                  <Next.Icon icon='ph--calendar--regular' />
                </Next.Block>
                <Next.Card.Text variant='description' classNames='text-info-text'>
                  {published}
                </Next.Card.Text>
              </Next.Card.Row>
            )}
          </Next.Card.Body>
        </Next.Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

PostTile.displayName = 'PostTile';
