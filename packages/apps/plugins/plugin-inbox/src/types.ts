//
// Copyright 2023 DXOS.org
//

import { type SchemaProvides } from '@braneframe/plugin-client';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';

import { INBOX_PLUGIN } from './meta';

const INBOX_ACTION = `${INBOX_PLUGIN}/action`;
export enum InboxAction {
  CREATE_MAILBOX = `${INBOX_ACTION}/create-mailbox`,
  CREATE_ADDRESSBOOK = `${INBOX_ACTION}/create-addressbook`,
  CREATE_CALENDAR = `${INBOX_ACTION}/create-calendar`,
}

export type InboxPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides;
