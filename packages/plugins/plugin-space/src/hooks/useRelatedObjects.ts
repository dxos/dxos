//
// Copyright 2023 DXOS.org
//

import { useMemo } from 'react';

import { type Database, Entity, Filter, Obj, Ref, Relation } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { isNonNullable } from '@dxos/util';

// TODO(burdon): Factor out (make more generally useful -- e.g., in cards).
// TODO(wittjosiah): This is a hack. ECHO needs to have a back reference index to easily query for related objects.
export const useRelatedObjects = (
  db?: Database.Database,
  record?: Obj.Unknown,
  options: { references?: boolean; relations?: boolean } = {},
) => {
  const objects = useQuery(db, Filter.everything());
  return useMemo(() => {
    if (!record) {
      return [];
    }

    const related: Entity.Unknown[] = [];

    // TODO(burdon): Change Person => Organization to relations.
    if (options.references) {
      const getReferences = (obj: Entity.Unknown): Ref.Unknown[] => {
        return Object.getOwnPropertyNames(obj)
          .map((name) => obj[name as keyof Obj.Unknown])
          .filter((value) => Ref.isRef(value)) as Ref.Unknown[];
      };

      const references = getReferences(record);
      const referenceTargets = references.map((ref) => ref.target).filter(isNonNullable);
      const referenceSources = objects.filter((obj) => {
        const refs = getReferences(obj);
        return refs.some((ref) => ref.target === record);
      });

      related.push(...referenceTargets, ...referenceSources);
    }

    if (options.relations) {
      // TODO(dmaretskyi): Workaround until https://github.com/dxos/dxos/pull/10100 lands.
      const isValidRelation = (obj: Relation.Unknown) => {
        try {
          return Relation.isRelation(obj) && Relation.getSource(obj) && Relation.getTarget(obj);
        } catch {
          return false;
        }
      };

      const relations = objects.filter(Relation.isRelation).filter((obj) => isValidRelation(obj));
      const targetObjects = relations
        .filter((relation) => Relation.getTarget(relation) === record)
        .map((relation) => Relation.getSource(relation));
      const sourceObjects = relations
        .filter((relation) => Relation.getSource(relation) === record)
        .map((relation) => Relation.getTarget(relation));

      related.push(...targetObjects, ...sourceObjects);
    }

    return (
      Array.from(new Set(related))
        // TODO(burdon): Hack to filter out chat objects.
        .filter((obj) => Entity.getTypename(obj) !== 'org.dxos.type.assistant.chat')
    );
  }, [record, objects, options.references, options.relations]);
};
