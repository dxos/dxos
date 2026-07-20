//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayerWithTriggers, operationToolCall } from '@dxos/agent-runtime/testing';
import { ScriptedAiService } from '@dxos/ai/testing';
import { SpaceProperties } from '@dxos/client-protocol';
import { OperationHandlerSet, Skill } from '@dxos/compute';
import { Collection, Database, Feed, Query, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { log } from '@dxos/log';
import { Markdown, MarkdownOperation, MarkdownSkill } from '@dxos/plugin-markdown';
import { MarkdownOperationHandlerSet } from '@dxos/plugin-markdown/plugin';
import { WithProperties } from '@dxos/plugin-markdown/testing';
import { Person } from '@dxos/types';

import { DatabaseHandlers, DatabaseOperations, DatabaseSkill } from '../database';
import BrowserSkill from './skill';

const PERSON = Type.getTypename(Person.Person);

// The agent's tool-calling behaviour is scripted inline (no recorded conversation to regenerate).
// The browser skill only exposes tools through a remote MCP server (`playwright-mcp-example`), so
// they are never scripted here: connecting to it is best-effort (a failure just drops the server's
// tools for that turn, see `AiSession.connectMcpServers`), and scripting a call to a tool that may
// not be registered would make the test depend on that connection succeeding. Instead the script
// mimics an agent that has already "read" the last 3 articles and goes straight to recording an
// author (Person) and a Markdown document per article via the local Database/Markdown skills.
const TestLayer = AssistantTestLayerWithTriggers({
  operationHandlers: OperationHandlerSet.merge(DatabaseHandlers, MarkdownOperationHandlerSet),
  types: [Skill.Skill, Person.Person, Markdown.Document, SpaceProperties, Collection.Collection, Feed.Feed],
  skills: [BrowserSkill.make(), MarkdownSkill.make(), DatabaseSkill.make()],
  tracing: 'pretty',
  aiService: ScriptedAiService.layer([
    operationToolCall(DatabaseOperations.ObjectCreate, {
      typename: PERSON,
      properties: { fullName: 'Michael Arnaldi' },
    }),
    operationToolCall(MarkdownOperation.Create, {
      name: 'Effect 3.0 Release',
      content: 'Article content scraped from the Effect blog.',
    }),
    operationToolCall(DatabaseOperations.ObjectCreate, {
      typename: PERSON,
      properties: { fullName: 'Tim Smart' },
    }),
    operationToolCall(MarkdownOperation.Create, {
      name: 'Effect Cluster Announcement',
      content: 'Article content scraped from the Effect blog.',
    }),
    operationToolCall(DatabaseOperations.ObjectCreate, {
      typename: PERSON,
      properties: { fullName: 'Maxwell Brown' },
    }),
    operationToolCall(MarkdownOperation.Create, {
      name: 'Effect AI Toolkit',
      content: 'Article content scraped from the Effect blog.',
    }),
    ScriptedAiService.text('Scraped the last 3 articles, recorded their authors, and created a document for each.'),
  ]),
});

// NOTE: Not run by default. Even with the model scripted, `AiSession.connectMcpServers` dials the
// real `playwright-mcp-example` MCP server on every turn (a connection failure only drops that
// server's tools for the turn, it does not skip the attempt) — confirmed empirically to take
// ~2-3s per turn when the connection succeeds, which is enough to blow past this suite's default
// test timeout across the 6 tool-call turns below. That makes the test's duration depend on a live
// external service, so it stays behind the `manual` tag; the timeout below is sized generously for
// a deliberate manual run rather than for CI.
describe('Browser', { tags: ['manual'] }, () => {
  it.effect(
    'scrape effect blog',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [BrowserSkill.make(), MarkdownSkill.make(), DatabaseSkill.make()],
        });
        yield* agent.submitPrompt(`
          Scrape effect blog at https://effect.website/blog and find the content of last 3 articles.
          Create/update Person object for each author.
          Create Markdown document for each article.
        `);
        yield* agent.waitForCompletion();
        const people = yield* Database.query(Query.type(Person.Person)).run;
        log.info(`people`, { people });
        const documents = yield* Database.query(Query.type(Markdown.Document)).run;
        log.info(`documents`, { documents });
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000, tags: ['sync'] },
  );
});
