//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';
import { FormatAnnotation, FormatEnum, PropertyMetaAnnotationId } from '@dxos/echo/internal';
import { PublicKey } from '@dxos/keys';

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
