//
// Copyright 2026 DXOS.org
//

import { type ExtractDocument } from '@dxos/semantic-index';

type FixtureMessage = {
  id: string;
  created?: string;
  sender?: { name?: string };
  blocks?: Array<{ _tag: string; text?: string }>;
  '@meta'?: { keys?: Array<{ source?: string; id?: string }> };
};

/**
 * Parse a discord channel fixture (the JSON emitted by `moon run plugin-discord:generate-fixtures`)
 * into semantic-index extraction documents: one per message, text joined from its text blocks,
 * attributed to the sender and sourced by the message's discord key.
 */
export const parseDiscordFixture = (json: unknown): ExtractDocument[] => {
  const messages = (json as { messages?: FixtureMessage[] })?.messages ?? [];
  return messages
    .map((message): ExtractDocument => {
      const text = (message.blocks ?? [])
        .filter((block) => block._tag === 'text' && block.text)
        .map((block) => block.text)
        .join('\n')
        .trim();
      const key = message['@meta']?.keys?.[0]?.id ?? message.id;
      return { text, source: `discord:${key}`, date: message.created, author: message.sender?.name };
    })
    .filter((doc) => doc.text.length > 0);
};
