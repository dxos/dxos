//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';

import { Event } from '../../echo-tutorial/schema.ts';

// #region schema
class Project extends Type.makeObject<Project>(
  DXN.make('com.example.type.project', '0.1.0'),
)(
  Schema.Struct({
    name: Schema.String,
    summary: Schema.optional(Schema.String),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({
      icon: 'ph--kanban--regular',
      hue: 'indigo',
    }),
    Annotation.DescriptionAnnotation.set('summary'),
  ),
) {}
// #endregion schema

// #region read
const icon = Annotation.IconAnnotation.get(Type.getSchema(Event));
Option.getOrUndefined(icon); // { icon: 'ph--calendar-dots--regular', hue: 'green' }

const roadmap = Obj.make(Project, {
  name: 'Roadmap',
  summary: 'What ships next',
});
Obj.getLabel(roadmap); // 'Roadmap'
Obj.getDescription(roadmap); // 'What ships next'
// #endregion read

// #region custom
const ColorAnnotation = Annotation.make({
  id: 'com.example.annotation.color',
  schema: Schema.String,
});

// On an instance: stored in the object's metadata, and replicated with it.
Obj.update(roadmap, (roadmap) => {
  Annotation.set(roadmap, ColorAnnotation, 'teal');
});
const color = Annotation.get(roadmap, ColorAnnotation); // Some('teal')
// #endregion custom

export { color };
