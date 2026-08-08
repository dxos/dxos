//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Ref, Tag } from '@dxos/echo';

import { omitId } from '../../util';

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
export const withMetaTags = (schema: Schema.Schema.AnyNoContext) =>
  omitId(
    Schema.Struct({
      [META_TAGS_KEY]: Schema.Array(Ref.Ref(Tag.Tag)).pipe(Schema.annotations({ title: 'Tags' }), Schema.optional),
    }).pipe(Schema.extend(schema)),
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
