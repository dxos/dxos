//
// Copyright 2023 DXOS.org
//

import { Thread as ThreadType } from '@braneframe/types';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { isTypedObject } from '@dxos/react-client/echo';

export const THREAD_PLUGIN = 'dxos.org/plugin/thread';

const THREAD_ACTION = `${THREAD_PLUGIN}/action`;
export enum ThreadAction {
  CREATE = `${THREAD_ACTION}/create`,
}

export type ThreadPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides;

export interface ThreadModel {
  root: ThreadType;
}

export const isThread = (data: unknown): data is ThreadType => {
  return isTypedObject(data) && ThreadType.schema.typename === data.__typename;
};
