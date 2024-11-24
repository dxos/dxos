//
// Copyright 2024 DXOS.org
//

import { test } from 'vitest';

import { toJsonSchema } from '@dxos/echo-schema';

import { formatJsonSchemaForLLM } from './schema';
import { Contact, Org, Project, Task } from '../test/test-schema';

test('Org-Project-Task-Contact schema', async ({ expect }) => {
  const jsonSchema = [Org, Project, Task, Contact].map((schema) => toJsonSchema(schema));
  const result = formatJsonSchemaForLLM(jsonSchema);
  // log.info('result', { result });
  expect(result).toHaveLength(8);
});
