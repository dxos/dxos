//
// Copyright 2023 DXOS.org
//

import { GraphProvides } from '@braneframe/plugin-graph';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { Thread as ThreadType } from '@braneframe/types';
import { isTypedObject } from '@dxos/react-client/echo';

export const THREAD_PLUGIN = 'dxos.org/plugin/thread';

export type ThreadPluginProvides = GraphProvides & TranslationsProvides;

export interface ThreadModel {
  root: ThreadType;
}

export const isThread = (datum: unknown): datum is ThreadType => {
  return isTypedObject(datum) && ThreadType.type.name === datum.__typename;
};
