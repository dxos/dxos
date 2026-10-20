//
// Copyright 2026 DXOS.org
//

import { EID, type Ref, Relation } from '@dxos/echo';

/** Entity id of a ref or a relation endpoint; space-qualified and local URIs may name the same object. */
export const entityId = (uri: string): string => {
  const eid = EID.tryParse(uri);
  return (eid && EID.getEntityId(eid)) ?? uri;
};

export const refId = (ref: Ref.Ref<unknown>): string => entityId(ref.uri);

/** `[source, target]` entity ids of a relation. */
export const endpoints = (relation: Relation.Unknown): readonly [string, string] => [
  entityId(Relation.getSourceURI(relation)),
  entityId(Relation.getTargetURI(relation)),
];
