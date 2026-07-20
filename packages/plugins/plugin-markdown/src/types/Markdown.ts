//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AppAnnotation } from '@dxos/app-toolkit';
import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { DescriptionAnnotation, FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { CardAnnotation, CollectionItemAnnotation, Text } from '@dxos/schema';
import { History } from '@dxos/versioning';

export const SKILL_KEY = 'org.dxos.skill.markdown';

// Re-export Settings as merged const/type (not as namespace).
import * as SettingsModule from './Settings';

export const Settings = SettingsModule.Settings;
export type Settings = SettingsModule.Settings;

/**
 * Document Item type.
 */
export class Document extends Type.makeObject<Document>(DXN.make('org.dxos.type.document', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    fallbackName: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
    content: Ref.Ref(Text.Text).pipe(FormInputAnnotation.set(false)),
    history: History.History.pipe(FormInputAnnotation.set(false), Schema.optional),
  }).pipe(
    LabelAnnotation.set(['name', 'fallbackName']),
    DescriptionAnnotation.set('description'),
    Annotation.IconAnnotation.set({ icon: 'ph--text-aa--regular', hue: 'indigo' }),
    AppAnnotation.SkillsAnnotation.set([SKILL_KEY]),
    AppAnnotation.GraphPropsAnnotation.set({ managesAutofocus: true }),
    CardAnnotation.set(true),
    CollectionItemAnnotation.set(true),
  ),
) {}

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
