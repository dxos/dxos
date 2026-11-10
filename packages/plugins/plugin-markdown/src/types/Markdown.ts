//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as Skill from '@dxos/compute/Skill';
import { Annotation, Collection, DXN, Format, Obj, Ref, Type } from '@dxos/echo';
import { CardAnnotation, Text } from '@dxos/schema';
import { History } from '@dxos/versioning';

export const SKILL_KEY = 'org.dxos.skill.markdown';

// Re-export Settings as merged const/type (not as namespace).
import * as SettingsModule from './Settings.ts';

export const Settings = SettingsModule.Settings;
export type Settings = SettingsModule.Settings;

/**
 * Document Item type.
 */
export class Document extends Type.makeObject<Document>(DXN.make('org.dxos.type.document', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Markdown), Schema.optional),
    fallbackName: Schema.String.pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
    /** Owned body: `SetParent` cascades it with the document. */
    content: Ref.Ref(Text.Text).pipe(Annotation.SetParent.set(), Annotation.FormInputAnnotation.set(false)),
    history: History.History.pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
  }).pipe(
    Annotation.LabelAnnotation.set(['name', 'fallbackName']),
    Annotation.DescriptionAnnotation.set('description'),
    Annotation.IconAnnotation.set({ icon: 'ph--text-aa--regular', hue: 'indigo' }),
    Skill.SkillsAnnotation.set([SKILL_KEY]),
    AppAnnotation.GraphPropsAnnotation.set({ managesAutofocus: true }),
    CardAnnotation.set(true),
    Annotation.UserType.set({ tags: [Collection.ItemTag] }),
  ),
) {}

/**
 * Document factory.
 *
 * The history struct is created with the document, not on first use: `ensureHistory` would create it by assignment,
 * and two writers that both see no history (two invocations, or two peers, adding the first checkpoint or branch)
 * would each assign their own struct to the same key, so one entry is lost. Created here, every later entry is an
 * insert into a list, which merges.
 */
export const make = ({
  content = '',
  ...props
}: Partial<{ name: string; fallbackName: string; content: string }> = {}) => {
  return Obj.make(Document, {
    ...props,
    content: Ref.make(Text.make({ content })),
    history: { branches: [], versions: [] },
  });
};
