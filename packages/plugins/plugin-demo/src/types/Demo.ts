//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Trello } from '@dxos/plugin-trello/types';

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

/**
 * Edge object linking a Granola meeting note to a Trello card with a confidence
 * level and one-sentence explanation. Written by the demo panel's aiMatch
 * pipeline; rendered as a pill on the card and in the demo panel log.
 */
export const DemoMatch = Schema.Struct({
  document: Ref.Ref(Markdown.Document).pipe(FormInputAnnotation.set(false)),
  card: Ref.Ref(Trello.TrelloCard).pipe(FormInputAnnotation.set(false)),
  /** 'high' | 'medium' | 'low'. */
  confidence: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** One-sentence LLM (or heuristic) explanation for the match. */
  reasoning: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** ISO timestamp when the match was computed. */
  createdAt: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** 'ai' | 'heuristic' — which path produced this match. */
  source: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.demoMatch',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['reasoning']),
  Annotation.IconAnnotation.set({
    icon: 'ph--link--regular',
    hue: 'cyan',
  }),
);

export interface DemoMatch extends Schema.Schema.Type<typeof DemoMatch> {}

/**
 * A proactive message the agent would send to Slack in response to an external
 * signal (e.g. a GitHub PR merge that touches a card discussed in a recent
 * meeting). For offline demos we just write the nudge to ECHO and render it in
 * the demo panel as a Slack-styled preview; when a real bot token is
 * configured the same content is also posted to a real Slack channel.
 */
export const DemoNudge = Schema.Struct({
  /** Slack channel name (without '#'). */
  channel: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** Mentioned handle (without '@'). */
  mention: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Message body (markdown-ish). */
  text: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** Trello card the nudge is about. */
  card: Schema.optional(Ref.Ref(Trello.TrelloCard).pipe(FormInputAnnotation.set(false))),
  /** ISO timestamp when the nudge was emitted. */
  emittedAt: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** Did we post this to a real Slack workspace, or is it preview-only? */
  posted: Schema.optional(Schema.Boolean.pipe(FormInputAnnotation.set(false))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.demoNudge',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['text']),
  Annotation.IconAnnotation.set({
    icon: 'ph--chat-circle-text--regular',
    hue: 'cyan',
  }),
);

export interface DemoNudge extends Schema.Schema.Type<typeof DemoNudge> {}

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
