---
title: 'ECHO: the API'
layout: 'two-cols'
class: 'studio-code-compact'
---

# One schema, one API

- One schema gives the type, validation, the form and the agent's tool.
- Queries compile to SQL against a local index.
- The same engine runs in the browser, in Node and in a Durable Object.
- Merge is per object.

::right::

```ts
class Person extends Type.makeObject<Person>(
  // URI and version.
  DXN.make('com.example.type.person', '0.1.0'),
)(
  Schema.Struct({
    name: Schema.String,
    org: Schema.optional(Ref.Ref(Organization)),
  }),
) {}

const alice = db.add(Obj.make(Person, { name: 'Alice'}));
const bob = db.add(Obj.make(Person, { name: 'Bob' }));

const [acme] = await db.query(Filter.text('Acme')).run();

// Graph traversal: Alice's managers.
const objects = await db.query(
  Query.select(
    Filter.entity(alice)).sourceOf(HasManager).target()
  ).run();

// Reactive updates.
Obj.update(alice, (obj) => {
  obj.org = Ref.make(acme);
});

// Typed relations.
db.add(Relation.make(HasManager, {
  [Relation.Source]: alice, [Relation.Target]: bob,
}));
```
