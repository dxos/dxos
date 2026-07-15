//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, Paths } from '@dxos/app-toolkit';
import { isSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Filter, Obj, Ref, Type } from '@dxos/echo';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';
import { linkedSegment, selectionAspect } from '@dxos/react-ui-attention';
import { Position, isNonNullable } from '@dxos/util';

import { meta } from '#meta';
import { BloggerOperation } from '#operations';
import { Blog } from '#types';

/** Stable navtree segment of the "Publications" section. */
const PUBLICATIONS_SEGMENT = 'publications';

/** Node type of the "Publications" section under a space's content group. */
const PUBLICATIONS_SECTION_TYPE = `${meta.profile.key}.publications-section`;

/**
 * Node type of a Publication branch node under the Publications section. A custom type (rather than
 * the ECHO typename) scopes the post actions to these nodes, so they never bleed onto Publication
 * objects that also appear under a space's Database section.
 */
const PUBLICATION_NODE_TYPE = `${meta.profile.key}.publication`;

/**
 * Contributes the Publications navtree hub, mirroring plugin-studio's Studio section: a "Publications"
 * section under each space's `content` group (always present, so it is the create hub), with a branch
 * node per Publication whose children are that Publication's Posts.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
    // Derive a single-mode selected id per context from the ViewStateManager selection slice, keyed by
    // the plank node id (mirrors plugin-inbox's `selectedId` family).
    const selectedId = Atom.family((nodeId: string) =>
      Atom.make((get) => {
        const selection = get(viewState.atom(selectionAspect, nodeId));
        return selection.mode === 'single' ? selection.id : undefined;
      }),
    );

    const extensions = yield* Effect.all([
      // "Publications" section under each space's content group.
      GraphBuilder.createExtension({
        id: 'publicationsSection',
        match: AppNodeMatcher.whenNavTreeGroup(Paths.GroupTypes.content),
        connector: (space) =>
          Effect.succeed([
            AppNode.makeSection({
              id: PUBLICATIONS_SEGMENT,
              type: PUBLICATIONS_SECTION_TYPE,
              label: ['publications.label', { ns: meta.profile.key }],
              icon: 'ph--books--regular',
              iconHue: 'amber',
              space,
              position: 400,
            }),
          ]),
      }),

      // A branch node per Publication under the section, each with its Posts as children, plus the
      // "+ Publication" action on the section.
      GraphBuilder.createExtension({
        id: 'publicationNodes',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === PUBLICATIONS_SECTION_TYPE && space ? Option.some(space) : Option.none();
        },
        connector: (space, get) => {
          const publications = get(space.db.query(Filter.type(Blog.Publication)).atom);
          return Effect.succeed(
            publications.map((publication) => {
              const snapshot = get(Obj.atom(publication));
              const posts = (snapshot.posts ?? [])
                .map((ref) => {
                  // Subscribe to the ref so the node re-runs once the target loads.
                  get(Obj.atom(ref));
                  return ref.target;
                })
                .filter(isNonNullable);

              return Node.make({
                id: publication.id,
                type: PUBLICATION_NODE_TYPE,
                data: publication,
                properties: {
                  label: snapshot.name || ['object-name.placeholder', { ns: Type.getTypename(Blog.Publication) }],
                  icon: 'ph--books--regular',
                  iconHue: 'amber',
                  role: 'branch',
                  space,
                },
                nodes: posts
                  .map((post) => AppNode.makeObject({ get, db: space.db, object: post }))
                  .filter(isNonNullable),
              });
            }),
          );
        },
        actions: (space) =>
          Effect.succeed([
            Node.makeAction({
              id: 'add-publication',
              data: () => Operation.invoke(BloggerOperation.AddPublication, { target: space.db }),
              properties: {
                label: ['add-object.label', { ns: Type.getTypename(Blog.Publication) }],
                icon: 'ph--plus--regular',
                disposition: 'list-item-primary',
              },
            }),
          ]),
      }),

      // "+ Post" action on each Publication node.
      GraphBuilder.createExtension({
        id: 'publicationActions',
        match: NodeMatcher.whenNodeType(PUBLICATION_NODE_TYPE),
        actions: (node) => {
          if (!Obj.instanceOf(Blog.Publication, node.data)) {
            return Effect.succeed([]);
          }

          const publication = node.data;
          const db = Obj.getDatabase(publication);
          if (!db) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            Node.makeAction({
              id: 'add-post',
              data: () =>
                Operation.invoke(BloggerOperation.AddPost, { publication: Ref.make(publication), target: db }),
              properties: {
                label: ['add-object.label', { ns: Type.getTypename(Blog.Post) }],
                icon: 'ph--plus--regular',
                disposition: 'list-item-primary',
              },
            }),
            Node.makeAction({
              id: SpaceOperation.RemoveObjects.meta.key,
              data: () => Operation.invoke(SpaceOperation.RemoveObjects, { objects: [publication] }),
              properties: {
                label: AppNode.getDynamicLabel('delete-object.label', Type.getTypename(Blog.Publication)),
                icon: 'ph--trash--regular',
                disposition: 'list-item',
                testId: 'bloggerPlugin.deletePublication',
              },
            }),
          ]);
        },
      }),

      // Comments companion for the Post plank: anchors the comments panel to the currently-selected
      // draft's `Markdown.Document`. PostArticle publishes that doc as the plank's single-selection
      // (LayoutOperation.Select with contextId == the Post plank node id); this connector reads it back
      // and contributes a companion whose data is the doc. The doc (not the Post) is where draft comments
      // are anchored, so the panel and the in-editor comment creation stay in sync.
      GraphBuilder.createExtension({
        id: 'postComments',
        match: (node) =>
          Obj.instanceOf(Blog.Post, node.data) ? Option.some({ post: node.data, nodeId: node.id }) : Option.none(),
        connector: ({ post, nodeId }, get) => {
          const snapshot = get(Obj.atom(post));
          const drafts = (snapshot.drafts ?? [])
            .map((ref) => {
              // Subscribe so the connector re-runs once the draft target loads.
              get(Obj.atom(ref));
              return ref.target;
            })
            .filter(isNonNullable);
          if (drafts.length === 0) {
            return Effect.succeed([]);
          }

          const selection = get(selectedId(nodeId));
          const selectedDraft = selection
            ? drafts.find((draft) => {
                // Subscribe so the connector re-runs once the doc target loads.
                get(Obj.atom(draft.content));
                const doc = draft.content.target;
                return doc ? Obj.getURI(doc) === selection : false;
              })
            : undefined;
          // Default to the last draft's doc so the companion always has a target.
          const draft = selectedDraft ?? drafts[drafts.length - 1];
          get(Obj.atom(draft.content));
          const draftDoc = draft.content.target;
          if (!draftDoc) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            AppNode.makeCompanion({
              id: linkedSegment('comments'),
              label: ['comments.label', { ns: meta.profile.key }],
              icon: 'ph--chat-text--regular',
              data: draftDoc,
              position: Position.first,
            }),
          ]);
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
