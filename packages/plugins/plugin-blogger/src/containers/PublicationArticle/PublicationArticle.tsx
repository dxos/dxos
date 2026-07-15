//
// Copyright 2026 DXOS.org
//

import React, { memo, useCallback, useMemo, useState } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject, useObjects } from '@dxos/echo-react';
import { Panel } from '@dxos/react-ui';
import { ObjectForm } from '@dxos/react-ui-form';
import { Masonry } from '@dxos/react-ui-masonry';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { PostCard } from '#components';
import { meta } from '#meta';
import { BloggerOperation } from '#operations';
import { Blog } from '#types';

type ViewMode = 'gallery' | 'instructions';

/** Data for a single Masonry tile: the resolved post plus its open handler. */
type PostTileData = {
  post: Blog.Post;
  onClick: () => void;
};

export type PublicationArticleProps = AppSurface.ObjectArticleProps<Blog.Publication>;

/**
 * Article surface for a `Blog.Publication`: a schema-driven form of the Publication's own fields
 * (name) on top, and below it a toolbar toggle that swaps between a Masonry gallery of `PostCard`
 * tiles (one per `subject.posts`) and the publication's shared instructions document, embedded via
 * the markdown article Surface (`AppSurface.Article` matched against `Markdown.Document` by
 * `plugin-markdown`'s `surface.document`).
 */
export const PublicationArticle = ({ role, attendableId, subject }: PublicationArticleProps) => {
  const [publication] = useObject(subject);
  const { invokePromise } = useOperationInvoker();
  const [mode, setMode] = useState<ViewMode>('gallery');

  const handleOpenPost = useCallback(
    (post: Blog.Post) => {
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

  const postRefs = publication.posts;
  // `useObjects` subscribes to each post ref's resolution (and later mutations) via `Obj.atom(ref)`,
  // re-rendering this component once cold-loaded refs resolve. We only need it as a recompute
  // trigger below — the tile data still reads the live `.target` (not the snapshots `useObjects`
  // returns) because `PostCard` re-subscribes to the live post itself via its own `useObject` call.
  // Mirrors the identical `.target`-cold-load fix applied via `useObjects` in
  // plugin-trip/TripArticle.tsx (see its comment on the same defect).
  const loadedPosts = useObjects(postRefs ?? []);

  const tileItems = useMemo<PostTileData[]>(
    () =>
      (postRefs ?? [])
        .map((ref) => ref.target)
        .filter((post): post is Blog.Post => !!post)
        .map((post) => ({ post, onClick: () => handleOpenPost(post) })),
    [postRefs, loadedPosts, handleOpenPost],
  );

  const instructionsRef = publication.instructions;
  // Reactive resolution trigger: `useObject` on a `Ref` subscribes via `Obj.atom(ref)` — the
  // `org.dxos.echo-react.useObjectReactive` idiom — and calls `ref.load()` internally, re-rendering
  // this component once the target resolves. The returned snapshot is discarded; we re-read the
  // live `.target` below because `MarkdownArticle` needs the live object (`Obj.isObject` /
  // `Obj.getDatabase`, used for file upload and `@`-link queries), not a snapshot.
  useObject(instructionsRef);
  const instructions = instructionsRef.target;
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
          <div className='grid h-full grid-rows-[minmax(0,1fr)_minmax(0,2fr)] overflow-hidden'>
            <div className='min-bs-0 overflow-hidden'>
              <ObjectForm object={subject} type={Blog.Publication} />
            </div>
            <div className='min-bs-0 overflow-hidden'>
              {mode === 'gallery' ? (
                <Masonry.Root Tile={PostTile}>
                  <Masonry.Content>
                    <Masonry.Viewport items={tileItems} getId={(data) => Obj.getURI(data.post)} />
                  </Masonry.Content>
                </Masonry.Root>
              ) : (
                instructionsData && <Surface.Surface type={AppSurface.Article} data={instructionsData} limit={1} />
              )}
            </div>
          </div>
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
