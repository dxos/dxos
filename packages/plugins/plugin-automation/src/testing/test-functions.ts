//
// Copyright 2024 DXOS.org
//

import { ContactType } from '@dxos/client/testing';
import { AST, Ref, S, toJsonSchema } from '@dxos/echo-schema';

export const functions = [
  {
    name: 'example.com/function/chess',
    version: '0.1.0',
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
    version: '0.1.0',
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
  {
    name: 'example.com/function/ping-contact',
    version: '0.0.1',
    inputSchema: toJsonSchema(
      S.Struct({
        object: Ref(ContactType),
      }),
    ),
  },
];
