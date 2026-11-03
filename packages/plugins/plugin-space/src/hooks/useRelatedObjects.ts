//
// Copyright 2023 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import * as TypeOptions from '@dxos/app-toolkit/TypeOptions';
import { type Database, type Entity, Filter, Obj, Query, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { isNonNullable } from '@dxos/util';

const getReferences = (obj: Entity.Unknown | Entity.Snapshot): Ref.Unknown[] =>
  Object.getOwnPropertyNames(obj)
    .map((name) => Reflect.get(obj, name))
    .filter(Ref.isRef);

/**
 * Returns objects related to `subject` via direct references and/or relations.
 * Returns an empty array when `subject` is undefined.
 *
 * Withholds only objects whose types are not user-facing, which the user cannot address at all; narrowing
 * the rest belongs to the consumer (see `useRelatedTypeFilter`).
 */
// TODO(burdon): Factor out (make more generally useful -- e.g., in cards).
export const useRelatedObjects = (
  db?: Database.Database,
  subject?: Obj.Unknown,
  options: {
    references?: boolean;
    relations?: boolean;
  } = {},
) => {
  // One union of traversals anchored on the subject, so the hook never watches every object in the space.
  const subjectId = subject?.id;
  const query = useMemo(() => {
    const anchor = subjectId ? Query.select(Filter.id(subjectId)) : undefined;
    const traversals = [
      ...(anchor && options.references ? [anchor.referencedBy()] : []),
      ...(anchor && options.relations ? [anchor.sourceOf().target(), anchor.targetOf().source()] : []),
    ];
    return traversals.length > 0 ? Query.all(...traversals) : Query.select(Filter.nothing());
  }, [subjectId, options.references, options.relations]);
  const linked = useQuery(db, query);
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
      related.push(...references.map((ref) => ref.target).filter(isNonNullable));
    }
    related.push(...linked);

    return (
      Array.from(new Set(related))
        // A relation may name the subject at both ends, which would otherwise relate it to itself.
        .filter((obj) => obj !== subject)
        .filter((obj) => !Obj.isObject(obj) || TypeOptions.isUserObject(obj))
    );
  }, [subject, references, linked, options.references]);
};
