//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { type SchemaProvides } from '@dxos/plugin-client';

import { INBOX_PLUGIN } from '../meta';

const INBOX_ACTION = `${INBOX_PLUGIN}/action`;
export enum InboxAction {
  CREATE_MAILBOX = `${INBOX_ACTION}/create-mailbox`,
  CREATE_CONTACTS = `${INBOX_ACTION}/create-contacts`,
  CREATE_CALENDAR = `${INBOX_ACTION}/create-calendar`,
}

export type InboxPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides;
