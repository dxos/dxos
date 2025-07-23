//
// Copyright 2025 DXOS.org
//

import { beforeAll, describe, expect, test } from 'vitest';

import { ConsolePrinter, ToolRegistry } from '@dxos/ai';
import { Blueprint, Conversation } from '@dxos/assistant';
import { Obj, Ref } from '@dxos/echo';
import type { EchoDatabase, QueueFactory } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { ToolResolverService, type ServiceContainer } from '@dxos/functions';
import { createTestServices } from '@dxos/functions/testing';
import { log } from '@dxos/log';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { DataType } from '@dxos/schema';

import { DESIGN_SPEC_BLUEPRINT, TASK_LIST_BLUEPRINT } from '../blueprints';

describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('Blueprint', { timeout: 120_000 }, () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;
  let queues: QueueFactory;
  let serviceContainer: ServiceContainer;

  beforeAll(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db, queues } = await builder.createDatabase({ types: [DocumentType, Blueprint] }));

    // TODO(dmaretskyi): Helper to scaffold this from a config.
    serviceContainer = createTestServices({
      ai: {
        provider: 'edge',
      },
      db,
      queues,
      logging: {
        enabled: true,
      },
      // TODO(dmaretskyi): Fix me.
      toolResolver: ToolResolverService.make(
        new ToolRegistry([
          /*readDocument, writeDocument*/
        ]),
      ),
    });
  });

  test('spec blueprint', async () => {
    const printer = new ConsolePrinter();
    const conversation = new Conversation({
      queue: queues.create(),
    });
    conversation.onBegin.on((session) => {
      session.message.on((message) => printer.printMessage(message));
      session.userMessage.on((message) => printer.printMessage(message));
      session.block.on((block) => printer.printContentBlock(block));
    });

    await db.add(DESIGN_SPEC_BLUEPRINT);
    await conversation.context.bind({ blueprints: [Ref.make(DESIGN_SPEC_BLUEPRINT)] });

    const artifact = db.add(
      Obj.make(DocumentType, { content: Ref.make(Obj.make(DataType.Text, { content: 'Hello, world!' })) }),
    );
    let prevContent = artifact.content;

    // TODO(dmaretskyi): Fix with effect
    void conversation.run({
      prompt: `
        Let's design a new feature for our product. We need to add a user profile system with the following requirements:

        1. Users should be able to create and edit their profiles
        2. Profile should include basic info like name, bio, avatar
        3. Users can control privacy settings for their profile
        4. Profile should show user's activity history
        5. Need to consider data storage and security implications

        What do you think about this approach? Let's capture the key design decisions in our spec.

        The store spec in ${Obj.getDXN(artifact)}
      `,
    });
    log.info('spec 1', { doc: artifact });
    expect(artifact.content).not.toBe(prevContent);
    prevContent = artifact.content;

    // TODO(dmaretskyi): Fix with effect
    void conversation.run({
      prompt: `
        I want this to be built on top of Durable Objects and SQLite database. Let's adjust the spec to reflect this.
      `,
    });
    log.info('spec 2', { doc: artifact });
    expect(artifact.content).not.toBe(prevContent);
  });

  test.only('building a shelf', async () => {
    const printer = new ConsolePrinter();
    const conversation = new Conversation({
      queue: queues.create(),
    });
    conversation.onBegin.on((session) => {
      session.message.on((message) => printer.printMessage(message));
      session.userMessage.on((message) => printer.printMessage(message));
      session.block.on((block) => printer.printContentBlock(block));
    });

    await db.add(TASK_LIST_BLUEPRINT);
    await conversation.context.bind({ blueprints: [Ref.make(TASK_LIST_BLUEPRINT)] });

    const artifact = db.add(Obj.make(DocumentType, { content: Ref.make(Obj.make(DataType.Text, { content: '' })) }));
    let prevContent = artifact.content;

    // TODO(dmaretskyi): Fix with effect
    void conversation.run({
      prompt: `
        I'm building a shelf.
        I need a hammer, nails, and a saw.
        Store the shopping list in ${Obj.getDXN(artifact)}
      `,
    });
    log.info('spec 1', { doc: artifact });
    expect(artifact.content).not.toBe(prevContent);
    prevContent = artifact.content;

    // TODO(dmaretskyi): Fix with effect
    void conversation.run({
      prompt: `
        I will need a board too.
      `,
    });
    log.info('spec 2', { doc: artifact });
    expect(artifact.content).not.toBe(prevContent);

    // TODO(dmaretskyi): Fix with effect
    void conversation.run({
      prompt: `
        Actually lets use screws and a screwdriver.
      `,
    });
    log.info('spec 3', { doc: artifact });
    expect(artifact.content).not.toBe(prevContent);

    const { content } = await artifact.content.load();

    Object.entries({
      screwdriver: true,
      screws: true,
      board: true,
      saw: true,
      hammer: false,
      nails: false,
    }).forEach(([item, expected]) => {
      expect(content.toLowerCase().includes(item)).toBe(expected);
    });
  });
});
