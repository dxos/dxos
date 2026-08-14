//
// Copyright 2024 DXOS.org
//

import * as Project from '@dxos/compute/Project';
import { AccessToken, Cursor } from '@dxos/link';
import { TagIndex } from '@dxos/schema';
import { Event, Message } from '@dxos/types';

import { Calendar, ExtractedFrom, Mailbox } from '#types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [
  Event.Event,
  Mailbox.Mailbox,
  Calendar.Calendar,
  Message.Message,
  ExtractedFrom.ExtractedFrom,
  TagIndex.TagIndex,
  Project.Project,
  AccessToken.AccessToken,
  Cursor.Cursor,
];
