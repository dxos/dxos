//
// Copyright 2025 DXOS.org
//

import React, { type KeyboardEvent, forwardRef, useCallback, useMemo, useState } from 'react';

import { Type } from '@dxos/echo';
import { Block, Card, Focus, Icon, ScrollArea, composable, composableProps, useTranslation } from '@dxos/react-ui';
import { MarkdownView } from '@dxos/react-ui-markdown';
import { Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';

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
          <ScrollArea.Root orientation='vertical'>
            <ScrollArea.Viewport ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={PostTile}
                gap={8}
                items={items}
                draggable={false}
                getId={(item) => item.post.id}
                getScrollElement={() => viewport}
                estimateSize={() => 120}
              />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
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
        <Card.Root ref={forwardedRef}>
          <Card.Header>
            <Block>
              <Icon icon='ph--rss-simple--regular' />
            </Block>
            <Card.Text truncate>{post.title ?? t('post-title.placeholder')}</Card.Text>
            {post.link && (
              <Block rail='end'>
                <a href={post.link} target='_blank' rel='noreferrer' className='shrink-0'>
                  <Icon icon='ph--arrow-square-out--regular' size='md' />
                </a>
              </Block>
            )}
          </Card.Header>
          <Card.Body>
            {post.author && (
              <Card.Row>
                <Block>
                  <Icon icon='ph--user--regular' />
                </Block>
                <Card.Text variant='description'>{post.author}</Card.Text>
              </Card.Row>
            )}
            {(post.description || post.content) && (
              <Card.Row>
                <MarkdownView
                  content={post.description ?? post.content}
                  classNames='line-clamp-5 text-sm text-description'
                />
              </Card.Row>
            )}
            {published && (
              <Card.Row>
                <Block>
                  <Icon icon='ph--calendar--regular' />
                </Block>
                <Card.Text variant='description' classNames='text-info-text'>
                  {published}
                </Card.Text>
              </Card.Row>
            )}
          </Card.Body>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

PostTile.displayName = 'PostTile';
