//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { GraphBuilder } from '@dxos/app-graph';
import { DXN, Type } from '@dxos/echo';

import * as GraphPath from '../app/GraphPath';
import * as TypeSection from './TypeSection';

class Book extends Type.makeObject<Book>(DXN.make('org.dxos.type.testbook', '0.1.0'))(
  Schema.Struct({ title: Schema.String.pipe(Schema.optional) }),
) {}

const TYPENAME = Type.getTypename(Book)!;
const WORKSPACE_BASE = 'root/SPACE1';

/** The section node's qualified id, as the graph nests it under the content group. */
const SECTION_NODE_ID = `${WORKSPACE_BASE}/${GraphPath.GroupSegments.content}/${TYPENAME}`;

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
      .map((extension) => extension.url)
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
      expect(GraphBuilder.nodeUrlSegment(SECTION_NODE_ID, bindingsByKey().book)).toBeUndefined();
    });
  });

  describe('with sectionUrlKey', () => {
    test('registers the section as a singleton alongside the object key', ({ expect }) => {
      const bindings = bindingsByKey('library');
      expect(Object.keys(bindings).sort()).toEqual(['book', 'library']);
      expect(bindings.library.kind).toBe('singleton');
      expect(bindings.book).toMatchObject({
        kind: 'item',
        path: [GraphPath.GroupSegments.content, TYPENAME],
      });
    });

    test('resolves /library forward to the section node', ({ expect }) => {
      const { path } = bindingsByKey('library').library;
      expect(typeof path).toBe('function');
      const resolved = Effect.runSync(
        (path as Extract<typeof path, Function>)({
          id: 'library',
          workspace: 'SPACE1',
          workspaceBaseId: WORKSPACE_BASE,
        }),
      );
      expect(resolved).toBe(SECTION_NODE_ID);
    });

    test('stamps /library on the section node and /book/<id> on its objects', ({ expect }) => {
      const bindings = bindingsByKey('library');
      expect(GraphBuilder.nodeUrlSegment(SECTION_NODE_ID, bindings.library)).toBe('/library');
      expect(GraphBuilder.nodeUrlSegment(`${SECTION_NODE_ID}/book1`, bindings.book)).toBe('/book/book1');
    });

    test('keeps object paths identical to the unsplit form', ({ expect }) => {
      // Objects stay at root/<space>/content/<typename>/<id>, so existing links keep resolving.
      expect(bindingsByKey('library').book).toEqual(bindingsByKey().book);
    });
  });
});
