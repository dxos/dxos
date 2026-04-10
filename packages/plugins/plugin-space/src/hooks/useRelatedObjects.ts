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
  subject?: Obj.Unknown,
  options: {
    references?: boolean;
    relations?: boolean;
  } = {},
) => {
  const objects = useQuery(db, Filter.everything());
  return useMemo(() => {
    if (!subject) {
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

      const references = getReferences(subject);
      const referenceTargets = references.map((ref) => ref.target).filter(isNonNullable);
      const referenceSources = objects.filter((obj) => {
        const refs = getReferences(obj);
        return refs.some((ref) => ref.target === subject);
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
        .filter((relation) => Relation.getTarget(relation) === subject)
        .map((relation) => Relation.getSource(relation));
      const sourceObjects = relations
        .filter((relation) => Relation.getSource(relation) === subject)
        .map((relation) => Relation.getTarget(relation));

      related.push(...targetObjects, ...sourceObjects);
    }

    return (
      Array.from(new Set(related))
        .filter((obj) => {
          console.log('obj', obj.id, subject.id);
          return true;
        })
        .filter((obj) => obj.id !== subject.id)
        // TODO(burdon): Hack to filter out chat objects.
        .filter((obj) => Entity.getTypename(obj) !== 'orgsubjecttype.assistant.chat')
    );
  }, [subject, objects, options.references, options.relations]);
};
