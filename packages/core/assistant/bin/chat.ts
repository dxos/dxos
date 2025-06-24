//
// Copyright 2024 DXOS.org
//

import inquirer from 'inquirer';
import { writeFileSync } from 'node:fs';

import { DEFAULT_EDGE_MODEL, EdgeAiServiceClient, createLogger, createUserMessage, runLLM } from '@dxos/ai';
import {
  AI_SERVICE_ENDPOINT,
  createCypherTool,
  createSystemPrompt,
  createTestData,
  Contact,
  Organization,
  Project,
  Task,
} from '@dxos/ai/testing';
import { ObjectId } from '@dxos/echo-schema';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

// TOOD(burdon): Get from config.
const aiClient = new EdgeAiServiceClient({
  endpoint: AI_SERVICE_ENDPOINT.LOCAL,
});

const dataSource = createTestData();
const cypherTool = createCypherTool(dataSource);

const schemaTypes = [Organization, Project, Task, Contact];

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

  await runLLM({
    aiClient,
    model: DEFAULT_EDGE_MODEL,
    spaceId,
    threadId,
    system: createSystemPrompt(schemaTypes),
    tools: [
      cypherTool,
      // TODO(burdon): createToot (with executable).
      // defineTool('testing', {
      //   name: 'text-to-image',
      //   type: ToolTypes.TextToImage,
      // }),
    ],
    history: [createUserMessage(spaceId, threadId, prompt.message)],
    logger: createLogger({
      stream: true,
      filter: (e) => {
        return true;
      },
      onImage: (img) => {
        const path = `/tmp/image-${img.id}.jpeg`;
        writeFileSync(path, Buffer.from(img.source.data, 'base64'));
        log('Saved image', { path });
        // Print image in iTerm using ANSI escape sequence
        const imageData = img.source.data;
        process.stdout.write('\x1b]1337;File=inline=1:' + imageData + '\x07');
      },
    }),
  });
}
