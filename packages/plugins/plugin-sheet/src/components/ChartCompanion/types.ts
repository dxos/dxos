//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation } from '@dxos/echo';
import { PlotOptions } from '@dxos/react-ui-plot';

/** A chart of a 2D sheet range. */
export const ChartSpec = Schema.Struct({
  id: Schema.String.pipe(Annotation.FormInputAnnotation.set(false)),
  name: Schema.optional(Schema.String.annotate({ title: 'Name' })),
  // TODO(burdon): Store as an indexed range (see `SheetUtil.rangeToIndex`) once persisted, so it tracks row/column edits.
  range: Schema.String.annotate({ title: 'Range', description: 'A1 notation (e.g., B1:C5).' }),
  ...PlotOptions.fields,
});

export type ChartSpec = Schema.Schema.Type<typeof ChartSpec>;
