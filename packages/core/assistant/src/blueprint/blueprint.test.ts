import { AIServiceEdgeClient } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT } from '@dxos/ai/testing';
import { describe, test } from 'vitest';
import { BlueprintMachine } from './machiene';
import { Blueprint } from './blueprint';
import chalk from 'chalk';
import { Message } from '@dxos/ai';
import { DataType } from '@dxos/schema';
import { create } from '@dxos/echo-schema';

// Force chalk colors on for tests
chalk.level = 2;

describe('Blueprint', () => {
  const aiService = new AIServiceEdgeClient({
    endpoint: AI_SERVICE_ENDPOINT.REMOTE,
    defaultGenerationOptions: {
      // model: '@anthropic/claude-sonnet-4-20250514',
      model: '@anthropic/claude-3-5-sonnet-20241022',
    },
  });

  test('follows a simple blueprint', { timeout: 60_000 }, async () => {
    const blueprint = Blueprint.make([
      'Generate an idea for a new product. Do not use any external tools for this.',
      'Write a short description of the product',
      'Run a market research to see if the product is viable. Do not use any external tools for this.',
      'Write a pitch deck for the product',
    ]);

    const machine = new BlueprintMachine(blueprint);

    await machine.runToCompletion({ aiService });
  });

  test('email bot', { timeout: 60_000 }, async () => {
    const blueprint = Blueprint.make([
      'Determine if the email is introduction, question, or spam. Bail if email does not fit into one of these categories.',
      'If the email is an introduction, respond with a short introduction of yourself and ask for more information.',
      'If the email is a question, respond with a short answer and ask for more information.',
      'If the email is spam, label it as spam and do not respond.',
    ]);

    const machine = new BlueprintMachine(blueprint);

    await machine.runToCompletion({ aiService, input: TEST_EMAIL });
  });
});

const TEST_EMAIL: DataType.Message[] = [
  create(DataType.Message, {
    sender: {
      role: 'user',
    },
    blocks: [
      {
        type: 'text',
        text: 'How do you query for an ECHO object?',
      },
    ],
    created: new Date().toISOString(),
  }),
];

/*
const b1 = Blueprint.make([
  '',
  ''
]);

const b2 = Blueprint.make([
  'do something',
  Blueprint.if('thing happens', b1)
]);


const b = Blueprint.make()
  .step('turn on the stove')
  .step('wait for the stove to heat up')
    .alternative('stove doesnt work', b => b.step('call the repairman'))
  .step('put the food in the stove')
  .step('wait for the food to cook')
  .step('turn off the stove')
  .step('put the food on a plate')
  .step('eat the food')
  .step('clean the stove')
  .step('clean the plate')

*/
