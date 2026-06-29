//
// Copyright 2026 DXOS.org
//

import { type ExtractDocument } from '@dxos/semantic-index';

// Snapshot of DXOS messages emitted by `moon run plugin-discord:generate-fixtures`
// (packages/plugins/plugin-discord/src/__fixtures__/discord-messages.json). Copied here so the
// story stays self-contained and does not depend on the discord plugin.
import fixture from './discord-messages.json';

type FixtureMessage = {
  id: string;
  created?: string;
  sender?: { name?: string };
  blocks?: Array<{ _tag: string; text?: string }>;
  '@meta'?: { keys?: Array<{ source?: string; id?: string }> };
};

// The fixture is external data; treat the imported JSON as the known message shape at this boundary.
const messages = ((fixture as { messages?: FixtureMessage[] }).messages ?? []) as FixtureMessage[];

/**
 * The discord fixture as semantic-index extraction documents: one per message, text joined from its
 * text blocks, attributed to the sender and sourced by the message's discord key.
 */
export const DISCORD_FIXTURE_DOCS: ExtractDocument[] = messages
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
