//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import { describe, test } from 'vitest';

import { Obj, Ref, Tag } from '@dxos/echo';

import { Organization } from '../../testing/schema';
import { META_TAGS_KEY, filterTagCandidates, withMetaTags } from './meta-tags';

// A feed-host schema whose own `tags` field is a `TagIndex` record (tagId -> objectId[]), not an
// array — mirrors plugin-commerce `Search`, plugin-inbox `Mailbox`, plugin-magazine `Subscription`.
const TagIndexHost = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  tags: Schema.Record({ key: Schema.String, value: Schema.Array(Obj.ID) }).pipe(Schema.optional),
});

const propertyNames = (schema: Schema.Schema.AnyNoContext): string[] =>
  SchemaAST.getPropertySignatures(schema.ast).map((property) => property.name.toString());

describe('withMetaTags', () => {
  test('keying meta-tags as `tags` collides with a schema-declared `tags` record (regression)', ({ expect }) => {
    // The pre-fix shape: splice a `tags: Array<Ref<Tag>>` onto a schema that already declares `tags`.
    // `Schema.extend` cannot merge an array with a record at the same key, hence the companion crash:
    // "overlapping types at path: [\"tags\"]".
    expect(() =>
      Schema.Struct({ tags: Schema.Array(Ref.Ref(Tag.Tag)).pipe(Schema.optional) }).pipe(Schema.extend(TagIndexHost)),
    ).toThrow(/tags/i);
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

describe('filterTagCandidates', () => {
  const userTag = Tag.make({ label: 'Reading' });
  const canonicalTag = Obj.make(Tag.Tag, {
    [Obj.Meta]: { keys: [{ source: Tag.CANONICAL_ORIGIN, id: 'starred' }] },
    label: 'Starred',
  });
  const gmailTag = Obj.make(Tag.Tag, {
    [Obj.Meta]: { keys: [{ source: 'com.google.gmail', id: 'Label_1' }] },
    label: 'Work',
  });

  test('offers user tags and drops every tag with an origin', ({ expect }) => {
    expect(filterTagCandidates([userTag, canonicalTag, gmailTag])).toEqual([userTag]);
  });

  test('passes non-tag candidates through untouched', ({ expect }) => {
    const other = Obj.make(Organization, { name: 'Untouched' });
    expect(filterTagCandidates([other, gmailTag, userTag])).toEqual([other, userTag]);
  });

  test('is a no-op on an empty candidate list', ({ expect }) => {
    expect(filterTagCandidates([])).toEqual([]);
  });
});
