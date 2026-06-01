//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { TestSchema } from '@dxos/client/testing';
import { JsonSchema, Ref } from '@dxos/echo';

/**
 * Operations seeded into the local space in stories.
 */
export const functions = [
  {
    key: 'com.example.function.chess',
    name: 'com.example.function.chess',
    version: '0.1.0',
    inputSchema: JsonSchema.toJsonSchema(
      Schema.Struct({
        level: Schema.Number.annotations({
          title: 'Level',
        }),
      }),
    ),
  },
  {
    key: 'com.example.function.forex',
    name: 'com.example.function.forex',
    version: '0.1.0',
    binding: 'FOREX',
    inputSchema: JsonSchema.toJsonSchema(
      Schema.Struct({
        from: Schema.String.annotations({ title: 'Currency from' }),
        to: Schema.String.annotations({ title: 'Currency to' }),
      }),
    ),
  },
  {
    key: 'com.example.function.ping-contact',
    name: 'com.example.function.ping-contact',
    version: '0.0.1',
    inputSchema: JsonSchema.toJsonSchema(
      Schema.Struct({
        contact: Ref.Ref(TestSchema.ContactType).annotations({ title: 'Contact' }),
      }),
    ),
  },
];

/**
 * Operations seeded into the registry (not the local space) in stories.
 * Simulates built-in or plugin-provided operations available globally.
 */
export const registryFunctions = [
  {
    key: 'com.example.function.translate',
    name: 'com.example.function.translate',
    version: '0.1.0',
    inputSchema: JsonSchema.toJsonSchema(
      Schema.Struct({
        text: Schema.String.annotations({ title: 'Text' }),
        targetLanguage: Schema.String.annotations({ title: 'Target language' }),
      }),
    ),
  },
  {
    key: 'com.example.function.summarize',
    name: 'com.example.function.summarize',
    version: '0.1.0',
    inputSchema: JsonSchema.toJsonSchema(
      Schema.Struct({
        content: Schema.String.annotations({ title: 'Content' }),
      }),
    ),
  },
];
