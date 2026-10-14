//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';

/**
 * Set on a type whose objects can be archived.
 */
export const ArchivableAnnotation = Annotation.make({
  id: 'org.dxos.annotation.archivable',
  schema: Schema.Boolean,
});

/**
 * Set on an object (with `Annotation.set`) to mark it archived.
 */
export const ArchivedAnnotation = Annotation.make({
  id: 'org.dxos.annotation.archived',
  schema: Schema.Boolean,
});

export const isArchivable = (object: Obj.Unknown): boolean => {
  const type = Obj.getType(object);
  return type !== undefined && Option.getOrElse(ArchivableAnnotation.get(Type.getSchema(type)), () => false);
};

export const isArchived = (object: Obj.Unknown): boolean =>
  Option.getOrElse(Annotation.get(object, ArchivedAnnotation), () => false);
