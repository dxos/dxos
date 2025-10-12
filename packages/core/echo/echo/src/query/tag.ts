//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

export const TagInfo = Schema.Struct({
  label: Schema.String,
  hue: Schema.optional(Schema.String), // TODO(burdon): Color name?
});

export type TagInfo = Schema.Schema.Type<typeof TagInfo>;

export const Tag = Schema.extend(
  TagInfo,
  Schema.Struct({
    id: Schema.String,
  }),
);

export type Tag = Schema.Schema.Type<typeof Tag>;

export type TagMap = Record<string, TagInfo>;

export const sortTags = ({ label: a }: TagInfo, { label: b }: TagInfo) => a.localeCompare(b);

export const createTagList = (tags: TagMap): Tag[] =>
  Object.entries(tags)
    .map(([id, tag]) => ({ ...tag, id }))
    .sort(sortTags);

export const findTagByLabel = (tags: Record<string, TagInfo> | undefined, name: string): Tag | undefined => {
  const entry = Object.entries(tags ?? {}).find(([_, tag]) => tag.label.toLowerCase() === name.toLowerCase());
  return entry ? { ...entry[1], id: entry[0] } : undefined;
};
