//
// Copyright 2023 DXOS.org
//

import { Config } from '@dxos/config';
import { describe, test } from '@dxos/test';

import { getConfig, loadJson } from '../util';
import { ChatModel } from './chat-model';
import { Entity, SchemaMap } from './schema';

// TODO(burdon): Move to config.
const getKey = (config: Config, name: string) => {
  const keys = config.values?.runtime?.keys;
  const key = keys?.find((key) => key.name === name);
  return key?.value;
};

describe('ChatModel', () => {
  const createChatModel = (): ChatModel => {
    const config = getConfig()!;
    return new ChatModel({
      organization: getKey(config, 'com.openai.org_id')!,
      apiKey: getKey(config, 'com.openai.api_key')!
    });
  };

  test('basic', async () => {
    const chat = createChatModel();
    const { messages } = loadJson('packages/experimental/kai-bots/data/messages.json');
    await chat.request(messages);
  });

  test('create contact stack', async () => {
    const _schema: SchemaMap = {
      person: [
        {
          key: 'name'
        },
        {
          key: 'bio',
          // TODO(burdon): Lookup value or run generator.
          generator: (person) => `write a short bio about ${person.name}.`
        },
        {
          key: 'employers',
          type: {
            array: true,
            entity: 'organization'
          },
          generator: (person) => `list the places where ${person} worked.`
        }
      ],

      // TODO(burdon): RDF: VC is a kind of Organization.
      organization: [
        {
          key: 'name'
        },
        {
          key: 'summary',
          generator: (organization) => `write a short summary about ${organization.name}.`
        },
        {
          key: 'executives',
          type: {
            array: true,
            entity: 'person'
          },
          generator: (organization) => `list the names of the executives at ${organization}.`
        },
        {
          key: 'investments',
          type: {
            array: true,
            entity: 'organization'
          },
          generator: (organization) => `list 10 major investments of ${organization.name}.`
        }
      ]
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
              name: 'Blue Yard'
            }
          ]
        }
      },
      {
        entity: 'person',
        values: {
          name: 'Alex Brunicki',
          employers: [
            {
              name: 'Backed VC'
            }
          ]
        }
      },
      {
        entity: 'organization',
        values: {
          name: 'DXOS',
          summary: [
            'DXOS is an Web3 operating system for the creation of decentralized applications based on a new kind of database technology called ECHO.',
            'DXOS does not require the cloud or a blockchain.'
          ].join('')
        }
      }
    ];
  });
});
