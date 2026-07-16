//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Surface, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref, Type } from '@dxos/echo';
import { useObject, useObjects, useQuery } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { Connection } from '@dxos/plugin-connector/types';
import { Panel } from '@dxos/react-ui';
import { ObjectForm } from '@dxos/react-ui-form';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { meta } from '#meta';
import { BloggerOperation } from '#operations';
import { Blog, BloggerCapabilities } from '#types';

export type PostArticleProps = AppSurface.ObjectArticleProps<Blog.Post>;

// The Post form shows only the name and the inline outline content (drafts + description are managed
// elsewhere); pick those fields from the Post schema rather than rendering all of them.
const PostFormSchema = Type.getSchema(Blog.Post).pipe(Schema.pick('name', 'outline'));

/**
 * Article surface for a `Blog.Post`: a schema-driven form of the Post's own fields (name,
 * description) on top, a toolbar of one tab per draft (plus add/publish/import actions), and the
 * currently selected draft's body below. Publish and import are enabled only once a
 * `PublisherService` is contributed AND a `Connection` whose access token `source` matches that
 * publisher exists in the same space.
 */
export const PostArticle = ({ role, attendableId, subject }: PostArticleProps) => {
  const [post] = useObject(subject);
  const { invokePromise } = useOperationInvoker();

  // Reactive ref-ARRAY resolution (mirrors PublicationArticle's `postRefs`/`loadedPosts`): `useObjects`
  // re-renders as each draft ref resolves (and on later edits); we still read the live `.target` below.
  const draftRefs = post.drafts ?? [];
  const loadedDrafts = useObjects(draftRefs);
  const drafts = useMemo(
    () => draftRefs.map((ref) => ref.target).filter((draft): draft is Blog.Draft => !!draft),
    [draftRefs, loadedDrafts],
  );

  const [selectedIndex, setSelectedIndex] = useState(() => Math.max(draftRefs.length - 1, 0));
  // Clamp defensively (e.g. a draft removed elsewhere) so the index always addresses a loaded draft.
  const clampedIndex = drafts.length > 0 ? Math.min(selectedIndex, drafts.length - 1) : 0;
  const selectedDraft = drafts[clampedIndex];

  const selectedDraftContentRef = selectedDraft?.content;
  useObject(selectedDraftContentRef);
  const selectedDraftDoc = selectedDraftContentRef?.target;
  // Distinct from the Post's own `attendableId`: the draft editor needs a unique id so it registers
  // separately in markdown's EditorViews registry (for scrollToAnchor) and aligns with the comments
  // selection key `selectionAspect[getURI(draftDoc)]`.
  const selectedDraftDocId = selectedDraftDoc ? Obj.getURI(selectedDraftDoc) : undefined;
  const draftData = useMemo(
    () =>
      selectedDraftDoc && selectedDraftDocId
        ? { subject: selectedDraftDoc, attendableId: selectedDraftDocId }
        : undefined,
    [selectedDraftDoc, selectedDraftDocId],
  );

  // Publish the selected draft's doc as the Post plank's single-selection so the app-graph connector
  // (see `postComments` in app-graph-builder) can anchor the comments companion to that doc. contextId
  // is the Post plank node id (== `attendableId`), the id the connector reads its selection from.
  const publishDraftSelection = useCallback(
    (docId: string) => {
      void invokePromise(LayoutOperation.Select, {
        contextId: attendableId,
        subject: { mode: 'single', id: docId },
      });
    },
    [invokePromise, attendableId],
  );

  const handleSelectDraft = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      const doc = drafts[index]?.content.target;
      if (doc) {
        publishDraftSelection(Obj.getURI(doc));
      }
    },
    [drafts, publishDraftSelection],
  );

  // Publish the initial selection on mount (and whenever the resolved doc changes) so the companion
  // has a target before the user touches the draft tabs.
  useEffect(() => {
    if (selectedDraftDocId) {
      publishDraftSelection(selectedDraftDocId);
    }
  }, [selectedDraftDocId, publishDraftSelection]);

  const handleAddDraft = useCallback(async () => {
    const nextIndex = draftRefs.length;
    await invokePromise(BloggerOperation.AddDraft, { post: Ref.make(subject) });
    setSelectedIndex(nextIndex);
  }, [invokePromise, subject, draftRefs.length]);

  // Publisher + connection resolution for the publish/import actions. A publisher is contributed by
  // a provider plugin (e.g. plugin-typefully, later); we default to the first one, matching
  // `PublishDraft`/`ImportDrafts`'s own `publisherId` fallback. The `Connection` it needs is looked
  // up by its access token's `source` (the provider-neutral credential handle) — mirrors the
  // `useObject(connection.accessToken)` pattern used by `ConnectorPicker`/`ConnectionSettingsArticle`
  // (plugin-connector) to reactively resolve a connection's access-token source.
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

  const handlePublish = useCallback(async () => {
    if (!publisher || !connection || !selectedDraft) {
      return;
    }
    try {
      await invokePromise(BloggerOperation.PublishDraft, {
        draft: Ref.make(selectedDraft),
        connection: Ref.make(connection),
        publisherId: publisher.id,
      });
    } catch (error) {
      // The publisher call hits an external API (rate limits, auth, network); surface via the log.
      log.error('failed to publish draft', { error });
    }
  }, [invokePromise, publisher, connection, selectedDraft]);

  const handleImport = useCallback(async () => {
    if (!publisher || !connection) {
      return;
    }
    try {
      await invokePromise(BloggerOperation.ImportDrafts, {
        post: Ref.make(subject),
        connection: Ref.make(connection),
        publisherId: publisher.id,
      });
    } catch (error) {
      // The publisher call hits an external API (rate limits, auth, network); surface via the log.
      log.error('failed to import drafts', { error });
    }
  }, [invokePromise, publisher, connection, subject]);

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .group(
          'drafts',
          {
            label: ['drafts-tabs.menu', { ns: meta.profile.key }],
            variant: 'toggleGroup',
            selectCardinality: 'single',
            value: `draft-${clampedIndex}`,
          },
          (group) => {
            drafts.forEach((draft, index) => {
              group.action(
                `draft-${index}`,
                {
                  label: draft.label ?? `Draft ${index + 1}`,
                  iconOnly: false,
                  checked: index === clampedIndex,
                  testId: `post.toolbar.draft-${index}`,
                },
                () => handleSelectDraft(index),
              );
            });
          },
        )
        .action(
          'add-draft',
          {
            label: ['add-draft.label', { ns: meta.profile.key }],
            icon: 'ph--plus--regular',
            disposition: 'toolbar',
            testId: 'post.toolbar.addDraft',
          },
          () => void handleAddDraft(),
        )
        .separator()
        .action(
          'publish',
          {
            label: ['publish.label', { ns: meta.profile.key }],
            icon: 'ph--cloud-arrow-up--regular',
            disposition: 'toolbar',
            disabled: !canSync,
            testId: 'post.toolbar.publish',
          },
          () => void handlePublish(),
        )
        .action(
          'import',
          {
            label: ['import.label', { ns: meta.profile.key }],
            icon: 'ph--cloud-arrow-down--regular',
            disposition: 'toolbar',
            disabled: !canSync,
            testId: 'post.toolbar.import',
          },
          () => void handleImport(),
        )
        .build(),
    [drafts, clampedIndex, canSync, handleSelectDraft, handleAddDraft, handlePublish, handleImport],
  );

  return (
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Panel.Root role={role}>
        <Panel.Toolbar>
          <Menu.Toolbar className='dx-document' />
        </Panel.Toolbar>
        <Panel.Content>
          <div className='grid h-full grid-rows-[auto_minmax(0,2fr)] gap-3 overflow-hidden'>
            <ObjectForm object={subject} type={Blog.Post} schema={PostFormSchema} />
            <div className='dx-container'>
              {draftData && <Surface.Surface type={AppSurface.Article} data={draftData} limit={1} />}
            </div>
          </div>
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
  );
};

PostArticle.displayName = 'PostArticle';
