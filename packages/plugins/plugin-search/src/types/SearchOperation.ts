//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';

export const OpenSearch = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.search.open'),
    name: 'Open Search',
    icon: 'ph--magnifying-glass--regular',
  },
  input: Schema.Void,
  output: Schema.Void,
});

/**
 * The search dialog as an object picker: the caller decides what the object is for (add it to a chat's
 * context, link it from a document), so the dialog returns it rather than opening it.
 */
export const SelectObject = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.search.selectObject'),
    name: 'Select Object',
    description: 'Open the search dialog and return the object selected, rather than opening it.',
    icon: 'ph--magnifying-glass--regular',
  },
  input: Schema.Struct({
    spaceId: Schema.optional(
      Schema.String.annotate({ description: 'The space to search; defaults to the active space.' }),
    ),
    title: Schema.optional(Schema.String.annotate({ description: "The dialog's title; defaults to Search." })),
  }),
  output: Schema.UndefinedOr(Obj.Unknown).annotate({
    description: 'The object selected, or nothing if the dialog was dismissed.',
  }),
});
