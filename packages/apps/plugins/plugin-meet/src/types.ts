//
// Copyright 2023 DXOS.org
//

import { type SchemaProvides } from '@braneframe/plugin-client';
import type { StackProvides } from '@braneframe/plugin-stack';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { create, S, TypedObject } from '@dxos/echo-schema';

import { MEET_PLUGIN } from './meta';

const MEET_ACTION = `${MEET_PLUGIN}/action`;

export enum MeetAction {
  CREATE = `${MEET_ACTION}/create`,
}

export type MeetPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides &
  StackProvides;

// TODO(burdon): Index to all updates when rows/columns are inserted/deleted.
export class MeetingRoomType extends TypedObject({ typename: 'dxos.org/type/MeetingRoom', version: '0.1.0' })({
  name: S.optional(S.String),
}) {}

export const createMeetingRoom = (name?: string): MeetingRoomType => create(MeetingRoomType, { name });
