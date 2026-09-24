//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import type { ForeignKey } from '@dxos/echo-protocol';

import type * as Database from './Database.ts';
import * as Filter from './Filter.ts';
import * as internal from './internal/index.ts';
import * as Obj from './Obj.ts';
import * as Type from './Type.ts';

export class Tag extends Type.makeObject<Tag>(internal.TagTypeDXN)(
  Schema.Struct({
    label: Schema.String,
    hue: Schema.optional(Schema.String), // TODO(burdon): Color name?
  }).pipe(internal.LabelAnnotation.set(['label']), internal.HiddenAnnotation.set(true)),
) {}

export const make = (props: Obj.MakeProps<typeof Tag>) => Obj.make(Tag, props);

export type Map = Record<string, Type.InstanceType<typeof Tag>>;

/**
 * Origin domain for DXOS's own canonical tags — provider-agnostic identities (starred, sent, …) that
 * each provider maps its own vocabulary onto, so a Gmail star, a JMAP `$flagged` keyword and a
 * locally-toggled star all resolve to the same {@link Tag}.
 */
export const CANONICAL_ORIGIN = 'org.dxos.tag';

/**
 * The tag's origin domain, or `undefined` when the user created it. Says who owns the tag and
 * therefore who may change it — see `Tag.md` §"Tag origin":
 *
 * - `undefined` — a user tag: rename, recolour, apply and remove are all the user's to do.
 * - {@link CANONICAL_ORIGIN} — a canonical DXOS tag: applied and removed locally, but its label and
 *   hue are fixed (a provider may be mapping its own vocabulary onto it).
 * - anything else — a foreign provider domain (e.g. `com.google.gmail`): read-only, since sync owns
 *   both the tag and which objects carry it.
 *
 * Read from the tag's first foreign key, which is where {@link findOrCreate} records it; a tag never
 * carries more than one origin. Requires a live entity or snapshot — a spread copy (e.g. from
 * {@link createTagList}) has no metadata and throws rather than reporting a false `undefined`.
 */
export const getOrigin = (tag: Type.InstanceType<typeof Tag> | Obj.Snapshot<Type.InstanceType<typeof Tag>>) =>
  Obj.getMeta(tag).keys[0]?.source;

/** Whether the user created this tag (and so may edit and apply it freely). See {@link getOrigin}. */
export const isUserTag = (tag: Type.InstanceType<typeof Tag> | Obj.Snapshot<Type.InstanceType<typeof Tag>>) =>
  getOrigin(tag) === undefined;

/**
 * Whether a foreign provider owns this tag, making it read-only in the app: it cannot be renamed,
 * recoloured, or attached to / detached from an object by hand. Canonical DXOS tags are **not**
 * provider tags — they stay locally toggleable. See {@link getOrigin}.
 */
export const isProviderTag = (tag: Type.InstanceType<typeof Tag> | Obj.Snapshot<Type.InstanceType<typeof Tag>>) => {
  const origin = getOrigin(tag);
  return origin !== undefined && origin !== CANONICAL_ORIGIN;
};

export const sortTags = ({ label: a }: Type.InstanceType<typeof Tag>, { label: b }: Type.InstanceType<typeof Tag>) =>
  a.localeCompare(b);

export const createTagList = (tags: Map): Type.InstanceType<typeof Tag>[] =>
  Object.entries(tags)
    .map(([id, tag]) => ({ ...tag, id }))
    .sort(sortTags);

export const findTagByLabel = (tags: Map | undefined, name: string): Type.InstanceType<typeof Tag> | undefined => {
  const entry = Object.entries(tags ?? {}).find(([_, tag]) => tag.label.toLowerCase() === name.toLowerCase());
  return entry ? { ...entry[1], id: entry[0] } : undefined;
};

/**
 * Finds a tag by a superseded key and rewrites that key to `key`, so the tag keeps its identity (and
 * every reference to it) across a key-source rename. Returns `undefined` when none match.
 */
const adoptLegacyKey = async (
  db: Pick<Database.Database, 'query' | 'add'>,
  key: ForeignKey,
  legacyKeys: readonly ForeignKey[] | undefined,
): Promise<Type.InstanceType<typeof Tag> | undefined> => {
  if (!legacyKeys?.length) {
    return undefined;
  }

  const [existing] = await db.query(Filter.foreignKeys(Tag, [...legacyKeys])).run();
  if (!existing) {
    return undefined;
  }

  Obj.update(existing, (existing) => {
    const keys = Obj.getMeta(existing).keys;
    const index = keys.findIndex((candidate) =>
      legacyKeys.some((legacy) => legacy.source === candidate.source && legacy.id === candidate.id),
    );
    if (index >= 0) {
      keys.splice(index, 1, key);
    }
  });

  return existing;
};

/**
 * Finds or creates a {@link Tag} object in the database.
 *
 * - With a foreign `key` (system/provider tags): matched by that key; the label is kept current on
 *   re-sync. Use a stable key (e.g. `{ source: 'google.com/gmail/label', id }`) for tags whose
 *   identity is external or well-known.
 * - Without a key (user tags): matched by case-insensitive label among tags that carry **no**
 *   foreign key, so it never collides with a keyed system/provider tag of the same label.
 *
 * `legacyKeys` lets a caller rename its key source without orphaning existing tags: when the primary
 * key misses, they are tried in order and the first match is rewritten to `key` in place. Without it
 * a rename silently creates a parallel tag on the next sync, while objects keep pointing at the old
 * one. Drop the legacy key once the rename has shipped.
 */
export const findOrCreate = async (
  db: Pick<Database.Database, 'query' | 'add'>,
  options: { label: string; hue?: string; key?: ForeignKey; legacyKeys?: readonly ForeignKey[] },
): Promise<Type.InstanceType<typeof Tag>> => {
  const { label, hue, key, legacyKeys } = options;
  const withHue = hue ? { hue } : {};
  if (key) {
    const [matched] = await db.query(Filter.foreignKeys(Tag, [key])).run();
    const existing = matched ?? (await adoptLegacyKey(db, key, legacyKeys));
    if (existing) {
      // Keep label (and hue, when provided) current on re-sync. `hue` is only touched when supplied,
      // so a label-only re-sync (e.g. Gmail) doesn't wipe a user-set colour.
      if (existing.label !== label || (hue !== undefined && existing.hue !== hue)) {
        Obj.update(existing, (existing) => {
          existing.label = label;
          if (hue !== undefined) {
            existing.hue = hue;
          }
        });
      }
      return existing;
    }

    return db.add(Obj.make(Tag, { [Obj.Meta]: { keys: [key] }, label, ...withHue }));
  }

  const lowered = label.toLowerCase();
  const candidates = await db.query(Filter.type(Tag)).run();
  const existing = candidates.find(
    (tag) => tag.label.toLowerCase() === lowered && (Obj.getMeta(tag).keys ?? []).length === 0,
  );
  return existing ?? db.add(make({ label, ...withHue }));
};
