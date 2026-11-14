//
// Copyright 2024 DXOS.org
//

import * as Project from '@dxos/compute/Project';
import { Tag } from '@dxos/echo';
import { AccessToken, Cursor } from '@dxos/link';
import { TagIndex } from '@dxos/schema';
import { Event, Message, Person } from '@dxos/types';

import { Calendar, ExtractedFrom, Mailbox } from '#types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 *
 * `Tag` is a core ECHO type no plugin contributes, but this one creates Tags (drafts and labels via
 * `SystemTags.toggleTag` / `Mailbox.applyTag`), so it has to be registered wherever the operations
 * run: an EDGE bundle registers only what its plugin contributes. `Person` is the same case: the mail
 * sync commits a contact for each new sender (`EmailStage.extractContacts`).
 */
export default [
  Event.Event,
  Mailbox.Mailbox,
  Calendar.Calendar,
  Message.Message,
  Person.Person,
  ExtractedFrom.ExtractedFrom,
  TagIndex.TagIndex,
  Project.Project,
  AccessToken.AccessToken,
  Cursor.Cursor,
  Tag.Tag,
];
