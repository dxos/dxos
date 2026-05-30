//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import type { ForeignKey } from '@dxos/echo-protocol';
import { DXN } from '@dxos/keys';

import type * as Database from './Database';
import * as Filter from './Filter';
import * as internal from './internal';
import * as Obj from './Obj';
import * as Type from './Type';

export const Tag = Schema.Struct({
  label: Schema.String,
  hue: Schema.optional(Schema.String), // TODO(burdon): Color name?
}).pipe(
  internal.LabelAnnotation.set(['label']),
  internal.SystemTypeAnnotation.set(true),
  Type.makeObject(DXN.make('org.dxos.type.tag', '0.1.0')),
);

export type Tag = Type.InstanceType<typeof Tag>;

export const make = (props: Obj.MakeProps<typeof Tag>) => Obj.make(Tag, props);

export type Map = Record<string, Tag>;

export const sortTags = ({ label: a }: Tag, { label: b }: Tag) => a.localeCompare(b);

export const createTagList = (tags: Map): Tag[] =>
  Object.entries(tags)
    .map(([id, tag]) => ({ ...tag, id }))
    .sort(sortTags);

export const findTagByLabel = (tags: Map | undefined, name: string): Tag | undefined => {
  const entry = Object.entries(tags ?? {}).find(([_, tag]) => tag.label.toLowerCase() === name.toLowerCase());
  return entry ? { ...entry[1], id: entry[0] } : undefined;
};

/**
 * Finds or creates a {@link Tag} object in the database.
 *
 * - With a foreign `key` (system/provider tags): matched by that key; the label is kept current on
 *   re-sync. Use a stable key (e.g. `{ source: 'google.com/gmail/label', id }`) for tags whose
 *   identity is external or well-known.
 * - Without a key (user tags): matched by case-insensitive label among tags that carry **no**
 *   foreign key, so it never collides with a keyed system/provider tag of the same label.
 */
export const findOrCreate = async (
  db: Pick<Database.Database, 'query' | 'add'>,
  options: { label: string; hue?: string; key?: ForeignKey },
): Promise<Tag> => {
  const { label, hue, key } = options;
  const withHue = hue ? { hue } : {};
  if (key) {
    const [existing] = await db.query(Filter.foreignKeys(Tag, [key])).run();
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
