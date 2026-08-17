//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { ContentBlock, Message } from '@dxos/types';

/**
 * A projected message in transit. ECHO objects are not transferable, so the host sends the props
 * `Message.make` needs and the client reconstructs the object in its own database.
 */
export type WireMessage = {
  role: 'user' | 'assistant' | 'tool';
  created: string;
  threadId?: string;
  blocks: readonly ContentBlock.Any[];
  properties?: Record<string, unknown>;
};

/** Terminal frame of a run; `error` is set when the SDK loop itself failed. */
export type WireEnd = {
  end: true;
  denials: number;
  /** Session the turn ran under — pass it back as `resume` to continue, or with `fork` to branch. */
  sessionId?: string;
  error?: string;
};

export type WireFrame = WireMessage | WireEnd;

export const isEnd = (frame: WireFrame): frame is WireEnd => 'end' in frame;

export const encode = (message: Message.Message): WireMessage => ({
  role: message.sender.role ?? 'assistant',
  created: message.created,
  threadId: message.threadId,
  blocks: message.blocks,
  properties: message.properties,
});

export const decode = ({ role, created, threadId, blocks, properties }: WireMessage): Message.Message =>
  Message.make({ sender: role, created, threadId, blocks: [...blocks], properties });
