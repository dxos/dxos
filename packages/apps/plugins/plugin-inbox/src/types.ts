//
// Copyright 2023 DXOS.org
//

import { Inbox as InboxType } from '@braneframe/types';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { isTypedObject } from '@dxos/react-client/echo';

import { INBOX_PLUGIN } from './meta';

const INBOX_ACTION = `${INBOX_PLUGIN}/action`;
export enum InboxAction {
  CREATE = `${INBOX_ACTION}/create`,
}

export type InboxPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides;

export const isInbox = (data: unknown): data is InboxType => {
  return isTypedObject(data) && InboxType.schema.typename === data.__typename;
};
