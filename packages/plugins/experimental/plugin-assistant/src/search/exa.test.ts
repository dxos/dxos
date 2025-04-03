import { AIServiceEdgeClient, OllamaClient } from '@dxos/assistant';
import { AI_SERVICE_ENDPOINT } from '@dxos/assistant/testing';
import { log } from '@dxos/log';
import { Testing } from '@dxos/schema/testing';
import { describe, test } from 'vitest';
import { search } from './exa';

const EXA_API_KEY = '9c7e17ff-0c85-4cd5-827a-8b489f139e03';
const REMOTE_AI = true;

const aiService = REMOTE_AI
  ? new AIServiceEdgeClient({
      endpoint: AI_SERVICE_ENDPOINT.REMOTE,
    })
  : new OllamaClient({
      overrides: {
        model: 'llama3.1:8b',
      },
    });

describe('Exa Search', () => {
  test.skip('contacts', { timeout: 60_000 }, async () => {
    const objects = await search({
      query: 'top executives at google',
      schema: [Testing.ContactType],
      aiService: aiService,
      exaApiKey: EXA_API_KEY,
    });

    log.info('result', { objects });
  });

  test.skip('contacts projects and orgs', { timeout: 60_000 }, async () => {
    const objects = await search({
      query: 'top executives at google',
      schema: [Testing.ContactType, Testing.ProjectType, Testing.OrgType],
      aiService: aiService,
      exaApiKey: EXA_API_KEY,
    });

    log.info('result', { objects });
  });

  test('a19z org, projects they invest in and team', { timeout: 60_000 }, async () => {
    const objects = await search({
      query: 'a19z org, projects they invest in and team',
      schema: [Testing.ProjectType, Testing.OrgType, Testing.ContactType],
      aiService: aiService,
      exaApiKey: EXA_API_KEY,
    });

    console.log(JSON.stringify(objects, null, 2));
  });

  test('companies building CRDTs', { timeout: 60_000 }, async () => {
    const objects = await search({
      query: 'companies building CRDTs',
      schema: [Testing.ProjectType, Testing.OrgType, Testing.ContactType],
      aiService: aiService,
      exaApiKey: EXA_API_KEY,
    });

    console.log(JSON.stringify(objects, null, 2));
  });
});
