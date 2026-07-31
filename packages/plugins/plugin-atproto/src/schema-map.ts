//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import { Type } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { type AtprotoPolicy, AtprotoPolicyAnnotation, type AtprotoRecord, AtprotoRecordAnnotation } from '@dxos/schema';

export type MappedType = {
  type: Type.AnyObj;
  record: AtprotoRecord;
  policy?: AtprotoPolicy;
};

/**
 * Build a map of lexicon collection NSID → the registered ECHO type that maps to it, by scanning the
 * space's schema registry for types carrying an {@link AtprotoRecordAnnotation}. Only types whose
 * plugin is active (and thus registered) appear — this is how the PDS browser distinguishes
 * collections it can map from plain ones.
 */
export const getMappedCollections = (space: Space): Map<string, MappedType> => {
  const map = new Map<string, MappedType>();
  for (const type of space.db.graph.registry.list().filter(Type.isType)) {
    if (!Type.isObject(type)) {
      continue;
    }
    const record = Option.getOrUndefined(AtprotoRecordAnnotation.get(Type.getSchema(type)));
    if (record) {
      const policy = Option.getOrUndefined(AtprotoPolicyAnnotation.get(Type.getSchema(type)));
      map.set(record.collection, { type, record, policy });
    }
  }
  return map;
};
