//
// Copyright 2024 DXOS.org
//

import inquirer from 'inquirer';

import { SpaceId } from '@dxos/keys';

import { AIServiceClientImpl, ObjectId, ToolTypes } from '../ai-service';
import { runLLM, createUserMessage } from '../conversation';
import {
  createLogger,
  createCypherTool,
  createSystemPrompt,
  createTestData,
  Contact,
  Org,
  Project,
  Task,
} from '../testing';
import { readFileSync, writeFileSync } from 'fs';

// TODO(burdon): Move out of src?

const ENDPOINT = 'http://localhost:8787';
// const ENDPOINT = 'https://ai-service.dxos.workers.dev';

const client = new AIServiceClientImpl({
  endpoint: ENDPOINT,
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
  await client.insertMessages([createUserMessage(spaceId, threadId, prompt.message)]);

  await runLLM({
    model: '@anthropic/claude-3-5-sonnet-20241022',
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
        console.log(`Saved image to ${path}`);
        // Print image in iTerm using ANSI escape sequence
        const imageData = img.source.data;
        process.stdout.write('\x1b]1337;File=inline=1:' + imageData + '\x07');
      },
    }),
  });
}
