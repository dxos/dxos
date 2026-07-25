//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import { AppAnnotation } from '@dxos/app-toolkit';
import { Annotation, Collection, Filter, Obj, Ref } from '@dxos/echo';
import { Markdown } from '@dxos/plugin-markdown';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { isNonNullable } from '@dxos/util';

/**
 * Adds objects to the space's root collection so plugin-space builds app-graph nodes for them —
 * making object-scoped graph actions (e.g. the comment toolbar) resolvable and the objects
 * navigable. Creates the root collection if the space has none: stories create their space via the
 * raw client API, which skips the space-plugin create flow that would otherwise set it up.
 */
export const addToRootCollection = (space: Space, objects: Obj.Unknown[]): void => {
  const existing = Annotation.get(space.properties, AppAnnotation.RootCollectionAnnotation).pipe(Option.getOrUndefined);
  let collection = existing?.target;
  if (!collection) {
    const created = space.db.add(Collection.make({ objects: [] }));
    Obj.update(space.properties, (properties) => {
      Annotation.set(properties, AppAnnotation.RootCollectionAnnotation, Ref.make(created));
    });
    collection = created;
  }

  const refs = objects.map((object) => Ref.make(object));
  Obj.update(collection, (collection) => {
    collection.objects = [...collection.objects, ...refs];
  });
};

/**
 * The object every module targets by default: the first document in the space's root collection.
 * Replaces the former bespoke ModuleContext — the current object is now derived from the app-graph's
 * content (the root collection) rather than an invented parallel context. Collection order is stable
 * (insertion order), so this deterministically resolves the primary document.
 */
export const useActiveObject = (space: Space): Obj.Unknown | undefined => {
  const [collection] = useQuery(space.db, Filter.type(Collection.Collection));
  const objects = (collection?.objects ?? []).map((ref) => ref.target).filter(isNonNullable);
  return objects.find((object) => Obj.instanceOf(Markdown.Document, object));
};
