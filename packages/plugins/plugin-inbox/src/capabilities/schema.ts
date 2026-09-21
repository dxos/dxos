//
// Copyright 2024 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as Project from '@dxos/compute/Project';
import { AccessToken, Cursor } from '@dxos/link';
import { TagIndex } from '@dxos/schema';
import { Event, Message } from '@dxos/types';

import { Calendar, ExtractedFrom, Mailbox } from '#types';

export const Schema = AppCapability.schema([
  Event.Event,
  Mailbox.Mailbox,
  Calendar.Calendar,
  Message.Message,
  ExtractedFrom.ExtractedFrom,
  TagIndex.TagIndex,
  Project.Project,
  AccessToken.AccessToken,
  Cursor.Cursor,
]);
