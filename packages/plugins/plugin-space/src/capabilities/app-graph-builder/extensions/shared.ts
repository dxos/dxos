//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Option from 'effect/Option';

import { AppNode } from '@dxos/app-toolkit';
import { type Space, SpaceState, isSpace } from '@dxos/client/echo';
import { type Operation } from '@dxos/compute';
import { Annotation, Filter, Obj, Type } from '@dxos/echo';
import { MigrationVersionAnnotation, Migrations } from '@dxos/migrations';
import { type Node } from '@dxos/plugin-graph';
import { type TreeData } from '@dxos/react-ui-list';
import type { EchoViewRefPath } from '@dxos/schema';
import { ViewAnnotation, getTypeURIFromQuery } from '@dxos/schema';
import { type Label } from '@dxos/ui-types/translations';

import { meta } from '#meta';

export const {
  ACCEPT_ECHO_CLASS,
  CACHEABLE_PROPS,
  CAN_DROP_OBJECT,
  blockInstructionCache,
  buildCollectionPartials,
  collectionPartialsCache,
  createFactory,
  getAcceptPersistenceKey,
  getCollectionGraphNodePartials,
  getDynamicLabel,
  rearrangeCache,
} = AppNode;

//
// Virtual Node Types
//

export const TYPES_SECTION_TYPE = `${meta.id}.types`;
export const COLLECTIONS_SECTION_TYPE = `${meta.id}.collections`;
export const TYPE_COLLECTION_TYPE = `${meta.id}.type-collection`;
export const STATIC_SCHEMA_TYPE = `${meta.id}.static-schema`;

//
// Constants
//

/** Shared translation namespace descriptor. */
export const META_NS: { ns: string } = { ns: meta.id };

//
// Stable Callbacks
//

export const BLOCK_REORDER_ABOVE = (_source: TreeData, instruction: any) => instruction.type === 'reorder-above';
export const CAN_DROP_SPACE = (source: TreeData) => Obj.isObject(source.item.data) || isSpace(source.item.data);

//
// Caches (space-specific, not moved to app-toolkit)
//

export const spaceActionsCache = new Map<
  string,
  {
    state: SpaceState;
    hasPendingMigration: boolean;
    migrating: boolean;
    actions: Node.NodeArg<Node.ActionData<Operation.Service>>[];
  }
>();
export const spaceRearrangeCache = new Map<string, (nextOrder: Space[]) => void>();

//
// Static Labels
//

export const ADD_VIEW_TO_SCHEMA_LABEL: Label = ['add-view-to-schema.label', META_NS];
export const COPY_LINK_LABEL: Label = ['copy-link.label', META_NS];
export const CREATE_OBJECT_IN_COLLECTION_LABEL: Label = ['create-object-in-collection.label', META_NS];
export const CREATE_OBJECT_IN_SPACE_LABEL: Label = ['create-object-in-space.label', META_NS];
export const EXPOSE_OBJECT_LABEL: Label = ['expose-object.label', META_NS];
export const MIGRATE_SPACE_LABEL: Label = ['migrate-space.label', META_NS];
export const NEW_TYPE_LABEL: Label = ['new-type.label', META_NS];
export const REMOVE_FROM_COLLECTION_LABEL: Label = ['remove-from-collection.label', META_NS];
export const RENAME_SPACE_LABEL: Label = ['rename-space.label', META_NS];
export const SETTINGS_PANEL_LABEL: Label = ['settings-panel.label', META_NS];
export const SNAPSHOT_BY_SCHEMA_LABEL: Label = ['snapshot-by-schema.label', META_NS];

//
// Helpers
//

export const checkPendingMigration = (space: Space) => {
  return (
    space.state.get() === SpaceState.SPACE_REQUIRES_MIGRATION ||
    (space.state.get() === SpaceState.SPACE_READY &&
      !!Migrations.targetVersion &&
      Annotation.get(space.properties, MigrationVersionAnnotation).pipe(Option.getOrUndefined) !==
        Migrations.targetVersion)
  );
};

export const downloadBlob = async (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();

  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

//
// View Index
//

/**
 * Index of view objects grouped by their target type URI.
 */
export type ViewIndex = {
  /** Type URIs that have at least one straightforward view targeting them. */
  typeUrisWithViews: Set<string>;
  /** View objects targeting a specific type URI. */
  getViewsForTypeUri: (typeUri: string) => Obj.Any[];
  /** True when the schema has `ViewAnnotation` and that path resolves non-null on `object`; false otherwise (no annotation, or null/undefined path — e.g. Kanban with unset `view`). */
  isView: (object: Obj.Any) => boolean;
};

/**
 * Builds an index of view objects by scanning view-annotated schemas and resolving the target
 * type URI from each view's query AST. Only straightforward views whose query resolves to a
 * type URI via getTypeURIFromQuery are included.
 */
// TODO(wittjosiah): Make reactive to schema registry changes (currently only object/view mutations trigger updates).
export const buildViewIndex = (get: Atom.Context, space: Space, schemas: Type.AnyEntity[]): ViewIndex => {
  const viewSchemas = schemas.filter((schema) => ViewAnnotation.has(schema));

  const viewsByTypeUri = new Map<string, Obj.Any[]>();
  // Object IDs whose `ViewAnnotation` path resolves to a non-null value.
  // Used by `isView` to distinguish view instances from regular instances of
  // the same schema (e.g. items-variant Kanban vs view-variant Kanban).
  const viewObjectIds = new Set<string>();

  if (viewSchemas.length > 0) {
    const filter = Filter.or(...viewSchemas.map((schema) => Filter.type(schema)));
    const viewObjects = get(space.db.query(filter).atom);

    for (const viewObject of viewObjects) {
      if (!Obj.isObject(viewObject)) {
        continue;
      }
      const holderType = Obj.getType(viewObject);
      const path = holderType
        ? ViewAnnotation.get(Type.getSchema(holderType)).pipe(Option.getOrElse(() => [] as EchoViewRefPath))
        : ([] as EchoViewRefPath);

      if (path.length === 0) {
        continue;
      }

      const viewSnapshot = get(Obj.atom(viewObject));
      let holder: unknown = viewSnapshot;
      for (const segment of path) {
        holder =
          holder == null || typeof holder !== 'object' ? undefined : (holder as Record<string, unknown>)[segment];
      }
      // Path resolved to a non-null value → this instance is a "view". Path
      // resolved to null/undefined → it's a regular object that happens to
      // be of a view-annotated schema.
      if (holder != null) {
        viewObjectIds.add(viewObject.id);
      }

      const viewTarget = holder != null ? get(Obj.atom(holder as Obj.Any)) : undefined;
      const typeUri = getTypeURIFromQuery(viewTarget?.query?.ast);
      if (typeUri) {
        const existing = viewsByTypeUri.get(typeUri) ?? [];
        existing.push(viewObject);
        viewsByTypeUri.set(typeUri, existing);
      }
    }
  }

  return {
    typeUrisWithViews: new Set(viewsByTypeUri.keys()),
    getViewsForTypeUri: (typeUri) => viewsByTypeUri.get(typeUri) ?? [],
    isView: (object) => viewObjectIds.has(object.id),
  };
};
