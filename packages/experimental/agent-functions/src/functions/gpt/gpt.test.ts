//
// Copyright 2023 DXOS.org
//

import { describe, test } from '@dxos/test';
import { ChatOpenAI } from '@langchain/openai';
import { expect } from 'chai';
import { getConfig, getKey, loadJson } from '../../util';

import { type Entity, type SchemaMap } from './schema';

// eslint-disable-next-line mocha/no-skipped-tests
describe.skip('ChatModel', () => {
  const createChatModel = () => {
    const config = getConfig()!;
    return new ChatOpenAI({
      openAIApiKey: process.env.COM_OPENAI_API_KEY ?? getKey(config, 'openai.com/api_key')!,
    });
  };

  // eslint-disable-next-line mocha/no-skipped-tests
  test('basic', async () => {
    const chat = createChatModel();
    // TODO(burdon): Get dir.
    const { messages } = loadJson('packages/experimental/agent-functions/testing/messages.json');
    const result = await chat.call(messages);
    expect(result).to.exist;
  });

  // eslint-disable-next-line mocha/no-skipped-tests
  test('create contact stack', async () => {
    const _schema: SchemaMap = {
      person: [
        {
          key: 'name',
          resolver: (person) => `write a short bio about ${person.name}.`,
        },
        {
          key: 'bio',
          // TODO(burdon): Lookup value or run resolver.
          resolver: (person) => `write a short bio about ${person.name}.`,
        },
        {
          key: 'employers',
          type: {
            array: true,
            entity: 'organization',
          },
          resolver: (person) => `list the places where ${person.name} worked.`,
        },
      ],

      // TODO(burdon): RDF: VC is a kind of Organization.
      organization: [
        {
          key: 'name',
        },
        {
          key: 'summary',
          resolver: (organization) => `write a short summary about ${organization.name}.`,
        },
        {
          key: 'executives',
          type: {
            array: true,
            entity: 'person',
          },
          resolver: (organization) => `list the names of the executives at ${organization}.`,
        },
        {
          key: 'investments',
          type: {
            array: true,
            entity: 'organization',
          },
          resolver: (organization) => `list 10 major investments of ${organization.name}.`,
        },
      ],
    };

    // TODO(burdon): Extract name and company from email/calendar event and create a Stack for the company.
    // TODO(burdon): Remove from the context any bad answers or prompts.
    // TODO(burdon): Coerce output format (e.g., to JSON).

    // TODO(burdon): JSON doc.
    const _base: Entity[] = [
      {
        entity: 'person',
        values: {
          name: "Ciaran O'Leary",
          employers: [
            {
              name: 'Blue Yard',
            },
          ],
        },
      },
      {
        entity: 'person',
        values: {
          name: 'Alex Brunicki',
          employers: [
            {
              name: 'Backed VC',
            },
          ],
        },
      },
      {
        entity: 'organization',
        values: {
          name: 'DXOS',
          summary: [
            'DXOS is an Web3 operating system for the creation of decentralized applications based on a new kind of database technology called ECHO.',
            'DXOS does not require the cloud or a blockchain.',
          ].join(''),
        },
      },
    ];
  });
});
