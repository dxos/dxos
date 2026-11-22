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

const alice = db.add(Obj.make(Person, { name: 'Alice' }));

const [acme] = db.find('Acme');

// Reactive updates.
Obj.update(alice, (obj) => {
  obj.org = Ref.make(acme);
});

    // Graph traversal.    
await db
  .query(
    Query.select(Filter.id(alice)).sourceOf(HasManager).target(),
  )
  .run();
```

<!--
Notes. 1:00
- The code: define a type with a reference to an Organization, add an object, set the reference, traverse a relation.
- One schema, four uses: the TypeScript type, validation on every write, the form in the UI, and the tool an agent gets.
- Queries compile to SQL against a local index. The same engine runs in the browser, in Node and in a Durable Object.
- Merge is per object. There are no transactions across objects; [what we do for references and uniqueness].
- We build on Automerge with Ink & Switch. [What in the sync engine is ours and what is theirs.]
-->
