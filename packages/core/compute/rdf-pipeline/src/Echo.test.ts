//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from '@effect/vitest';

import { Obj, Ref } from '@dxos/echo';
import { Message, Organization, Person } from '@dxos/types';

import { Echo } from './index';

Obj.ID.dangerouslyDisableRandomness();

const acme = Organization.make({ name: 'ACME Corp', description: 'A fine organization.' });
const alice = Person.make({
  fullName: 'Alice Smith',
  jobTitle: 'Engineer',
  emails: [{ label: 'work', value: 'alice@acme.com' }],
  organization: Ref.make(acme),
});
const msg = Message.make({
  sender: { name: 'Alice Smith', email: 'alice@acme.com', contact: Ref.make(alice) },
  blocks: [{ _tag: 'text', text: 'Hello from ACME!' }],
  properties: { subject: 'Meeting tomorrow', to: ['bob@example.com'] },
});

describe('Echo JSON-LD', () => {
  test('convert message to json-ld', () => {
    const jsonLd = Echo.entityToJsonLd(msg);
    expect(jsonLd).toMatchInlineSnapshot(`
      {
        "@context": {
          "@vocab": "https://dxos.org/echo#",
          "echo": "https://dxos.org/echo#",
          "id": "@id",
          "type": "@type",
        },
        "@id": "echo:/01JGFJJZ00G0WKQSJGMAKCNT89",
        "@type": "dxn:org.dxos.type.message:0.1.0",
        "blocks": [
          {
            "_tag": "text",
            "text": "Hello from ACME!",
          },
        ],
        "https://schema.org/dateCreated": "2026-07-06T22:47:25.528Z",
        "https://schema.org/sender": {
          "contact": {
            "@id": "echo:/01JGFJJZ00G0WKQSJGMAKCNT88",
          },
          "email": "alice@acme.com",
          "name": "Alice Smith",
        },
        "properties": {
          "subject": "Meeting tomorrow",
          "to": [
            "bob@example.com",
          ],
        },
      }
    `);
  });

  test('convert set of entities to json-ld graphg', () => {
    const jsonLd = Echo.entitiesToJsonLd([acme, alice, msg]);
    expect(jsonLd).toMatchInlineSnapshot(`
      {
        "@context": {
          "@vocab": "https://dxos.org/echo#",
          "echo": "https://dxos.org/echo#",
          "id": "@id",
          "type": "@type",
        },
        "@graph": [
          {
            "@id": "echo:/01JGFJJZ00G0WKQSJGMAKCNT87",
            "@type": "dxn:org.dxos.type.organization:0.1.0",
            "description": "A fine organization.",
            "name": "ACME Corp",
          },
          {
            "@id": "echo:/01JGFJJZ00G0WKQSJGMAKCNT88",
            "@type": "dxn:org.dxos.type.person:0.1.0",
            "emails": [
              {
                "label": "work",
                "value": "alice@acme.com",
              },
            ],
            "fullName": "Alice Smith",
            "jobTitle": "Engineer",
            "organization": {
              "@id": "echo:/01JGFJJZ00G0WKQSJGMAKCNT87",
            },
          },
          {
            "@id": "echo:/01JGFJJZ00G0WKQSJGMAKCNT89",
            "@type": "dxn:org.dxos.type.message:0.1.0",
            "blocks": [
              {
                "_tag": "text",
                "text": "Hello from ACME!",
              },
            ],
            "https://schema.org/dateCreated": "2026-07-06T22:47:25.528Z",
            "https://schema.org/sender": {
              "contact": {
                "@id": "echo:/01JGFJJZ00G0WKQSJGMAKCNT88",
              },
              "email": "alice@acme.com",
              "name": "Alice Smith",
            },
            "properties": {
              "subject": "Meeting tomorrow",
              "to": [
                "bob@example.com",
              ],
            },
          },
        ],
      }
    `);
  });
});
