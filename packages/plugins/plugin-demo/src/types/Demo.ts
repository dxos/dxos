//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';

// @import-as-namespace

/**
 * Singleton per space that users open to access the demo event injection panel.
 * The object itself carries no state — it exists so the Composer deck has
 * something to open and render the DemoPanel surface against.
 */
export const DemoController = Schema.Struct({
  name: Schema.optional(Schema.String),
  /** Free-form notes for the human running the demo. */
  notes: Schema.optional(Schema.String),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.demoController',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--flask--regular',
    hue: 'cyan',
  }),
);

export interface DemoController extends Schema.Schema.Type<typeof DemoController> {}

/**
 * Synthetic event written by the demo panel that downstream plugins/blueprints
 * can observe. Kept deliberately generic — `kind` identifies the event type,
 * `payload` is an opaque JSON blob whose shape is agreed between the emitting
 * button and the consuming blueprint.
 */
export const DemoEvent = Schema.Struct({
  /** Discriminator: 'granola-note' | 'pr-merged' | 'slack-message' | …. */
  kind: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** ISO timestamp at which the event was injected. */
  emittedAt: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** Human-readable one-line description for the demo panel log. */
  label: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** Opaque JSON payload, serialized as a string for schema simplicity. */
  payload: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** True once a downstream consumer has handled the event. */
  handled: Schema.optional(Schema.Boolean.pipe(FormInputAnnotation.set(false))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.demoEvent',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['label']),
  Annotation.IconAnnotation.set({
    icon: 'ph--lightning--regular',
    hue: 'cyan',
  }),
);

export interface DemoEvent extends Schema.Schema.Type<typeof DemoEvent> {}

/** Input schema for creating a DemoController. */
export const CreateDemoControllerSchema = Schema.Struct({
  name: Schema.optional(
    Schema.String.annotations({
      title: 'Name',
      description: 'Label for this demo controller.',
    }),
  ),
});

export interface CreateDemoControllerSchema extends Schema.Schema.Type<typeof CreateDemoControllerSchema> {}

/** Creates a DemoController object. */
export const makeController = (props: CreateDemoControllerSchema = {}): DemoController =>
  Obj.make(DemoController, {
    name: props.name ?? 'Demo Controls',
  });

/** Creates a DemoEvent object. */
export const makeEvent = (props: {
  kind: string;
  label: string;
  payload?: unknown;
}): DemoEvent =>
  Obj.make(DemoEvent, {
    kind: props.kind,
    label: props.label,
    emittedAt: new Date().toISOString(),
    payload: props.payload === undefined ? undefined : JSON.stringify(props.payload),
    handled: false,
  });
