//
// Copyright 2023 DXOS.org
//

import type {
  IntentData,
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import {Space} from '@dxos/react-client/echo'
import { type SchemaProvides } from '@dxos/plugin-space';
import { KanbanType } from '@dxos/react-ui-kanban';

import { KANBAN_PLUGIN } from './meta';

/**
 * Kanban data model.
 * A Kanban board is a collection of columns, each of which contains a collection of items.
 * The layout of columns and items is controlled by models.
 * The underlying data model may be represented by direct object relationships
 * (e.g., a column object containing an array of ordered items) or projections constructed
 * by the model (e.g., a query of items based on metadata within a column object).
 */

const KANBAN_ACTION = `${KANBAN_PLUGIN}/action`;

export enum KanbanAction {
  CREATE = `${KANBAN_ACTION}/create`,
  DELETE_CARD_FIELD = `${KANBAN_ACTION}/delete-card-field`,
}

export namespace KanbanAction {
  export type Create = IntentData<{ space: Space }>;
  export type DeleteColumn = IntentData<{ kanban: KanbanType; fieldId: string }>;
}


export type KanbanPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides;

// TODO(burdon): Undo?
// TODO(burdon): Typescript types (replace proto with annotations?)
// TODO(burdon): Should pure components depend on ECHO? Relationship between ECHO object/array and Observable.
// TODO(burdon): Can the plugin configure the object based on the data? E.g., how are the models constructed?
// TODO(burdon): Create models. Simple first based on actual data.
//  Model is always a projection since the dragging state is tentative.

// TODO(burdon): Extend model for moving items (in and across columns).
export interface KanbanModel {
  root: KanbanType;
}

export type Location = {
  idx?: number;
};

export const isKanban = (object: unknown): object is KanbanType => object != null && object instanceof KanbanType;

