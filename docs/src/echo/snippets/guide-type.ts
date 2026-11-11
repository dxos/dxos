//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';

// #region object
class Person extends Type.makeObject<Person>(
  DXN.make('com.example.type.person', '0.1.0'),
)(
  { name: Schema.String, email: Schema.optional(Schema.String) },
  Annotation.LabelAnnotation.set(['name']),
) {}
// #endregion object

class Company extends Type.makeObject<Company>(
  DXN.make('com.example.type.company', '0.1.0'),
)({
  name: Schema.String,
}) {}

// #region relation
class WorksFor extends Type.makeRelation<WorksFor>(
  DXN.make('com.example.type.worksFor', '0.1.0'),
)({
  source: Person,
  target: Company,
})({ role: Schema.String }) {}
// #endregion relation

// #region fields
const Note = Type.makeObjectFromJsonSchema({
  typename: 'com.example.type.note',
  version: '0.1.0',
  jsonSchema: { type: 'object', properties: { title: { type: 'string' } } },
});

Type.addFields(Note, { pinned: Schema.optional(Schema.Boolean) });
Type.removeFields(Note, ['pinned']);
// #endregion fields

// #region inspect
const typename = Type.getTypename(Person); // 'com.example.type.person'
const version = Type.getVersion(Person); // '0.1.0'
const uri = Type.getURI(Person);
const schema = Type.getSchema(Person);
// #endregion inspect

// #region kind
const ada = Obj.make(Person, { name: 'Ada' });

Type.isObject(Person); // true
Type.isRelation(WorksFor); // true
Obj.isObject(ada); // true
Obj.instanceOf(Person, ada); // true
// #endregion kind

export { schema, typename, uri, version };
