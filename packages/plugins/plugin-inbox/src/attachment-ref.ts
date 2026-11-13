//
// Copyright 2025 DXOS.org
//

import { Obj, Type } from '@dxos/echo';
import { Message } from '@dxos/types';

// Kept out of the AppGraphBuilder module: another module importing a manifest module's entry makes the bundler share
// that entry, which can leave its default export unset when the plugin activates it.

export const ATTACHMENT_NODE_TYPE = `${Type.getTypename(Message.Message)}-attachment`;

/**
 * A single attachment, addressed as its owning message plus an index — an attachment is an entry in
 * `message.attachments`, not an object, so it has no identity a surface could match on its own.
 */
export type AttachmentRef = { message: Message.Message; index: number };

export const isAttachmentRef = (value: unknown): value is AttachmentRef =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as AttachmentRef).index === 'number' &&
  Obj.instanceOf(Message.Message, (value as AttachmentRef).message);
