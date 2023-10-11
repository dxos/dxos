//
// Copyright 2023 DXOS.org
//

import type { GraphProvides } from '@braneframe/plugin-graph';
import type { IntentProvides } from '@braneframe/plugin-intent';
import type { TranslationsProvides } from '@braneframe/plugin-theme';
import { Thread as ThreadType } from '@braneframe/types';
import { isTypedObject } from '@dxos/react-client/echo';

export const THREAD_PLUGIN = 'dxos.org/plugin/thread';

const THREAD_ACTION = `${THREAD_PLUGIN}/action`;
export enum ThreadAction {
  CREATE = `${THREAD_ACTION}/create`,
}

export type ThreadPluginProvides = GraphProvides & IntentProvides & TranslationsProvides;

export interface ThreadModel {
  root: ThreadType;
}

export const isThread = (data: unknown): data is ThreadType => {
  return isTypedObject(data) && ThreadType.schema.typename === data.__typename;
};
