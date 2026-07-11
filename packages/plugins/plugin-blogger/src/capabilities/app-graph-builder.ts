//
// Copyright 2026 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppSpace } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Filter, Obj, Ref, Type } from '@dxos/echo';
import { ClientCapabilities } from '@dxos/plugin-client';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { isNonNullable } from '@dxos/util';

import { meta } from '#meta';
import { BloggerOperation } from '#operations';
import { Blogger } from '#types';

/** Stable id of the top-level "Publications" branch node. */
const PUBLICATIONS_ID = 'blogger-publications';

/** Node type of the top-level "Publications" branch node. */
const PUBLICATIONS_NODE_TYPE = `${meta.profile.key}/publications`;

/**
 * Node type of a Publication node under the Publications root. A custom type (rather than the ECHO
 * typename) scopes the posts connector to these nodes, so it never bleeds onto Publication objects
 * that also appear under a space's Database section.
 */
const PUBLICATION_NODE_TYPE = `${meta.profile.key}/publication`;

/**
 * Sources the Publication objects surfaced under the global Publications root. Isolated here as the
 * single seam so it can later be widened from the personal space to all spaces without touching the
 * graph-builder shape.
 */
const getPublications = (
  client: Parameters<typeof AppSpace.getPersonalSpace>[0],
  get: Atom.Context,
): Blogger.Publication[] => {
  const space = AppSpace.getPersonalSpace(client);
  if (!space) {
    return [];
  }

  return get(space.db.query(Filter.type(Blogger.Publication)).atom);
};

/** Builds a branch node for a single Publication; children (Posts) are attached by the posts connector. */
const makePublicationNode = (
  publication: Blogger.Publication,
  get: Atom.Context,
): Node.NodeArg<Blogger.Publication> => {
  const snapshot = get(Obj.atom(publication));
  return Node.make({
    id: publication.id,
    type: PUBLICATION_NODE_TYPE,
    data: publication,
    properties: {
      label: snapshot.name || ['object-name.placeholder', { ns: Type.getTypename(Blogger.Publication) }],
      icon: 'ph--books--regular',
      iconHue: 'amber',
      role: 'branch',
      selectable: true,
    },
  });
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const extensions = yield* Effect.all([
      // Global top-level "Publications" branch node with its Publication children inline.
      GraphBuilder.createExtension({
        id: `${meta.profile.key}/root`,
        match: NodeMatcher.whenRoot,
        connector: (_node, get) => {
          // Tolerate the Client capability's absence during teardown (e.g. story plugin-manager swaps).
          const [client] = capabilities.getAll(ClientCapabilities.Client);
          if (!client) {
            return Effect.succeed([]);
          }

          const publications = getPublications(client, get);
          return Effect.succeed([
            Node.make({
              id: PUBLICATIONS_ID,
              type: PUBLICATIONS_NODE_TYPE,
              properties: {
                label: ['publications.label', { ns: meta.profile.key }],
                icon: 'ph--pen-nib--regular',
                iconHue: 'amber',
                role: 'branch',
                position: 500,
                testId: 'bloggerPlugin.publications',
              },
              nodes: publications.map((publication) => makePublicationNode(publication, get)),
            }),
          ]);
        },
      }),

      // "+ Publication" action on the Publications root; files the new publication in the personal space.
      GraphBuilder.createExtension({
        id: `${meta.profile.key}/root-actions`,
        match: NodeMatcher.whenNodeType(PUBLICATIONS_NODE_TYPE),
        actions: () => {
          const [client] = capabilities.getAll(ClientCapabilities.Client);
          const space = client ? AppSpace.getPersonalSpace(client) : undefined;
          if (!space) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            Node.makeAction({
              id: 'add-publication',
              data: () => Operation.invoke(BloggerOperation.AddPublication, { target: space.db }),
              properties: {
                label: ['add-object.label', { ns: Type.getTypename(Blogger.Publication) }],
                icon: 'ph--plus--regular',
                disposition: 'list-item-primary',
              },
            }),
          ]);
        },
      }),

      // Post children of each Publication node, plus a "+ Post" action.
      GraphBuilder.createExtension({
        id: `${meta.profile.key}/posts`,
        match: NodeMatcher.whenNodeType(PUBLICATION_NODE_TYPE),
        connector: (node, get) => {
          if (!Obj.instanceOf(Blogger.Publication, node.data)) {
            return Effect.succeed([]);
          }

          const publication = node.data;
          const db = Obj.getDatabase(publication);
          if (!db) {
            return Effect.succeed([]);
          }

          const snapshot = get(Obj.atom(publication));
          const posts = (snapshot.posts ?? [])
            .map((ref) => {
              // Subscribe to the ref so the connector re-runs once the target loads.
              get(Obj.atom(ref));
              return ref.target;
            })
            .filter(isNonNullable);

          return Effect.succeed(
            posts.map((post) => AppNode.makeObject({ get, db, object: post })).filter(isNonNullable),
          );
        },
        actions: (node) => {
          if (!Obj.instanceOf(Blogger.Publication, node.data)) {
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
                label: ['add-object.label', { ns: Type.getTypename(Blogger.Post) }],
                icon: 'ph--plus--regular',
                disposition: 'list-item-primary',
              },
            }),
          ]);
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
