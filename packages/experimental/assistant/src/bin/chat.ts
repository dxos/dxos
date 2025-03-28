//
// Copyright 2024 DXOS.org
//

import inquirer from 'inquirer';
import { writeFileSync } from 'node:fs';

import { createUserMessage } from '@dxos/artifact';
import { ObjectId } from '@dxos/echo-schema';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { AIServiceEdgeClient, ToolTypes, DEFAULT_EDGE_MODEL } from '../ai-service';
import { runLLM } from '../conversation';
import {
  AI_SERVICE_ENDPOINT,
  createLogger,
  createCypherTool,
  createSystemPrompt,
  createTestData,
  Contact,
  Org,
  Project,
  Task,
} from '../testing';

// TOOD(burdon): Get from config.
const client = new AIServiceEdgeClient({
  endpoint: AI_SERVICE_ENDPOINT.LOCAL,
});

const dataSource = createTestData();

const cypherTool = createCypherTool(dataSource);

const schemaTypes = [Org, Project, Task, Contact];

const spaceId = SpaceId.random();
const threadId = ObjectId.random();

while (true) {
  const prompt = await inquirer.prompt([
    {
      type: 'input',
      name: 'message',
      message: 'Enter a message:',
    },
  ]);
  await client.appendMessages([createUserMessage(spaceId, threadId, prompt.message)]);

  await runLLM({
    model: DEFAULT_EDGE_MODEL,
    spaceId,
    threadId,
    system: createSystemPrompt(schemaTypes),
    tools: [
      cypherTool,
      {
        name: 'text-to-image',
        type: ToolTypes.TextToImage,
      },
    ],
    client,
    logger: createLogger({
      stream: true,
      filter: (e) => {
        return true;
      },
      onImage: (img) => {
        const path = `/tmp/image-${img.id}.jpeg`;
        writeFileSync(path, Buffer.from(img.source.data, 'base64'));
        log.info('Saved image', { path });
        // Print image in iTerm using ANSI escape sequence
        const imageData = img.source.data;
        process.stdout.write('\x1b]1337;File=inline=1:' + imageData + '\x07');
      },
    }),
  });
}
