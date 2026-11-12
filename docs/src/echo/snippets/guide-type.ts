//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import {
  Annotation,
  type Database,
  DXN,
  JsonSchema,
  Obj,
  Type,
} from '@dxos/echo';

import { Organization, Person } from '../../tutorial/schema.ts';
import { WorksAt } from './works-at.ts';

declare const db: Database.Database;

// #region object
class Project extends Type.makeObject<Project>(
  DXN.make('com.example.type.project', '0.1.0'),
)(
  { name: Schema.String, summary: Schema.optional(Schema.String) },
  Annotation.LabelAnnotation.set(['name']),
) {}
// #endregion object

// #region json-schema
// Out: a JSON Schema document for a form, an agent or another system.
const jsonSchema = JsonSchema.toJsonSchema(Type.getSchema(Organization));

// In: a type built from JSON Schema at runtime.
const Note = Type.makeObjectFromJsonSchema({
  typename: 'com.example.type.note',
  version: '0.1.0',
  jsonSchema: { type: 'object', properties: { title: { type: 'string' } } },
});
// #endregion json-schema

// #region fields
const note = await db.addType(Note);
Type.addFields(note, { pinned: Schema.optional(Schema.Boolean) });
Type.removeFields(note, ['pinned']);
// #endregion fields

// #region inspect
const typename = Type.getTypename(Person); // 'com.example.type.person'
const version = Type.getVersion(Person); // '0.1.0'
const uri = Type.getURI(Person); // 'dxn:com.example.type.person:0.1.0'
const schema = Type.getSchema(Person);
// #endregion inspect

// #region kind
const ada = Obj.make(Person, { name: 'Ada' });

Type.isObject(Person); // true
Type.isRelation(WorksAt); // true
Obj.isObject(ada); // true
Obj.instanceOf(Person, ada); // true
// #endregion kind

export { Project, jsonSchema, schema, typename, uri, version };
