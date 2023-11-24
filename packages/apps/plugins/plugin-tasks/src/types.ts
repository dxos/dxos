//
// Copyright 2023 DXOS.org
//

import type { StackProvides } from '@braneframe/plugin-stack';
import { Task as TaskType } from '@braneframe/types';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  TranslationsProvides,
  SurfaceProvides,
  MetadataRecordsProvides,
} from '@dxos/app-framework';
import { isTypedObject, type TypedObject } from '@dxos/react-client/echo';

import { TASKS_PLUGIN } from './meta';

const TEMPLATE_ACTION = `${TASKS_PLUGIN}/action`;

export enum TasksAction {
  CREATE = `${TEMPLATE_ACTION}/create`,
}

export type TasksPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  StackProvides;

export const isObject = (object: unknown): object is TypedObject => {
  return isTypedObject(object) && TaskType.schema.typename === object.__typename;
};
