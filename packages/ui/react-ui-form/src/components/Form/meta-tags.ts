//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Ref, Tag } from '@dxos/echo';
import { SchemaAST } from '@dxos/effect';
import { EID } from '@dxos/keys';

import { omitId } from '../../util/index.ts';

/**
 * Form-field key for the synthetic meta-tags array spliced into property/create forms.
 *
 * An object's tags live in `Obj.getMeta(obj).tags` (off-schema), so the form surfaces them as an
 * extra field rather than reading the schema. The key is underscore-prefixed so it never collides
 * with a `tags` field an object schema declares itself — e.g. a `TagIndex` record on a feed host,
 * whose `tags` is `Record<tagId, objectId[]>`, not an array. Extending such a schema with a `tags`
 * array threw "overlapping types at path: [\"tags\"]"; the disjoint `_tags` key avoids it. The
 * human-facing label is restored via the `title` annotation on {@link withMetaTags}.
 */
export const META_TAGS_KEY = '_tags';

/**
 * Splices the synthetic meta-tags array (an object's `meta.tags`, surfaced as {@link Tag} refs) onto
 * a schema for editing and drops `id`. Keyed by {@link META_TAGS_KEY} so it never collides with a
 * `tags` field the schema declares itself.
 */
export const withMetaTags = (schema: Schema.Codec<any, any>) =>
  omitId(
    // `SchemaAST.assignFields`, not v4's `Schema.fieldsAssign`: the latter needs both sides' fields
    // at the type level, which a schema known only as a `Codec` cannot supply.
    Schema.make<Schema.Codec<any, any>>(
      SchemaAST.assignFields(
        Schema.Struct({
          [META_TAGS_KEY]: Schema.Array(Ref.Ref(Tag.Tag)).pipe(Schema.annotate({ title: 'Tags' }), Schema.optional),
        }).ast,
        schema.ast,
      ),
    ),
  );

const isTag = Obj.instanceOf(Tag.Tag);

/**
 * Narrows a tag picker's candidates to the tags a user may apply by hand: those with no origin.
 *
 * A tag that carries an origin is owned by whoever put it there — a Gmail label or a JMAP folder is
 * sync's to apply, and a canonical DXOS tag (`starred`, `sent`, `draft`) is applied by a purpose-built
 * affordance such as the star button or the draft lifecycle. Offering either in a generic picker
 * invites an attribution that nothing maintains: on a synced object the next delta silently strips it,
 * and on an unsynced one it never gets corrected at all. See `Tag.md` §"Tag origin".
 *
 * Non-tag candidates pass through untouched, so this is safe to apply to any ref field's results —
 * hence generic in the element type rather than narrowed to `Entity.Any`, which concrete instances are
 * deliberately not assignable to.
 */
export const filterTagCandidates = <T>(results: readonly T[]): T[] =>
  results.filter((result) => !isTag(result) || Tag.isUserTag(result));

/**
 * A ref's target entity id, ignoring whether the uri is local (`echo:/<id>`) or qualified
 * (`echo://<space>/<id>`) — `Ref.make` produces the former while `Obj.getURI` produces the latter, so
 * the two forms must compare equal. Same reason as `findRefOption`.
 */
const entityIdOf = (uri: string): string | undefined => {
  const parsed = EID.tryParse(uri);
  return parsed ? EID.getEntityId(parsed) : undefined;
};

/**
 * Splits an object's meta tags into the ones a form may edit and the ones a provider owns.
 *
 * Provider-owned tags are held back rather than shown read-only: the tags field is a generic array of
 * refs whose delete affordance knows nothing about tags, so the only way to make one non-removable
 * would be to thread tag-specific policy through a type-agnostic renderer. Holding them out of the
 * form value instead keeps them off the picker *and* out of reach of the delete button, and matches
 * where they are already surfaced — as chips on the object's own views.
 *
 * The caller must write `preserved` back alongside whatever the form returns: `meta.tags` is replaced
 * wholesale on save, so omitting them would delete the object's provider tags on the first edit.
 *
 * `candidates` is the space's tag set (each tag's origin lives on the tag, not on the ref); non-tag
 * entries are ignored, so a caller may pass a broader query result.
 */
export const partitionMetaTags = (
  refs: readonly Ref.Ref<Tag.Tag>[],
  candidates: readonly unknown[],
): { editable: Ref.Ref<Tag.Tag>[]; preserved: Ref.Ref<Tag.Tag>[] } => {
  const providerIds = new Set<string>();
  for (const candidate of candidates) {
    if (isTag(candidate) && Tag.isProviderTag(candidate)) {
      const id = entityIdOf(Obj.getURI(candidate).toString());
      if (id !== undefined) {
        providerIds.add(id);
      }
    }
  }

  const editable: Ref.Ref<Tag.Tag>[] = [];
  const preserved: Ref.Ref<Tag.Tag>[] = [];
  for (const ref of refs) {
    const id = entityIdOf(ref.uri);
    (id !== undefined && providerIds.has(id) ? preserved : editable).push(ref);
  }

  return { editable, preserved };
};
