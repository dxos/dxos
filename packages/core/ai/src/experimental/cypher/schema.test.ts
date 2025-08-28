//
// Copyright 2024 DXOS.org
//

import { test } from 'vitest';

import { toJsonSchema } from '@dxos/echo/internal';

import { Contact, Organization, Project, Task } from '../../testing';

import { formatJsonSchemaForLLM } from './schema';

test('formatJsonSchemaForLLM', async ({ expect }) => {
  const jsonSchema = [Organization, Project, Task, Contact].map((schema) => toJsonSchema(schema));
  const result = formatJsonSchemaForLLM(jsonSchema);
  // log('result', { result });
  expect(result).toHaveLength(8);
});
