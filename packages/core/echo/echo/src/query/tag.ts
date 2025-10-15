//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { LabelAnnotation } from '../internal';
import * as Obj from '../Obj';
import * as Type from '../Type';

export const Tag = Schema.Struct({
  label: Schema.String,
  hue: Schema.optional(Schema.String), // TODO(burdon): Color name?
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Tag',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['label']),
);
export type Tag = Schema.Schema.Type<typeof Tag>;

export const make = (props: Obj.MakeProps<typeof Tag>) => Obj.make(Tag, props);

export type TagMap = Record<string, Tag>;

export const sortTags = ({ label: a }: Tag, { label: b }: Tag) => a.localeCompare(b);

export const createTagList = (tags: TagMap): Tag[] =>
  Object.entries(tags)
    .map(([id, tag]) => ({ ...tag, id }))
    .sort(sortTags);

export const findTagByLabel = (tags: TagMap | undefined, name: string): Tag | undefined => {
  const entry = Object.entries(tags ?? {}).find(([_, tag]) => tag.label.toLowerCase() === name.toLowerCase());
  return entry ? { ...entry[1], id: entry[0] } : undefined;
};
