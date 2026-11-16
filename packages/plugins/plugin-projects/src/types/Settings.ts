//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { Format } from '@dxos/echo';
import { PropertyMetaAnnotationId } from '@dxos/echo/internal';

/** A spec's views, labelled as the editor toolbar's view menu names them. */
export const SpecView = Schema.Literals(['preview', 'readonly', 'source']).pipe(
  Format.FormatAnnotation.set(Format.TypeFormat.SingleSelect),
  Schema.annotate({
    [PropertyMetaAnnotationId]: {
      singleSelect: {
        options: [
          { id: 'preview', title: 'Markdown' },
          { id: 'readonly', title: 'Read only' },
          { id: 'source', title: 'Plain text' },
        ],
      },
    },
  }),
);
export type SpecView = Schema.Schema.Type<typeof SpecView>;

/** The projects plugin's user preferences. */
export const Settings = Schema.Struct({
  defaultSpecView: Schema.optional(
    SpecView.annotate({
      title: 'Default spec view',
      description: 'The view a spec opens in: its blocks as forms, read only, or its plain text.',
    }),
  ),
  showTaskDescriptions: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Show task descriptions',
      description: "Display each task's description beneath its title in a project's task list.",
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
