//
// Copyright 2023 DXOS.org
//

import { Calendar as CalendarType } from '@braneframe/types';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { isTypedObject } from '@dxos/react-client/echo';

import { EVENTS_PLUGIN } from './meta';

const EVENTS_ACTION = `${EVENTS_PLUGIN}/action`;
export enum ContactsAction {
  CREATE = `${EVENTS_ACTION}/create`,
}

export type ContactsPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides;

export const isObject = (data: unknown): data is CalendarType => {
  return isTypedObject(data) && CalendarType.schema.typename === data.__typename;
};
