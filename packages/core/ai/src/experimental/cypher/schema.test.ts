//
// Copyright 2024 DXOS.org
//

import { test } from 'vitest';

import { toJsonSchema } from '@dxos/echo-schema';

import { formatJsonSchemaForLLM } from './schema';
import { Contact, Organization, Project, Task } from '../../testing';

test('formatJsonSchemaForLLM', async ({ expect }) => {
  const jsonSchema = [Organization, Project, Task, Contact].map((schema) => toJsonSchema(schema));
  const result = formatJsonSchemaForLLM(jsonSchema);
  // log('result', { result });
  expect(result).toHaveLength(8);
});
