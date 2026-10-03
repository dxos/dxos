//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCaps from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { Database, Entity, Obj, Ref, Type, View } from '@dxos/echo';
import { EID } from '@dxos/keys';
import * as SettingsPath from '@dxos/plugin-settings/SettingsPath';
import { ViewAnnotation, getTypeURIFromQuery } from '@dxos/schema';
import * as Position from '@dxos/util/Position';

import { meta } from '#meta';

import { resolveCollectionObjectPath, resolveTypeSectionPath } from '../util/index.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const resolver: AppCaps.NavigationTargetResolver = (query) =>
      Effect.gen(function* () {
        if (!query?.uri) {
          return [
            {
              path: SettingsPath.getPluginSettingsSectionPath(meta.profile.key),
              label: 'Spaces settings',
              type: 'settings',
            },
          ];
        }

        const eid = EID.tryParse(query.uri);
        if (!eid) {
          return [];
        }

        const { db } = yield* Database.Service;
        const ref = db.makeRef(eid);
        const object = yield* Database.load(ref).pipe(Effect.catch(() => Effect.succeed(null)));
        if (!object) {
          return [];
        }

        const typename = Entity.getTypename(object);
        const typeUri = Entity.getTypeURI(object);
        if (!typename || !typeUri) {
          return [];
        }

        const label = Entity.getLabel(object) ?? '';

        // Where the tree actually shows the object: its place in the collection tree, or the sidebar
        // section its type declares (Chat, Project, …). Both precede the database path, which every
        // object has but no visible node bears — hence `Position.last`.
        const collectionPath = yield* resolveCollectionObjectPath({ objectId: object.id });
        const sectionPath = resolveTypeSectionPath(capabilities, {
          spaceId: db.spaceId,
          typename,
          objectId: object.id,
        });

        // A view (a table, say) is in no collection: the tree shows it under the type it views.
        const viewTypeUri = yield* resolveViewTargetTypeUri(object);
        const viewPath = viewTypeUri
          ? GraphPath.getObjectPath(db.spaceId, GraphPath.getTypeSlugFromUri(viewTypeUri), object.id)
          : undefined;

        // A type is itself a node in the Database section, keyed by its slug.
        const typePath = Type.isType(object)
          ? GraphPath.getTypePath(db.spaceId, GraphPath.getTypeSlug(object))
          : undefined;

        return [
          ...(typePath ? [{ path: typePath, label, type: typename }] : []),
          ...(collectionPath ? [{ path: collectionPath, label, type: typename }] : []),
          ...(sectionPath ? [{ path: sectionPath, label, type: typename }] : []),
          ...(viewPath ? [{ path: viewPath, label, type: typename }] : []),
          {
            // Type nodes are keyed by slug, which for a stored schema is its entity id, not its typename.
            path: GraphPath.getObjectPath(db.spaceId, GraphPath.getTypeSlugFromUri(typeUri), object.id),
            label,
            type: typename,
            position: Position.last,
          },
        ];
      });

    return Capability.contribute(AppCapabilities.NavigationTargetResolver, resolver);
  }),
);

/**
 * The URI of the type an object views, when its type declares a view (`ViewAnnotation`) and the object
 * holds one; the same walk the Database section makes to list views under their type.
 */
const resolveViewTargetTypeUri = (object: Entity.Unknown) =>
  Effect.gen(function* () {
    const type = Obj.isObject(object) ? Obj.getType(object) : undefined;
    const path = type ? Option.getOrUndefined(ViewAnnotation.get(Type.getSchema(type))) : undefined;
    if (!path?.length) {
      return undefined;
    }
    let holder: unknown = object;
    for (const segment of path) {
      holder = holder != null && typeof holder === 'object' ? Reflect.get(holder, segment) : undefined;
      if (Ref.isRef(holder)) {
        holder = yield* Database.load(holder).pipe(Effect.catch(() => Effect.succeed(undefined)));
      }
    }
    return Obj.instanceOf(View.View, holder) ? getTypeURIFromQuery(holder.query.ast) : undefined;
  });
