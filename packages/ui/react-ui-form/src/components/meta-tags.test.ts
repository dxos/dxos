//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Obj, Ref, Tag } from '@dxos/echo';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import * as SchemaEx from '@dxos/effect/SchemaEx';
import { EID, URI } from '@dxos/keys';

import { Organization } from '../testing/schema.ts';
import { META_TAGS_KEY, filterTagCandidates, partitionMetaTags, resolveMetaTags, withMetaTags } from './meta-tags.ts';

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

  test('holds provider tags back and leaves the rest editable', ({ expect }) => {
    const { editable, preserved } = partitionMetaTags([userTag, gmailTag, canonicalTag]);

    // Canonical tags stay editable — only a foreign provider owns membership.
    expect(editable).toEqual([userTag, canonicalTag]);
    expect(preserved).toEqual([gmailTag]);
  });

  test('a save that writes back only `editable` would drop the provider tag (why `preserved` exists)', ({ expect }) => {
    const tags = [userTag, gmailTag];
    const { editable, preserved } = partitionMetaTags(tags);

    // What a naive handler would persist, versus the correct merge.
    expect(editable.length).toBe(1);
    expect([...preserved, ...editable]).toEqual([gmailTag, userTag]);
  });

  test('no tags is a no-op', ({ expect }) => {
    expect(partitionMetaTags([])).toEqual({ editable: [], preserved: [] });
  });
});

describe('resolveMetaTags', () => {
  test('resolves a picker ref built from a bare URI through the database', ({ expect }) => {
    const tag = Tag.make({ label: 'Reading' });
    const db = { getObjectById: (id: string) => (id === tag.id ? tag : undefined) };
    // The ref picker selects by id, so its refs have no target of their own to read.
    const picked = Ref.fromURI(URI.make(EID.make({ entityId: tag.id })));
    expect(resolveMetaTags([picked], db)).toEqual([tag]);
    expect(resolveMetaTags([picked], undefined)).toEqual([]);
  });

  test('keeps a held tag the database lookup misses (deleted or from another space)', ({ expect }) => {
    const tag = Tag.make({ label: 'Archived' });
    const db = { getObjectById: () => undefined };
    const picked = Ref.fromURI(URI.make(EID.make({ entityId: tag.id })));
    expect(resolveMetaTags([picked], db, [tag])).toEqual([tag]);
  });
});
