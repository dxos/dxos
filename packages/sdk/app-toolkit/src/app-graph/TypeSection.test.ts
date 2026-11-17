//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Registry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';
import { describe, expect, onTestFinished, test } from 'vitest';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import { Client } from '@dxos/client';
import { DXN, Obj, Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';

import * as AppCapabilities from '../app-framework/AppCapabilities.ts';
import * as GraphPath from '../app/GraphPath.ts';
import * as TypeSection from './TypeSection.ts';

class Book extends Type.makeObject<Book>(DXN.make('org.dxos.type.testbook', '0.1.0'))(
  Schema.Struct({ title: Schema.String.pipe(Schema.optional) }),
) {}

const TYPENAME = Type.getTypename(Book)!;
const WORKSPACE_BASE = 'root/SPACE1';

/** The section node's qualified id, as the graph nests it under the content group. */
const SECTION_NODE_ID = `${WORKSPACE_BASE}/${GraphPath.GroupSegments.content}/${TYPENAME}`;
const LIBRARY_NODE_ID = `${WORKSPACE_BASE}/${GraphPath.GroupSegments.content}/library`;

const build = (sectionUrlKey?: string) =>
  Effect.runSync(
    TypeSection.createTypeSectionExtension(Book, {
      urlKey: 'book',
      groupSegment: GraphPath.GroupSegments.content,
      ...(sectionUrlKey ? { sectionUrlKey } : {}),
    }),
  );

/** Bindings keyed by the URL key they register, so assertions read by key rather than by array index. */
const bindingsByKey = (sectionUrlKey?: string) =>
  Object.fromEntries(
    build(sectionUrlKey)
      .map((extension) => extension.meta)
      .filter((url): url is NonNullable<typeof url> => url !== undefined)
      .map((url) => [url.key, url]),
  );

describe('createTypeSectionExtension', () => {
  describe('without sectionUrlKey', () => {
    test('registers only the object key, with the section as its container path', ({ expect }) => {
      const bindings = bindingsByKey();
      expect(Object.keys(bindings)).toEqual(['book']);
      expect(bindings.book).toMatchObject({
        kind: 'item',
        path: [GraphPath.GroupSegments.content, TYPENAME],
      });
    });

    test('leaves the section node itself unaddressable', ({ expect }) => {
      // The section sits AT the binding's path, so it has no id of its own under that key.
      expect(AppGraphBuilder.nodeUrlSegment(SECTION_NODE_ID, bindingsByKey().book)).toBeUndefined();
    });
  });

  describe('with sectionUrlKey', () => {
    test('names the section by its key and registers it as a singleton alongside the object key', ({ expect }) => {
      const bindings = bindingsByKey('library');
      expect(Object.keys(bindings).sort()).toEqual(['book', 'library']);
      expect(bindings.library).toMatchObject({ kind: 'singleton', path: [GraphPath.GroupSegments.content] });
      expect(bindings.book).toMatchObject({ kind: 'item', path: [GraphPath.GroupSegments.content, 'library'] });
    });

    test('resolves /library forward to the section node', ({ expect }) => {
      const { library } = bindingsByKey('library');
      expect(Option.getOrUndefined(AppGraphBuilder.urlCandidate(library, 'SPACE1', undefined))).toBe(LIBRARY_NODE_ID);
    });

    test('stamps /library on the section node and /book/<id> on its objects', ({ expect }) => {
      const bindings = bindingsByKey('library');
      expect(AppGraphBuilder.nodeUrlSegment(LIBRARY_NODE_ID, bindings.library)).toBe('/library');
      expect(AppGraphBuilder.nodeUrlSegment(`${LIBRARY_NODE_ID}/book1`, bindings.book)).toBe('/book/book1');
    });
  });

  describe('on a read-only host', () => {
    /** A space holding one book under the graph's root, expanded down to its section and the section's actions. */
    const setup = async (readOnly: boolean) => {
      const client = await new Client({ types: [Book] }).initialize();
      onTestFinished(() => client.destroy());
      await client.halo.createIdentity();
      const space = await client.spaces.create();
      await space.waitUntilReady();
      space.db.add(Obj.make(Book, { title: 'Published' }));
      await space.db.flush({ indexes: true });

      // The plugin manager and the graph builder share one registry, as in the app.
      const registry = Registry.make();
      const manager = CapabilityManager.make({ registry });
      if (readOnly) {
        manager.contribute({ module: 'test', interface: AppCapabilities.ReadOnly, implementation: true });
      }

      const root = await EffectEx.runPromise(
        AppGraphBuilder.createExtension({
          id: 'testSpaces',
          match: GraphNodeMatcher.whenRoot,
          connector: () => Effect.succeed([{ id: space.id, type: 'org.dxos.type.space', data: space, properties: {} }]),
        }),
      );
      const section = await EffectEx.runPromise(
        TypeSection.createTypeSectionExtension(Book, { urlKey: 'book', createObject: () => Effect.void }).pipe(
          Effect.provideService(Capability.Service, manager),
        ),
      );
      const graph = setupGraphBuilder({ registry, extensions: [...root, ...section] });
      const spaceId = GraphNode.qualifyId(GraphNode.RootId, space.id);
      const sectionId = GraphNode.qualifyId(spaceId, TYPENAME);
      await graph.expand(GraphNode.RootId);
      await expect
        .poll(async () => {
          await graph.expand(spaceId);
          return graph.getNode(sectionId);
        })
        .not.toBeNull();
      await graph.expand(sectionId);
      await graph.expand(sectionId, 'action');

      const node = graph.getNode(sectionId)!;
      return {
        node,
        books: graph.getConnections(sectionId),
        actions: graph.registry.get(graph.graph.actions(sectionId)).map((action) => GraphNode.segmentId(action.id)),
      };
    };

    test('lists the objects but offers no create, drop or rearrange', async ({ expect }) => {
      const { node, books, actions } = await setup(true);
      expect(books).toHaveLength(1);
      expect(books[0].properties.draggable).toBe(false);
      expect(actions).toEqual([]);
      expect(node.properties.onRearrange).toBeUndefined();
      expect(node.properties.canDrop({ item: books[0] })).toBe(false);
    });

    test('a writable host keeps create and rearrange', async ({ expect }) => {
      const { node, books, actions } = await setup(false);
      expect(books[0].properties.draggable).toBeUndefined();
      expect(actions).toEqual(['create']);
      expect(node.properties.onRearrange).toBeTypeOf('function');
    });
  });
});
