//
// Copyright 2025 DXOS.org
//

import { default as ContextAdd } from './context-add';
import { default as ContextRemove } from './context-remove';
import { default as Load } from './load';
import { default as ObjectCreate } from './object-create';
import { default as ObjectDelete } from './object-delete';
import { default as ObjectUpdate } from './object-update';
import { default as Query } from './query';
import { default as RelationCreate } from './relation-create';
import { default as RelationDelete } from './relation-delete';
import { default as SchemaAdd } from './schema-add';
import { default as SchemaList } from './schema-list';
import { default as TagAdd } from './tag-add';
import { default as TagRemove } from './tag-remove';

export const AssistantFunctions = {
  ContextAdd,
  ContextRemove,
  Load,
  ObjectCreate,
  ObjectDelete,
  ObjectUpdate,
  Query,
  RelationCreate,
  RelationDelete,
  SchemaAdd,
  SchemaList,
  TagAdd,
  TagRemove,
};
