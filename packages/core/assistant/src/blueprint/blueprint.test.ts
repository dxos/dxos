import { AIServiceEdgeClient, defineTool, ToolResult } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT } from '@dxos/ai/testing';
import { ArtifactId } from '@dxos/artifact';
import { create } from '@dxos/echo-schema';
import { DataType } from '@dxos/schema';
import chalk from 'chalk';
import { describe, test } from 'vitest';
import { Blueprint, BlueprintBuilder } from './blueprint';
import { BlueprintMachine } from './machiene';
import { Schema } from 'effect';

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

  test.only('email bot', { timeout: 60_000 }, async () => {
    const replyTool = defineTool('email', {
      name: 'reply',
      description: 'Reply to the email',
      schema: Schema.Struct({
        toEmail: ArtifactId,
        subject: Schema.String.annotations({
          description: 'The subject of the reply',
        }),
        body: Schema.String.annotations({
          description: 'The body of the reply',
        }),
      }),
      execute: async (params) => {
        console.log('reply', params);
        return ToolResult.Success('Sent!');
      },
    });

    const labelTool = defineTool('email', {
      name: 'label',
      description: 'Apply a label to the email',
      schema: Schema.Struct({
        toEmail: ArtifactId,
        label: Schema.String.annotations({
          description: 'The label to apply to the email',
        }),
      }),
      execute: async (params) => {
        return ToolResult.Success('Labeled!');
      },
    });

    const blueprint = BlueprintBuilder.begin()
      .step(
        'Determine if the email is introduction, question, or spam. Bail if email does not fit into one of these categories.',
      )
      .step(
        'If the email is an introduction, respond with a short introduction of yourself and ask for more information.',
      )
      .withTool(replyTool)
      .step('If the email is a question, respond with a short answer and ask for more information.')
      .withTool(replyTool)
      .step('If the email is spam, label it as spam and do not respond.')
      .withTool(labelTool)
      .end();

    const machine = new BlueprintMachine(blueprint);

    await machine.runToCompletion({ aiService, input: TEST_EMAILS[2] });
  });
});

const TEST_EMAILS: DataType.Message[] = [
  create(DataType.Message, {
    properties: {
      subject: 'Introduction email',
    },
    sender: {
      email: 'alice@example.com',
    },
    blocks: [
      {
        type: 'text',
        text: "Hi there! I came across your work and would love to connect. I'm working on some interesting projects in the decentralized space and think there could be good collaboration opportunities.",
      },
    ],
    created: new Date().toISOString(),
  }),
  create(DataType.Message, {
    properties: {
      subject: 'Question about integration',
    },
    sender: {
      email: 'bob@example.com',
    },
    blocks: [
      {
        type: 'text',
        text: "Hello, I was wondering if your system supports integration with external APIs? We have some custom services we'd like to connect. Could you explain the process?",
      },
    ],
    created: new Date().toISOString(),
  }),
  create(DataType.Message, {
    properties: {
      subject: 'MAKE MONEY FAST!!!',
    },
    sender: {
      email: 'spammer123@sketchy.com',
    },
    blocks: [
      {
        type: 'text',
        text: 'CONGRATULATIONS!!! You have been selected to receive $10 MILLION dollars! Just send us your bank details and social security number to claim your prize NOW!!!',
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
