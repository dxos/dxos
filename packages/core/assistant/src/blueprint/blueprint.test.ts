//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { describe, test } from 'vitest';

import { EdgeAiServiceClient, ToolRegistry, ToolResult, createTool } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT, EXA_API_KEY } from '@dxos/ai/testing';
import { ArtifactId } from '@dxos/artifact';
import { Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { DataType, DataTypes } from '@dxos/schema';

import { BlueprintBuilder } from './blueprint';
import { setConsolePrinter } from './logger';
import { BlueprintMachine } from './machine';
import { TEST_EMAILS } from './test-data';
import { createGraphWriterTool, createLocalSearchTool } from '../research';
import { createExaTool } from '../research/exa';

// TODO(burdon): Conslidate with existing artifact definition and create JSON DSL.

// TODO(burdon): Don't run on CI.
describe.skip('Blueprint', () => {
  const aiClient = new EdgeAiServiceClient({
    endpoint: AI_SERVICE_ENDPOINT.REMOTE,
    defaultGenerationOptions: {
      // model: '@anthropic/claude-sonnet-4-20250514',
      model: '@anthropic/claude-3-5-sonnet-20241022',
    },
  });

  test('follows a simple blueprint', { timeout: 60_000 }, async () => {
    const blueprint = BlueprintBuilder.create()
      .step('Generate an idea for a new product. Do not use any external tools for this.')
      .step('Write a short description of the product.')
      .step('Run a market research to see if the product is viable. Do not use any external tools for this.')
      .step('Write a pitch deck for the product')
      .build();

    const tools = new ToolRegistry([]);
    const machine = new BlueprintMachine(tools, blueprint);
    setConsolePrinter(machine, true);
    await machine.runToCompletion({ aiClient });
  });

  test('email bot', { timeout: 60_000 }, async () => {
    const replyTool = createTool('email', {
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

    const labelTool = createTool('email', {
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

    const blueprint = BlueprintBuilder.create()
      .step(
        'Determine if the email is introduction, question, or spam. Bail if email does not fit into one of these categories.',
      )
      .step('If the email is spam, label it as spam and do not respond.', {
        tools: [labelTool.id],
      })
      .step(
        'If the email is an introduction, respond with a short introduction of yourself and ask for more information.',
        {
          tools: [replyTool.id],
        },
      )
      .step('If the email is a question, respond with a short answer and ask for more information.', {
        tools: [replyTool.id],
      })
      .build();

    const tools = new ToolRegistry([replyTool, labelTool]);
    const machine = new BlueprintMachine(tools, blueprint);
    setConsolePrinter(machine);
    await machine.runToCompletion({ aiClient, input: TEST_EMAILS[0] });
  });

  test.only('research', { timeout: 120_000 }, async () => {
    const builder = await new EchoTestBuilder().open();
    const { db } = await builder.createDatabase({ indexing: { vector: true }, types: DataTypes });

    const [org1] = [
      db.add(
        Obj.make(DataType.Organization, {
          name: 'Exa',
          website: 'https://exa.ai',
          description: 'An AI-powered search engine company building search infrastructure for AI agents',
        }),
      ),
      db.add(
        Obj.make(DataType.Organization, {
          name: 'Cresta',
          website: 'https://cresta.ai',
          description: 'A company that builds AI agents',
        }),
      ),
    ];

    await db.flush({ indexes: true });

    const [exa, localSearch, graphWriter] = [
      createExaTool({ apiKey: EXA_API_KEY }),
      createLocalSearchTool(db),
      createGraphWriterTool({ db, schema: DataTypes }),
    ];

    const blueprint = BlueprintBuilder.create()
      .step('Research founders of the organization. Do deep research.', {
        tools: [exa.id],
      })
      .step('Based on your research select matching entires that are already in the graph', {
        tools: [localSearch.id],
      })
      .step('Add researched data to the graph', {
        tools: [localSearch.id, graphWriter.id],
      })
      .build();

    const tools = new ToolRegistry([exa, localSearch, graphWriter]);
    const machine = new BlueprintMachine(tools, blueprint);
    setConsolePrinter(machine, true);
    await machine.runToCompletion({ aiClient, input: org1 });
  });
});
