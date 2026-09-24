//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import { Database, Entity, Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { DXN, EID, type SpaceId } from '@dxos/keys';
import { type Position } from '@dxos/util';

import { type AppCapabilities } from '../app-framework/index.ts';

export type ForTypeOptions<S extends Type.AnyObj> = {
  /** Where the plugin's section shows the object — the resolved target's `path`. */
  getPath: (target: { spaceId: SpaceId; objectId: string }) => string;
  /** Target label; defaults to the object's entity label. */
  getLabel?: (object: Type.InstanceType<S>) => string;
  /**
   * Sort order among the targets resolved for one query — e.g. `Position.first` when the section is
   * the type's home and outranks the generic collection/database answers.
   */
  position?: Position.Position;
  /** Targets answered for a query-less call (the navigable-pages listing), e.g. a settings section. */
  pages?: readonly AppCapabilities.NavigationTarget[];
};

/**
 * The common custom-section resolver: load the queried object and, when it is an instance of the
 * given type, answer with the path the plugin's section shows it under.
 *
 * Sections built with `TypeSection.createTypeSectionExtension` never need a resolver — their url
 * binding ends in the typename, which is all plugin-space's generic section lookup needs. This is
 * for sections with a shape of their own (a virtual grouping node, a section id where the typename
 * would be), whose objects the generic resolvers can only place in the database subtree.
 */
export const forType = <S extends Type.AnyObj>(
  type: S,
  options: ForTypeOptions<S>,
): AppCapabilities.NavigationTargetResolver => {
  const typename = Type.getTypename(type);
  invariant(typename, 'Schema must have a typename to resolve navigation targets.');
  return (query) =>
    Effect.gen(function* () {
      if (!query?.uri) {
        return [...(options.pages ?? [])];
      }

      const targetUri = EID.tryParse(query.uri) ?? DXN.tryMake(query.uri);
      if (!targetUri) {
        return [];
      }

      const { db } = yield* Database.Service;
      const ref = db.makeRef(targetUri);
      const object = yield* Database.load(ref).pipe(Effect.catch(() => Effect.succeed(null)));
      if (!object || !Obj.instanceOf(type, object)) {
        return [];
      }

      return [
        {
          path: options.getPath({ spaceId: db.spaceId, objectId: object.id }),
          label: options.getLabel ? options.getLabel(object) : (Entity.getLabel(object) ?? ''),
          type: typename,
          ...(options.position !== undefined ? { position: options.position } : {}),
        },
      ];
    });
};
