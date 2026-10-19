//
// Copyright 2025 DXOS.org
//

import React, { type KeyboardEvent, forwardRef, useCallback, useMemo, useState } from 'react';

import { Type } from '@dxos/echo';
import { Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import * as Card from '@dxos/react-ui/Card';
import * as Focus from '@dxos/react-ui/Focus';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Util from '@dxos/react-ui/Util';

import { Subscription } from '#types';

import { formatDate, getImageUrl, getSnippet } from '../../util/index.ts';

export type PostStackAction = { type: 'current'; postId: string };

export type PostStackActionHandler = (action: PostStackAction) => void;

export type PostStackProps = {
  id: string;
  posts?: Subscription.Post[];
  currentId?: string;
  onAction?: PostStackActionHandler;
};

export const PostStack = Util.composable<HTMLDivElement, PostStackProps>(
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
      <Focus.Group asChild {...Util.composableProps(props)} onKeyDown={handleKeyDown} ref={forwardedRef}>
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
                estimateSize={() => 360}
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
  const { t } = Hooks.useTranslation(Type.getTypename(Subscription.Post));

  const handleCurrentChange = useCallback(() => {
    if (post) {
      setCurrentId(post.id);
    }
  }, [post, setCurrentId]);

  if (!post) {
    return null;
  }

  const imageUrl = getImageUrl(post);
  const snippet = getSnippet({ description: post.description ?? post.content }) || undefined;
  const published = formatDate(post.published);
  const title = post.title ?? t('post-title.placeholder');

  return (
    <Mosaic.Tile asChild classNames='dx-hover dx-current' id={post.id} data={data} location={location}>
      <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
        <Card.Root ref={forwardedRef}>
          {imageUrl && <Card.Poster alt={post.title ?? ''} src={imageUrl} fit='cover' classNames='rounded-t-xs' />}
          <Card.Header>
            <Card.Title lines={2}>{title}</Card.Title>
            {post.link && (
              <Layout.Block rail='end'>
                <a href={post.link} target='_blank' rel='noreferrer'>
                  <Icon.Icon icon='ph--arrow-square-out--regular' />
                </a>
              </Layout.Block>
            )}
          </Card.Header>
          <Card.Body>
            {snippet && (
              <Card.Row>
                <Card.Text variant='muted' lines={3}>
                  {snippet}
                </Card.Text>
              </Card.Row>
            )}
            {(post.author || published) && (
              <Card.Row trailing={published && <Card.Text variant='muted'>{published}</Card.Text>}>
                <Card.Text variant='muted' truncate>
                  {post.author}
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
