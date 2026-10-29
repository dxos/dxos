//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Annotation from './Annotation.ts';
import * as JsonSchema from './JsonSchema.ts';
import * as Migration from './Migration.ts';
import * as Type from './Type.ts';

const Document = Type.makeObject(DXN.make('com.example.type.document', '0.1.0'))(
  Schema.Struct({
    format: Schema.String.pipe(
      Annotation.ContentVersionAnnotation.set({ fields: ['content', 'title'] }),
      Schema.optional,
    ),
    content: Schema.Record(Schema.String, Schema.Any),
    title: Schema.String.pipe(Schema.optional),
  }),
);

const Plain = Type.makeObject(DXN.make('com.example.type.plain', '0.1.0'))(
  Schema.Struct({ content: Schema.Record(Schema.String, Schema.Any) }),
);

const v1ToV2 = Migration.defineContent({
  type: Document,
  from: 'example.com/doc/1',
  to: 'example.com/doc/2',
  since: '0.1.0',
  transform: ({ content, title }) => ({ content, title: String(title).toUpperCase() }),
});

const v2ToV3 = Migration.defineContent({
  type: Document,
  from: 'example.com/doc/2',
  to: 'example.com/doc/3',
  since: '0.2.0',
  transform: ({ content, title }) => ({ content: { ...Object(content), added: true }, title }),
});

describe('Migration', () => {
  describe('defineContent', () => {
    test('reads the version field and record fields from the annotation', ({ expect }) => {
      expect(Migration.isMigration(v1ToV2)).toBe(true);
      expect(Migration.isContentMigration(v1ToV2)).toBe(true);
      expect(v1ToV2.kind).toBe('content');
      expect(v1ToV2.type).toBe(DXN.make('com.example.type.document', '0.1.0'));
      expect(v1ToV2.versionField).toBe('format');
      expect(v1ToV2.fields).toEqual(['content', 'title']);
      expect(v1ToV2.recordFields).toEqual(['content']);
    });

    test('rejects a type without a ContentVersionAnnotation', ({ expect }) => {
      expect(() =>
        Migration.defineContent({
          type: Plain,
          from: 'a/1',
          to: 'a/2',
          since: '0.1.0',
          transform: (content) => content,
        }),
      ).toThrow(/ContentVersionAnnotation/);
    });

    test('rejects a step that does not change the version', ({ expect }) => {
      expect(() =>
        Migration.defineContent({ type: Document, from: 'a/1', to: 'a/1', since: '0.1.0', transform: (c) => c }),
      ).toThrow(/Invalid content versions/);
    });

    test('the annotation survives JSON schema serialization', ({ expect }) => {
      const jsonSchema = JsonSchema.toJsonSchema(Type.getSchema(Document));
      expect(JSON.stringify(jsonSchema)).toContain('org.dxos.annotation.contentVersion');
    });
  });

  describe('upgradeContent', () => {
    test('applies the chain in order from any version on it', ({ expect }) => {
      const migrations = [v2ToV3, v1ToV2];
      expect(Migration.upgradeContent(migrations, Document, 'example.com/doc/1', { content: {}, title: 'a' })).toEqual({
        version: 'example.com/doc/3',
        content: { content: { added: true }, title: 'A' },
      });
      expect(Migration.upgradeContent(migrations, Document, 'example.com/doc/2', { content: {}, title: 'a' })).toEqual({
        version: 'example.com/doc/3',
        content: { content: { added: true }, title: 'a' },
      });
    });

    test('returns content at an unknown or current version unchanged', ({ expect }) => {
      const content = { content: {} };
      for (const version of ['example.com/doc/3', 'other.com/1', undefined]) {
        const result = Migration.upgradeContent([v1ToV2, v2ToV3], Document, version, content);
        expect(result.content).toBe(content);
        expect(result.version).toBe(version);
      }
    });

    test('ignores steps of other types', ({ expect }) => {
      const content = { content: {} };
      const result = Migration.upgradeContent(
        [v1ToV2],
        DXN.make('com.example.type.other', '0.1.0'),
        'example.com/doc/1',
        content,
      );
      expect(result.content).toBe(content);
    });

    test('rejects two steps from the same version', ({ expect }) => {
      const fork = Migration.defineContent({
        type: Document,
        from: 'example.com/doc/1',
        to: 'example.com/doc/9',
        since: '0.1.0',
        transform: (content) => content,
      });
      expect(() => Migration.upgradeContent([v1ToV2, fork], Document, 'example.com/doc/1', {})).toThrow(/Ambiguous/);
    });

    test('rejects a loop', ({ expect }) => {
      const back = Migration.defineContent({
        type: Document,
        from: 'example.com/doc/2',
        to: 'example.com/doc/1',
        since: '0.1.0',
        transform: (content) => content,
      });
      expect(() => Migration.upgradeContent([v1ToV2, back], Document, 'example.com/doc/1', {})).toThrow(/loop/);
    });
  });
});
