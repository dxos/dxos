//
// Copyright 2026 DXOS.org
//

import React, { memo, useCallback, useMemo, useState } from 'react';

import { Surface, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useObject, useObjects, useQuery } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { Connection } from '@dxos/plugin-connector/types';
import { useActionRunner } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';
import { AlertDialog, Button, Panel, useTranslation } from '@dxos/react-ui';
import { ObjectForm } from '@dxos/react-ui-form';
import { Masonry } from '@dxos/react-ui-masonry';
import { Menu, MenuBuilder, graphActions, isToolbarAction, useMenuBuilder } from '@dxos/react-ui-menu';

import { PostCard } from '#components';
import { meta } from '#meta';
import { BloggerOperation } from '#operations';
import { Blog, BloggerCapabilities } from '#types';

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
  const { t } = useTranslation(meta.profile.key);
  const [publication] = useObject(subject);
  const { invokePromise } = useOperationInvoker();
  const { graph } = useAppGraph();
  const runAction = useActionRunner();
  const [mode, setMode] = useState<ViewMode>('gallery');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

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

  const handleDelete = useCallback(() => {
    void invokePromise(SpaceOperation.RemoveObjects, { objects: [subject] });
  }, [invokePromise, subject]);

  // Publisher + connection resolution for the Sync action. A publisher is contributed by a provider
  // plugin (e.g. plugin-typefully); default to the first. The `Connection` it needs is looked up by
  // its access token's `source` (the provider-neutral credential handle).
  const publishers = useCapabilities(BloggerCapabilities.PublisherService);
  const publisher = publishers[0];
  const db = Obj.getDatabase(subject);
  const connections = useQuery(db, Filter.type(Connection.Connection));
  const accessTokenRefs = useMemo(() => connections.map((connection) => connection.accessToken), [connections]);
  const loadedAccessTokens = useObjects(accessTokenRefs);
  const connection = useMemo(
    () =>
      publisher
        ? connections.find((candidate) => candidate.accessToken.target?.source === publisher.source)
        : undefined,
    [connections, loadedAccessTokens, publisher],
  );
  const canSync = !!publisher && !!connection;

  const handleSync = useCallback(async () => {
    if (!publisher || !connection) {
      return;
    }
    try {
      await invokePromise(BloggerOperation.SyncPosts, {
        publication: Ref.make(subject),
        connection: Ref.make(connection),
        publisherId: publisher.id,
      });
    } catch (error) {
      // The publisher call hits an external API (rate limits, auth, network); surface via the log.
      log.error('failed to sync posts', { error });
    }
  }, [invokePromise, publisher, connection, subject]);

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
    (get) =>
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
        .action(
          'sync',
          {
            label: ['sync.label', { ns: meta.profile.key }],
            icon: 'ph--arrows-clockwise--regular',
            disposition: 'toolbar',
            disabled: !canSync,
            testId: 'publication.toolbar.sync',
          },
          () => void handleSync(),
        )
        // "Connect <publisher>" contributed by plugin-connector's `connectorAuth` extension (via the
        // Publication type's `ConnectorAuthAnnotation`); shown until a matching Connection exists.
        .subgraph(graphActions(graph, get, attendableId, { filter: isToolbarAction }))
        // Overflow (⋮) menu at the end of the toolbar. Delete opens a confirmation dialog first.
        .menu('more', (menu) =>
          menu.action(
            'delete',
            {
              label: ['delete.label', { ns: meta.profile.key }],
              icon: 'ph--trash--regular',
              testId: 'publication.toolbar.delete',
            },
            () => setConfirmDeleteOpen(true),
          ),
        )
        .build(),
    [mode, handleAddPost, canSync, handleSync, graph, attendableId],
  );

  return (
    <Menu.Root {...menuActions} onAction={runAction} attendableId={attendableId}>
      <Panel.Root role={role}>
        <Panel.Toolbar>
          <Menu.Toolbar className='dx-document' />
        </Panel.Toolbar>
        <Panel.Content>
          <div className='grid h-full grid-rows-[auto_1fr] gap-3 overflow-hidden'>
            <ObjectForm object={subject} type={Blog.Publication} showTags={false} />
            <div className='dx-container'>
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

      <AlertDialog.Root open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialog.Overlay>
          <AlertDialog.Content>
            <AlertDialog.Body>
              <AlertDialog.Title>{t('delete-publication-dialog.title')}</AlertDialog.Title>
              <AlertDialog.Description>{t('delete-publication-dialog.description')}</AlertDialog.Description>
            </AlertDialog.Body>
            <AlertDialog.ActionBar>
              <AlertDialog.Cancel asChild>
                <Button>{t('cancel.label')}</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button variant='destructive' onClick={handleDelete}>
                  {t('delete-publication-dialog.confirm.label')}
                </Button>
              </AlertDialog.Action>
            </AlertDialog.ActionBar>
          </AlertDialog.Content>
        </AlertDialog.Overlay>
      </AlertDialog.Root>
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
