//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Obj, Ref, Tag } from '@dxos/echo';
import { SchemaAST, SchemaEx } from '@dxos/effect';

import { Organization } from '../../testing/schema.ts';
import { META_TAGS_KEY, filterTagCandidates, partitionMetaTags, withMetaTags } from './meta-tags.ts';

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

describe('partitionMetaTags', () => {
  const userTag = Tag.make({ label: 'Reading' });
  const gmailTag = Obj.make(Tag.Tag, {
    [Obj.Meta]: { keys: [{ source: 'com.google.gmail', id: 'Label_1' }] },
    label: 'Work',
  });
  const canonicalTag = Obj.make(Tag.Tag, {
    [Obj.Meta]: { keys: [{ source: Tag.CANONICAL_ORIGIN, id: 'starred' }] },
    label: 'Starred',
  });
  const spaceTags = [userTag, gmailTag, canonicalTag];

  test('holds provider tags back and leaves the rest editable', ({ expect }) => {
    const refs = [Ref.make(userTag), Ref.make(gmailTag), Ref.make(canonicalTag)];
    const { editable, preserved } = partitionMetaTags(refs, spaceTags);

    // Canonical tags stay editable — only a foreign provider owns membership.
    expect(editable.map((ref) => ref.uri)).toEqual([Ref.make(userTag).uri, Ref.make(canonicalTag).uri]);
    expect(preserved.map((ref) => ref.uri)).toEqual([Ref.make(gmailTag).uri]);
  });

  test('a save that writes back only `editable` would drop the provider tag (why `preserved` exists)', ({ expect }) => {
    const refs = [Ref.make(userTag), Ref.make(gmailTag)];
    const { editable, preserved } = partitionMetaTags(refs, spaceTags);

    // What a naive handler would persist, versus the correct merge.
    expect(editable.length).toBe(1);
    expect([...preserved, ...editable].map((ref) => ref.uri).sort()).toEqual(refs.map((ref) => ref.uri).sort());
  });

  test('an unresolvable tag stays editable rather than being silently held back', ({ expect }) => {
    // A ref whose target is not among the space's tags (not yet replicated): treated as editable, so a
    // missing candidate never makes a user tag un-removable.
    const orphan = Ref.make(Tag.make({ label: 'Elsewhere' }));
    const { editable, preserved } = partitionMetaTags([orphan], spaceTags);
    expect(editable.map((ref) => ref.uri)).toEqual([orphan.uri]);
    expect(preserved).toEqual([]);
  });

  test('no tags is a no-op', ({ expect }) => {
    expect(partitionMetaTags([], spaceTags)).toEqual({ editable: [], preserved: [] });
  });
});
