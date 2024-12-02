//
// Copyright 2024 DXOS.org
//

import inquirer from 'inquirer';

import { SpaceId } from '@dxos/keys';

import { AIServiceClientImpl } from '../ai-service/client';
import { ObjectId } from '../ai-service/schema';
import { runLLM } from '../conversation/conversation';
import { createUserMessage } from '../conversation/types';
import { createLogger } from '../test/logger';
import { createCypherTool, createSystemPrompt } from '../test/query-promts';
import { createTestData } from '../test/test-data';
import { Contact, Org, Project, Task } from '../test/test-schema';

const ENDPOINT = 'http://localhost:8787';

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

  const { result } = await runLLM({
    model: '@anthropic/claude-3-5-sonnet-20241022',
    spaceId,
    threadId,
    system: createSystemPrompt(schemaTypes),
    tools: [cypherTool],
    client,
    logger: createLogger({
      stream: true,
      filter: (e) => {
        return true;
      },
    }),
  });
}
