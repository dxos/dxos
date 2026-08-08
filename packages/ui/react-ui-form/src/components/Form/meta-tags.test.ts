//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Obj, Ref, Tag } from '@dxos/echo';
import { SchemaAST, SchemaEx } from '@dxos/effect';

import { META_TAGS_KEY, withMetaTags } from './meta-tags';

// A feed-host schema whose own `tags` field is a `TagIndex` record (tagId -> objectId[]), not an
// array — mirrors plugin-commerce `Search`, plugin-inbox `Mailbox`, plugin-magazine `Subscription`.
const TagIndexHost = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  tags: Schema.Record(Schema.String, Schema.Array(Obj.ID)).pipe(Schema.optional),
});

const propertyNames = (schema: Schema.Codec<any, any>): string[] =>
  SchemaAST.getPropertySignatures(schema.ast).map((property) => property.name.toString());

describe('withMetaTags', () => {
  test('keying meta-tags as `tags` clobbers a schema-declared `tags` record (regression)', ({ expect }) => {
    // The pre-fix shape: splice a `tags: Array<Ref<Tag>>` onto a schema that already declares `tags`.
    // Effect 3's `Schema.extend` refused ("overlapping types at path: [\"tags\"]"); v4 dropped it and
    // the later declaration silently wins, so the collision shows up as a replaced type instead.
    const collided = Schema.make<Schema.Top>(
      SchemaAST.assignFields(
        TagIndexHost.ast,
        Schema.Struct({ tags: Schema.Array(Ref.Ref(Tag.Tag)).pipe(Schema.optional) }).ast,
      ),
    );
    const tags = SchemaAST.getPropertySignatures(collided.ast).find((property) => property.name === 'tags');
    expect(SchemaEx.unwrapOptional(tags!.type)._tag).toBe('Arrays');
    // ...while the record the host declared survives when the synthetic field is keyed apart.
    const tagsProperty = SchemaAST.getPropertySignatures(withMetaTags(TagIndexHost).ast).find(
      (property) => property.name === 'tags',
    );
    expect(SchemaEx.unwrapOptional(tagsProperty!.type)._tag).toBe('Objects');
  });

  test('splices meta-tags under `_tags` without colliding with a schema-declared `tags`', ({ expect }) => {
    const schema = withMetaTags(TagIndexHost);
    const names = propertyNames(schema);
    expect(names).toContain(META_TAGS_KEY);
    expect(names).toContain('tags');
    expect(names).not.toContain('id');
  });

  test('still splices meta-tags onto a schema with no `tags` field', ({ expect }) => {
    const Plain = Schema.Struct({ name: Schema.String });
    const names = propertyNames(withMetaTags(Plain));
    expect(names).toContain(META_TAGS_KEY);
    expect(names).toContain('name');
  });
});
