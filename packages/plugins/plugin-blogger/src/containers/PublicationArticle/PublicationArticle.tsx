//
// Copyright 2026 DXOS.org
//

import React, { memo, useCallback, useMemo, useState } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Panel } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { PostCard } from '#components';
import { meta } from '#meta';
import { BloggerOperation } from '#operations';
import { Blogger } from '#types';

export type PublicationArticleProps = AppSurface.ObjectArticleProps<Blogger.Publication>;

type ViewMode = 'gallery' | 'instructions';

/** Data for a single Masonry tile: the resolved post plus its open handler. */
type PostTileData = {
  post: Blogger.Post;
  onClick: () => void;
};

/**
 * Article surface for a `Blogger.Publication`: a toolbar toggle swaps between a Masonry gallery of
 * `PostCard` tiles (one per `subject.posts`) and the publication's shared instructions document,
 * embedded via the markdown article Surface (`AppSurface.Article` matched against `Markdown.Document`
 * by `plugin-markdown`'s `surface.document`).
 */
export const PublicationArticle = ({ role, attendableId, subject }: PublicationArticleProps) => {
  const [publication] = useObject(subject);
  const { invokePromise } = useOperationInvoker();
  const [mode, setMode] = useState<ViewMode>('gallery');

  const handleOpenPost = useCallback(
    (post: Blogger.Post) => {
      void invokePromise(LayoutOperation.Open, {
        subject: [Paths.getObjectPathFromObject(post)],
        pivotId: attendableId,
        navigation: 'immediate',
      });
    },
    [invokePromise, attendableId],
  );

  const handleAddPost = useCallback(() => {
    const db = Obj.getDatabase(subject);
    if (!db) {
      return;
    }

    void invokePromise(BloggerOperation.AddPost, { publication: Ref.make(subject), target: db });
  }, [invokePromise, subject]);

  const tileItems = useMemo<PostTileData[]>(
    () =>
      (publication.posts ?? [])
        .map((ref) => ref.target)
        .filter((post): post is Blogger.Post => !!post)
        .map((post) => ({ post, onClick: () => handleOpenPost(post) })),
    [publication.posts, handleOpenPost],
  );

  const instructions = publication.instructions?.target;
  const instructionsData = useMemo(
    () => (instructions ? { subject: instructions, attendableId } : undefined),
    [instructions, attendableId],
  );

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'toggle-view',
          {
            label: [mode === 'gallery' ? 'instructions-view.label' : 'gallery-view.label', { ns: meta.profile.key }],
            icon: mode === 'gallery' ? 'ph--note-pencil--regular' : 'ph--squares-four--regular',
            disposition: 'toolbar',
            testId: 'publication.toolbar.toggleView',
          },
          () => setMode((current) => (current === 'gallery' ? 'instructions' : 'gallery')),
        )
        .action(
          'add-post',
          {
            label: ['add-post.label', { ns: meta.profile.key }],
            icon: 'ph--plus--regular',
            disposition: 'toolbar',
            testId: 'publication.toolbar.addPost',
          },
          () => handleAddPost(),
        )
        .build(),
    [mode, handleAddPost],
  );

  return (
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Panel.Root role={role}>
        <Panel.Toolbar asChild>
          <Menu.Toolbar />
        </Panel.Toolbar>
        <Panel.Content>
          {mode === 'gallery' ? (
            <Masonry.Root Tile={PostTile}>
              <Masonry.Content>
                <Masonry.Viewport items={tileItems} getId={(data) => Obj.getURI(data.post)} />
              </Masonry.Content>
            </Masonry.Root>
          ) : (
            instructionsData && <Surface.Surface type={AppSurface.Article} data={instructionsData} limit={1} />
          )}
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
  );
};

PublicationArticle.displayName = 'PublicationArticle';

const PostTile = memo(({ data }: { data: PostTileData | undefined; index: number }) => {
  if (!data) {
    return null;
  }

  return <PostCard post={data.post} onClick={data.onClick} />;
});

PostTile.displayName = 'PostTile';
