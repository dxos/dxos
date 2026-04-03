//
// Copyright 2025 DXOS.org
//

import React, { type KeyboardEvent, forwardRef, useCallback, useMemo, useState } from 'react';

import { Card, Icon, ScrollArea, useTranslation } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { composable, composableProps } from '@dxos/ui-theme';

import { Subscription } from '../../types';

//
// PostTile
//

export type PostStackAction = { type: 'current'; postId: string };

export type PostStackActionHandler = (action: PostStackAction) => void;

type PostTileData = {
  post: Subscription.Post;
  onAction?: PostStackActionHandler;
};

type PostTileProps = Pick<MosaicTileProps<PostTileData>, 'location' | 'data'> & { current?: boolean };

const PostTile = forwardRef<HTMLDivElement, PostTileProps>(({ data, location, current }, forwardedRef) => {
  const { post } = data;
  const { setCurrentId } = useMosaicContainer('PostTile');
  const { t } = useTranslation(Subscription.Post.typename);

  const handleCurrentChange = useCallback(() => {
    setCurrentId(post.id);
  }, [post.id, setCurrentId]);

  const published = post.published ? new Date(post.published).toLocaleDateString() : undefined;

  return (
    <Mosaic.Tile asChild classNames='dx-hover dx-current' id={post.id} data={data} location={location}>
      <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
        <Card.Root ref={forwardedRef}>
          <Card.Toolbar>
            <Card.IconBlock>
              <Card.Icon icon='ph--dot-outline--regular' />
            </Card.IconBlock>
            <Card.Text classNames='truncate'>{post.title ?? t('post title placeholder')}</Card.Text>
            {post.link && (
              <Card.IconBlock>
                <a href={post.link} target='_blank' rel='noreferrer' className='shrink-0'>
                  <Icon icon='ph--arrow-square-out--regular' size={4} />
                </a>
              </Card.IconBlock>
            )}
          </Card.Toolbar>
          <Card.Content>
            {post.author && (
              <Card.Row icon='ph--user--regular'>
                <Card.Text variant='description'>{post.author}</Card.Text>
              </Card.Row>
            )}
            {post.description && (
              <Card.Row>
                <Card.Html variant='description' html={post.description} />
              </Card.Row>
            )}
            {published && (
              <Card.Row icon='ph--calendar--regular'>
                <Card.Text variant='description'>{published}</Card.Text>
              </Card.Row>
            )}
          </Card.Content>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

PostTile.displayName = 'PostTile';

//
// PostStack
//

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
