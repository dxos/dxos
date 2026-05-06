//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Option from 'effect/Option';

import { type Space, SpaceState, isSpace } from '@dxos/client/echo';
import { type Operation } from '@dxos/compute';
import { Filter, Obj, type Type } from '@dxos/echo';
import { AtomObj, AtomQuery } from '@dxos/echo-atom';
import { Migrations } from '@dxos/migrations';
import { type Node } from '@dxos/plugin-graph';
import { type TreeData } from '@dxos/react-ui-list';
import type { EchoViewRefPath } from '@dxos/schema';
import { ViewAnnotation, getTypenameFromQuery } from '@dxos/schema';
import { type Label } from '@dxos/ui-types/translations';

import { meta } from '#meta';

export {
  type MetadataResolver,
  ACCEPT_ECHO_CLASS,
  CACHEABLE_PROPS,
  CAN_DROP_OBJECT,
  blockInstructionCache,
  buildCollectionPartials,
  collectionPartialsCache,
  createFactory,
  createObjectNode,
  getAcceptPersistenceKey,
  getCollectionGraphNodePartials,
  getDynamicLabel,
  rearrangeCache,
} from '@dxos/app-toolkit';

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
      !!Migrations.versionProperty &&
      space.properties[Migrations.versionProperty] !== Migrations.targetVersion)
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
 * Index of view objects grouped by their target typename.
 */
export type ViewIndex = {
  /** Typenames that have at least one straightforward view targeting them. */
  typenamesWithViews: Set<string>;
  /** View objects targeting a specific typename. */
  getViewsForTypename: (typename: string) => Obj.Any[];
  /** True when the schema has `ViewAnnotation` and that path resolves non-null on `object`; false otherwise (no annotation, or null/undefined path — e.g. Kanban with unset `view`). */
  isView: (object: Obj.Any) => boolean;
};

/**
 * Builds an index of view objects by scanning view-annotated schemas and resolving the target
 * typename from each view's query AST. Only straightforward views whose query resolves to a
 * simple typename via getTypenameFromQuery are included.
 */
// TODO(wittjosiah): Make reactive to schema registry changes (currently only object/view mutations trigger updates).
export const buildViewIndex = (get: Atom.Context, space: Space, schemas: Type.AnyEntity[]): ViewIndex => {
  const viewSchemas = schemas.filter((schema) => ViewAnnotation.has(schema));

  const viewsByTypename = new Map<string, Obj.Any[]>();
  // Object IDs whose `ViewAnnotation` path resolves to a non-null value.
  // Used by `isView` to distinguish view instances from regular instances of
  // the same schema (e.g. items-variant Kanban vs view-variant Kanban).
  const viewObjectIds = new Set<string>();

  if (viewSchemas.length > 0) {
    const filter = Filter.or(...viewSchemas.map((schema) => Filter.type(schema)));
    const viewObjects = get(AtomQuery.make(space.db, filter));

    for (const viewObject of viewObjects) {
      const holderSchema = Obj.getSchema(viewObject);
      const path = holderSchema
        ? ViewAnnotation.get(holderSchema).pipe(Option.getOrElse(() => [] as EchoViewRefPath))
        : ([] as EchoViewRefPath);

      if (path.length === 0) {
        continue;
      }

      const viewSnapshot = get(AtomObj.make(viewObject));
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

      const viewTarget = holder !== undefined ? get(AtomObj.make(holder as Obj.Any)) : undefined;
      const typename = getTypenameFromQuery(viewTarget?.query?.ast);
      if (typename) {
        const existing = viewsByTypename.get(typename) ?? [];
        existing.push(viewObject);
        viewsByTypename.set(typename, existing);
      }
    }
  }

  return {
    typenamesWithViews: new Set(viewsByTypename.keys()),
    getViewsForTypename: (typename) => viewsByTypename.get(typename) ?? [],
    isView: (object) => viewObjectIds.has(object.id),
  };
};
