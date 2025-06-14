//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { describe, test } from 'vitest';

import { AIServiceEdgeClient, defineTool, ToolResult } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT, EXA_API_KEY } from '@dxos/ai/testing';
import { ArtifactId } from '@dxos/artifact';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { create } from '@dxos/echo-schema';
import { DataType, DataTypes } from '@dxos/schema';

import { BlueprintBuilder } from './blueprint';
import { setConsolePrinter } from './logger';
import { BlueprintMachine } from './machine';
import { TEST_EMAILS } from './test-data';
import { createGraphWriterTool, createLocalSearchTool } from '../research';
import { createExaTool } from '../research/exa';

// TODO(burdon): Conslidate with existing artifact definition and create JSON DSL.

describe('Blueprint', () => {
  const aiService = new AIServiceEdgeClient({
    endpoint: AI_SERVICE_ENDPOINT.REMOTE,
    defaultGenerationOptions: {
      // model: '@anthropic/claude-sonnet-4-20250514',
      model: '@anthropic/claude-3-5-sonnet-20241022',
    },
  });

  test('follows a simple blueprint', { timeout: 60_000 }, async () => {
    const blueprint = BlueprintBuilder.begin()
      .step('Generate an idea for a new product. Do not use any external tools for this.')
      .step('Write a short description of the product.')
      .step('Run a market research to see if the product is viable. Do not use any external tools for this.')
      .step('Write a pitch deck for the product')
      .end();

    const machine = new BlueprintMachine(blueprint);
    setConsolePrinter(machine, true);
    await machine.runToCompletion({ aiService });
  });

  test('email bot', { timeout: 60_000 }, async () => {
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
      .step('If the email is spam, label it as spam and do not respond.')
      .withTool(labelTool)
      .step(
        'If the email is an introduction, respond with a short introduction of yourself and ask for more information.',
      )
      .withTool(replyTool)
      .step('If the email is a question, respond with a short answer and ask for more information.')
      .withTool(replyTool)
      .end();

    const machine = new BlueprintMachine(blueprint);
    setConsolePrinter(machine);
    await machine.runToCompletion({ aiService, input: TEST_EMAILS[0] });
  });

  test.only('research', { timeout: 120_000 }, async () => {
    const builder = await new EchoTestBuilder().open();
    const { db } = await builder.createDatabase({ indexing: { vector: true }, types: DataTypes });

    const [org1] = [
      db.add(
        create(DataType.Organization, {
          name: 'Exa',
          website: 'https://exa.ai',
          description: 'An AI-powered search engine company building search infrastructure for AI agents',
        }),
      ),
      db.add(
        create(DataType.Organization, {
          name: 'Cresta',
          website: 'https://cresta.ai',
          description: 'A company that builds AI agents',
        }),
      ),
    ];

    await db.flush({ indexes: true });

    const blueprint = BlueprintBuilder.begin()
      .step('Research founders of the organization. Do deep research.')
      .withTool(createExaTool({ apiKey: EXA_API_KEY }))
      .step('Based on your research select matching entires that are already in the graph')
      .withTool(createLocalSearchTool(db))
      .step('Add researched data to the graph')
      .withTool(createLocalSearchTool(db))
      .withTool(createGraphWriterTool({ db, schemaTypes: DataTypes }))
      .end();

    const machine = new BlueprintMachine(blueprint);
    setConsolePrinter(machine, true);
    await machine.runToCompletion({ aiService, input: org1 });
  });
});
