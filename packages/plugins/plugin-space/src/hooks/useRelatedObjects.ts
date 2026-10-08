//
// Copyright 2023 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import * as TypeOptions from '@dxos/app-toolkit/TypeOptions';
import { type Database, Entity, Filter, Obj, Ref, Relation } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { isNonNullable } from '@dxos/util';

const getReferences = (obj: Entity.Unknown | Entity.Snapshot): Ref.Unknown[] =>
  Object.getOwnPropertyNames(obj)
    .map((name) => (obj as unknown as Record<string, unknown>)[name])
    .filter((value) => Ref.isRef(value)) as Ref.Unknown[];

/**
 * Returns objects related to `subject` via direct references and/or relations.
 * Returns an empty array when `subject` is undefined.
 *
 * Withholds only objects whose types are not user-facing, which the user cannot address at all; narrowing
 * the rest belongs to the consumer (see `useRelatedTypeFilter`).
 */
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
  // Only the subject's reference fields, so an edit to any other field does not rescan the space.
  const referencesAtom = useMemo(
    () =>
      Atom.make((get) => (subject ? getReferences(get(Obj.atom(subject))) : [])).pipe(
        Atom.withEquality<Ref.Unknown[]>(Ref.equals),
      ),
    [subject],
  );
  const references = useAtomValue(referencesAtom);
  return useMemo(() => {
    if (!subject) {
      return [];
    }

    const related: Entity.Unknown[] = [];

    // TODO(burdon): Change Person => Organization to relations.
    if (options.references) {
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
        // A relation may name the subject at both ends, which would otherwise relate it to itself.
        .filter((obj) => obj !== subject)
        .filter((obj) => !Obj.isObject(obj) || TypeOptions.isUserObject(obj))
    );
  }, [subject, references, objects, options.references, options.relations]);
};
