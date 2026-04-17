//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

/**
 * Portfolio dashboard configuration object.
 * When opened, renders a multi-section overview of the deal pipeline.
 */
export const Dashboard = Schema.Struct({
  /** Dashboard name. */
  name: Schema.optional(Schema.String),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.portfolioDashboard',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--chart-pie-slice--regular',
    hue: 'blue',
  }),
);

export interface Dashboard extends Schema.Schema.Type<typeof Dashboard> {}

/** Creates a Dashboard object. */
export const make = (props: Partial<Obj.MakeProps<typeof Dashboard>> = {}): Dashboard =>
  Obj.make(Dashboard, { name: 'Portfolio Dashboard', ...props });
