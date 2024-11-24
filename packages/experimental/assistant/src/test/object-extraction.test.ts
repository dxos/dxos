//
// Copyright 2024 DXOS.org
//

import { test } from 'vitest';

import { log } from '@dxos/log';

import { AnthropicBackend } from '../conversation/backend/anthropic';
import { runLLM } from '../conversation/conversation';
import { createUserMessage } from '../conversation/types';

test('extract objects from the DXOS explainer', async () => {
  const result = await runLLM({
    model: '@anthropic/claude-3-5-haiku-20241022',
    messages: [
      createUserMessage(`
# README

> Welcome to DXOS Composer.

Here, you can:
- Create and organize things
- Share and collaborate with others in real-time
- Work offline

Composer is:
- Free. Software built with DXOS requires no expensive server infrastructure to operate.
- Private. Your data never travels to or lives on any servers. Connections with collaborators are peer-to-peer.
- Local-first. Your data is stored entirely in your browser.
- Extensible. Add features by building plugins.
- Open source.

Your feedback is most welcome: feature requests, bug reports, questions: [Discord](https://discord.gg/uTYyx6srAW).

See also:
- [DXOS Documentation](https://docs.dxos.org) where you can build your own local-first, collaborative software.
`),
    ],
    system: `
      <instructions>
       Extract a list of objects that appear in the text.
       Objects can include names, places, technologies, people, concepts, etc.
       Extracts objects that are interesting or important in the context of the text.
      </instructions>

      <formatting>
        Output a list of object names from text, each surrounded with an object <object> tag. 
      </formatting>

      <example>
        <input>
          Czerniaków was born on 30 November 1880 in Warsaw, Poland (then part of the Congress Poland). He studied engineering in Warsaw and Dresden and taught in the Jewish community's vocational school in Warsaw.
        </input>
        <output>
          <object>Czerniaków</object>
          <object>30 November 1880</object>
          <object>Warsaw</object>
          <object>Poland</object>
          <object>Congress Poland</object>
          <object>engineering</object>
          <object>Dresden</object>
        </output>
      </example>
    `,
    tools: [],
    backend,
  });

  log.info('result', { result });
});

const backend = new AnthropicBackend({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});
