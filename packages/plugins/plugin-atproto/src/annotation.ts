//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { Obj, Type } from '@dxos/echo';
import { AtprotoPublishAnnotation, type AtprotoRecord, AtprotoRecordAnnotation } from '@dxos/schema';

/** Read the atproto record annotation off an object's type, if any. */
export const getRecordAnnotation = (object: Obj.Unknown): AtprotoRecord | undefined => {
  const type = Obj.getType(object);
  if (!type) {
    return undefined;
  }
  return Option.getOrUndefined(AtprotoRecordAnnotation.get(Type.getSchema(type)));
};

export type FieldPublishFlag = {
  name: string;
  /** Whether the field is marked public (crosses the publishing boundary). */
  published: boolean;
};

/** Enumerate a schema's fields with their publish (public/private) flag. */
export const getFieldPublishFlags = (schema: Schema.Schema.AnyNoContext): FieldPublishFlag[] =>
  SchemaAST.getPropertySignatures(schema.ast).map((property) => ({
    name: String(property.name),
    published: Option.getOrElse(AtprotoPublishAnnotation.getFromAst(property.type), () => false),
  }));
