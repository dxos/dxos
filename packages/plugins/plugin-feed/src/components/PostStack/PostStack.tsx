//
// Copyright 2025 DXOS.org
//

import React, { type KeyboardEvent, forwardRef, useCallback, useMemo, useState } from 'react';

import { Type } from '@dxos/echo';
import { Card, Icon, ScrollArea, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';

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
          <ScrollArea.Root orientation='vertical' padding centered>
            <ScrollArea.Viewport ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={PostTile}
                classNames='my-2'
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
        <Card.Root ref={forwardedRef} fullWidth>
          <Card.Header>
            <Card.IconBlock>
              <Card.Icon icon='ph--dot-outline--regular' />
            </Card.IconBlock>
            <Card.Text classNames='truncate'>{post.title ?? t('post-title.placeholder')}</Card.Text>
            {post.link && (
              <Card.IconBlock>
                <a href={post.link} target='_blank' rel='noreferrer' className='shrink-0'>
                  <Icon icon='ph--arrow-square-out--regular' size={4} />
                </a>
              </Card.IconBlock>
            )}
          </Card.Header>
          <Card.Body>
            {post.author && (
              <Card.Row icon='ph--user--regular'>
                <Card.Text variant='description'>{post.author}</Card.Text>
              </Card.Row>
            )}
            {post.description && (
              <Card.Row>
                {/* TODO(burdon): Convert to HTML. */}
                <Card.Html variant='description' classNames='line-clamp-5' html={post.description ?? post.content} />
              </Card.Row>
            )}
            {published && (
              <Card.Row icon='ph--calendar--regular'>
                <Card.Text variant='description'>{published}</Card.Text>
              </Card.Row>
            )}
          </Card.Body>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

PostTile.displayName = 'PostTile';
