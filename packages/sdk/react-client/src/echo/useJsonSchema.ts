//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';
import { useMemo } from 'react';

import { EchoSchema, toJsonSchema } from '@dxos/echo-schema';

export const useJsonSchema = (schema: Schema.Schema.AnyNoContext | undefined) => {
  return useMemo(
    () => (schema instanceof EchoSchema ? schema.jsonSchema : schema ? toJsonSchema(schema) : undefined),
    [schema],
  );
};
