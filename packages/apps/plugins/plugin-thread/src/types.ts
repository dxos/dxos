//
// Copyright 2023 DXOS.org
//

import { GraphProvides } from '@braneframe/plugin-graph';
import { IntentProvides } from '@braneframe/plugin-intent';
import { TranslationsProvides } from '@braneframe/plugin-theme';
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
  return isTypedObject(data) && ThreadType.type.name === data.__typename;
};
