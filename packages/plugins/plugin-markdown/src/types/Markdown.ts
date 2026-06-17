//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AppAnnotation } from '@dxos/app-toolkit';
import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { DescriptionAnnotation, FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Text } from '@dxos/schema';

export const BLUEPRINT_KEY = 'org.dxos.blueprint.markdown';

// Re-export Settings as merged const/type (not as namespace).
import * as SettingsModule from './Settings';
export const Settings = SettingsModule.Settings;
export type Settings = SettingsModule.Settings;

/**
 * Document Item type.
 */
export const Document = Schema.Struct({
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  fallbackName: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
  content: Ref.Ref(Text.Text).pipe(FormInputAnnotation.set(false)),
}).pipe(
  LabelAnnotation.set(['name', 'fallbackName']),
  DescriptionAnnotation.set('description'),
  Annotation.IconAnnotation.set({ icon: 'ph--text-aa--regular', hue: 'indigo' }),
  AppAnnotation.BlueprintsAnnotation.set([BLUEPRINT_KEY]),
  AppAnnotation.GraphPropsAnnotation.set({ managesAutofocus: true }),
  // Enables the history-scrubber companion. NOTE: a Document's text is a referenced Text.Text
  // object, so the Document's own history is metadata-only; full text time-travel through the ref
  // is a follow-up (the timeline/swap would need to target the content object).
  AppAnnotation.TimeTravelAnnotation.set(true),
  Type.makeObject(DXN.make('org.dxos.type.document', '0.1.0')),
);

export type Document = Type.InstanceType<typeof Document>;

/**
 * Document factory.
 */
export const make = ({
  content = '',
  ...props
}: Partial<{ name: string; fallbackName: string; content: string }> = {}) => {
  const doc = Obj.make(Document, { ...props, content: Ref.make(Text.make({ content })) });
  // TODO(dmaretskyi): We need a better way to set parents when creating hierarchies.
  Obj.setParent(doc.content.target!, doc);
  return doc;
};
