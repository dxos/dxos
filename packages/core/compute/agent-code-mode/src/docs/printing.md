# Printing

`print` is how you see anything. Print an object itself — never `JSON.stringify` it, which shows raw
references and none of what is around the object.

## An object prints as a card

```js
const [task] = yield* Database.query(Filter.type(Task, { title: 'Write' })).run;
yield* print(task);
```

```
com.example.type.task 01J… "Write"
  title: "Write"
  status: "open"
  owner: → com.example.type.person 01J… "Ada"
  parent: → com.example.type.project 01J… "Launch"
  relations: in: assigned ×1
  referenced by: project.tasks ×1
  fetch:
    yield* Database.query(Query.select(Filter.id('01J…')).targetOf('dxn:com.example.relation.assigned:0.1.0')).run  // 1 in assigned
    yield* Database.query(Query.select(Filter.id('01J…')).referencedBy('dxn:com.example.type.project:0.1.0', 'tasks')).run  // 1 project.tasks
```

- The first line is the typename, the id and the label.
- Fields follow the type's schema. A field the schema hides is listed under `hidden fields` unless it
  holds references, which are always shown; an unset optional field is left out.
- A reference prints as `→ typename id "label"`; a list of references to one type as
  `→ typename ×N [id "label", …]`. Load one with `yield* Database.load(task.owner)`.
- A string longer than 200 characters ends in `…[+N chars]`; a list longer than 10 items ends in
  `… N more`. Print the field itself (`yield* print(task.notes)`) to read all of it.
- `relations`, `children` and `referenced by` count what points at the object or away from it, by
  type. These are not fields: printing the object is the only way to learn they exist. Only the
  first 25 are counted; a count ending in `+` means there are more — run its `fetch` line.
- `fetch` gives the exact code that returns each group. Paste it; append `.target()` or `.source()`
  inside the query to move from the relations to the objects at their other end.
- `skills for this type` names the skills that work with objects of this type. One marked
  `not enabled in this conversation` has operations you do not have yet; enable it to get them.

A list of objects prints one card per object, without the counts; print an object on its own to get
them.

## Everything else prints as JSON

Effect values print by their real fields:

| Value                    | Prints as                                    |
| ------------------------ | -------------------------------------------- |
| `Effect.result` success  | `{ "_tag": "Success", "success": … }`        |
| `Effect.result` failure  | `{ "_tag": "Failure", "failure": … }`        |
| `Effect.exit` success    | `{ "_tag": "Success", "value": … }`          |
| `Effect.exit` failure    | `{ "_tag": "Failure", "cause": "…" }`        |
| An `Option` (`.first`)   | `{ "_tag": "Some", "value": … }` / `None`    |
| An error                 | `{ "error": "<tag or name>", "message": … }` |
