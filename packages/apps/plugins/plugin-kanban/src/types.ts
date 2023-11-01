//
// Copyright 2023 DXOS.org
//

import { Kanban as KanbanType } from '@braneframe/types';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { isTypedObject } from '@dxos/react-client/echo';

/**
 * Kanban data model.
 * A Kanban board is a collection of columns, each of which contains a collection of items.
 * The layout of columns and items is controlled by models.
 * The underlying data model may be represented by direct object relationships
 * (e.g., a column object containing an array of ordered items) or projections constructed
 * by the model (e.g., a query of items based on metadata within a column object).
 */

// TODO(burdon): Make id consistent with other plugins.
export const KANBAN_PLUGIN = 'dxos.org/plugin/kanban';

const KANBAN_ACTION = `${KANBAN_PLUGIN}/action`;

export enum KanbanAction {
  CREATE = `${KANBAN_ACTION}/create`,
}

export type KanbanPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides;

// TODO(burdon): Undo?
// TODO(burdon): Typescript types (replace proto with annotations?)
// TODO(burdon): Should pure components depend on ECHO? Relationship between ECHO object/array and Observable.
// TODO(burdon): Can the plugin configure the object based on the data? E.g., how are the models constructed?
// TODO(burdon): Create models. Simple first based on actual data.
//  Model is always a projection since the dragging state is tentative.

// TODO(burdon): Extend model for moving items (in and across columns).
export interface KanbanModel {
  root: KanbanType;
  createColumn(): KanbanType.Column;
  createItem(column: KanbanType.Column): KanbanType.Item;
}

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[KanbanType.name] = KanbanType;

export const isKanban = (data: unknown): data is KanbanType => {
  return isTypedObject(data) && KanbanType.schema.typename === data.__typename;
};

export type Location = {
  column: KanbanType.Column;
  item?: KanbanType.Item;
  idx?: number;
};
