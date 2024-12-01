//
// Copyright 2024 DXOS.org
//

import { AST, S, toJsonSchema } from '@dxos/echo-schema';

export const functions = [
  {
    name: 'example.com/function/chess',
    version: 1,
    inputSchema: toJsonSchema(
      S.Struct({
        level: S.Number.annotations({
          [AST.TitleAnnotationId]: 'Level',
        }),
      }),
    ),
  },
  {
    name: 'example.com/function/forex',
    version: 1,
    binding: 'FOREX',
    inputSchema: toJsonSchema(
      S.Struct({
        from: S.String.annotations({
          [AST.TitleAnnotationId]: 'Currency from',
        }),
        to: S.String.annotations({
          [AST.TitleAnnotationId]: 'Currency to',
        }),
      }),
    ),
  },
];
