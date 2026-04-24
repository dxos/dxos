//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { DescriptionAnnotation, FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { Text } from '@dxos/schema';

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
  Type.object({
    typename: 'org.dxos.type.document',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name', 'fallbackName']),
  DescriptionAnnotation.set('description'),
  Annotation.IconAnnotation.set({
    icon: 'ph--text-aa--regular',
    hue: 'indigo',
  }),
);

export type Document = Schema.Schema.Type<typeof Document>;

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
