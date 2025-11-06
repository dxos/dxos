//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';
import {
  FormatAnnotation,
  FormatEnum,
  PropertyMetaAnnotationId,
  type RuntimeSchemaRegistry,
} from '@dxos/echo/internal';
import { type EchoSchemaRegistry } from '@dxos/echo-db';
import { type DXN, PublicKey } from '@dxos/keys';

export const createDefaultSchema = () =>
  Schema.Struct({
    title: Schema.optional(Schema.String).annotations({ title: 'Title' }),
    status: Schema.optional(
      Schema.Literal('todo', 'in-progress', 'done')
        .pipe(FormatAnnotation.set(FormatEnum.SingleSelect))
        .annotations({
          title: 'Status',
          [PropertyMetaAnnotationId]: {
            singleSelect: {
              options: [
                { id: 'todo', title: 'Todo', color: 'indigo' },
                { id: 'in-progress', title: 'In Progress', color: 'purple' },
                { id: 'done', title: 'Done', color: 'amber' },
              ],
            },
          },
        }),
    ),
    description: Schema.optional(Schema.String).annotations({ title: 'Description' }),
  }).pipe(
    Type.Obj({
      typename: `example.com/type/${PublicKey.random().truncate()}`,
      version: '0.1.0',
    }),
  );

export const getSchema = async (
  dxn: DXN,
  registry?: RuntimeSchemaRegistry,
  echoRegistry?: EchoSchemaRegistry,
): Promise<Type.Obj.Any | undefined> => {
  const staticSchema = registry?.getSchemaByDXN(dxn);
  if (staticSchema) {
    return staticSchema;
  }

  const typeDxn = dxn.asTypeDXN();
  if (!typeDxn) {
    return;
  }

  const { type, version } = typeDxn;
  const echoSchema = await echoRegistry?.query({ typename: type, version }).firstOrUndefined();
  return echoSchema?.snapshot;
};
