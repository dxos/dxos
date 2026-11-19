# Before and after

One rewritten passage for each page template, with the rules from [`SKILL.md`](SKILL.md) that each one uses. The
full pages are the ones named in each heading.

## Concept: `echo/concepts/queries.mdx`

Before:

```mdx
A query selects entities from one or more sources and keeps its results current as the data changes, so an app reads
data the same way whether it was written here or by another peer.

## Model

A **filter** is a predicate: it says which entities match, by type, field values, text or time. A **query** is the shape
around filters: which entities to start from, which references or relations to follow, and how to order, limit and
group the results. [Learn to query](/docs/echo/learn/querying/) builds queries for the contacts app.

<Snippet file='concept-queries' region='shape' />
```

After:

```mdx
A query selects entities from one or more sources and keeps its results current as the data changes. This means your
app reads data the same way whether it was written here or by another peer.

## Model

In a client-server app, you fetch a list, and you fetch it again when you think it has changed. With ECHO, you
describe the entities you want once, and the results follow the data.

You build that description from two parts:

- A **filter** is a predicate. It says which entities match, by type, field values, text or time.
- A **query** is the shape around filters. It says which entities to start from, which references or relations to
  follow, and how to order, limit and group the results.

**Example** (Building a filter and two queries)

<Snippet file='concept-queries' region='shape' />

In this example, `adas` is a filter that matches every person named Ada. `employers` selects those people and follows
each one's `employer` reference. `staff` goes the other way. It starts from Acme, follows `employer` backwards to the
people who point at it, orders them by name and keeps the first 20.

[Learn to query](/docs/echo/learn/querying/) builds queries like these for the contacts app.
```

What changed:

- The opening sentence was a definition and a consequence joined by "so". It is now two sentences, and the second
  speaks to the reader (rules 1 and 2).
- Model starts from a fetch and a refetch, which the reader has written (rule 3).
- Two definitions joined by colons became two parallel bullets (rules 7 and 8).
- The sample has a label, and the paragraph after it walks through its three names (rule 5). Every name in that
  paragraph comes from the snippet's source.

### A behavior bullet keeps its citation

Before:

```mdx
- A local write shows in the results, and reaches subscribers, before the writing call returns.
  <SpecCite item='org.dxos.echo.query#F-2.1' />
- A query without an order returns entities by id. <SpecCite item="org.dxos.echo.query#F-2.4" />
```

After:

```mdx
- When you write locally, the write shows in the results, and reaches subscribers, before the writing call returns.
  <SpecCite item='org.dxos.echo.query#F-2.1' />
- If you give a query no order, it returns entities by id. <SpecCite item="org.dxos.echo.query#F-2.4" />
```

The guarantee is word for word what it was. Only its subject moved to the reader. A bullet whose subject is the
system, such as "A live query never ends", stays as it is.

## Tutorial: `echo/learn/defining-types.mdx`

Before:

```mdx
## Background

A type is a schema with a name. ECHO uses the schema three ways:

- The compiler uses it to check the fields of every object you create.
- ECHO uses it to check what it stores, and to send the type to peers that have not seen it.
- Code can read it at run time. The app's forms, table and graph are built from the schemas rather than written per type.
```

After:

```mdx
## Background

In TypeScript, an interface tells the compiler what an object looks like, and then it is gone when the app runs. An
ECHO type is a schema with a name, and it is still there at run time. ECHO uses the schema three ways:

- The compiler uses it to check the fields of every object you create.
- ECHO uses it to check what it stores, and to send the type to peers that have not seen it.
- Your code can read it at run time. We build the app's forms, table and graph from the schemas, so we write none of
  them per type.
```

And a step. Before:

```mdx
6. **Follow a reference.** `peek` reads the target, if it is loaded, without waiting. The list shows each person's
   employer beside their name with this, in `Contacts.tsx`:
```

After:

```mdx
6. **Follow a reference.** `peek` reads the target without waiting, if the target is loaded. In `Contacts.tsx`, the
   list uses it to show each person's employer beside their name:
```

What changed:

- Background starts from a TypeScript interface (rule 3).
- "We" builds the app (rule 10). The passive "are built" got an actor.
- The step keeps its bold instruction and takes no `**Example**` label (rule 5). Its second sentence now ends at the
  thing the sample shows.

## Namespace: `echo/api/query.mdx`

Before:

```mdx
## Combine queries

`Query.all` is the union of several queries. `Query.without` removes the results of one query from another.

<Snippet file='guide-query' region='combine' />
```

After:

```mdx
## Combine queries

`Query.all` returns the union of several queries. Use it when one list shows more than one kind of thing.

`Query.without` removes the results of one query from another. Use it when you want everything except one set.

**Example** (Taking a union and a difference)

<Snippet file='guide-query' region='combine' />

Here, `peopleOrOrgs` holds every person and every organization, and `withoutAda` holds every person except the ones
named Ada.
```

A sentence that packed five members and a semicolon. Before:

```mdx
`orderBy` takes one or more orders, applied in turn. <SpecCite item="org.dxos.echo#F-5.3" /> `Order.property` sorts by a
field; `Order.created` and `Order.updated` sort by timestamp; `Order.natural` keeps insertion order.
```

After:

```mdx
`orderBy` takes one or more orders and applies them in turn. <SpecCite item="org.dxos.echo#F-5.3" />

- `Order.property` sorts by a field.
- `Order.created` and `Order.updated` sort by timestamp.
- `Order.natural` keeps insertion order.
```

What changed:

- Each member has what it does and when to use it (rule 6). The "use when" says only what the member is plainly for.
  When the page, the sample and the spec give you nothing to say there, leave it out.
- The list of members became parallel bullets (rule 7), and the citation stayed on the sentence it cites.
- The Members at a glance table and the Related list did not change.

## Reference: `tile/api/button.mdx`

Before:

```mdx
## `Button.Toggle`

A button that stays pressed. It takes `Button.Root`'s props, plus `pressed`, `defaultPressed` and `onPressedChange`,
and `activeIcon` for the icon while pressed.

## `Button.Group`

Buttons in a row with shared spacing. `justify` is `'start'`, `'end'` or `'between'`. `fill` shares the width equally,
so a lone button stretches across the group. `compact` removes the gap, for a run of icon-only buttons.
```

After:

```mdx
## `Button.Toggle`

`Button.Toggle` is a button that stays pressed. It takes `Button.Root`'s props, plus `pressed`, `defaultPressed` and
`onPressedChange`. Use `activeIcon` to show a different icon while the button is pressed.

## `Button.Group`

`Button.Group` puts buttons in a row with shared spacing.

- `justify` is `'start'`, `'end'` or `'between'`.
- `fill` shares the width equally, so a lone button stretches across the group.
- `compact` removes the gap. Use it for a run of icon-only buttons.
```

What changed:

- A fragment under each heading became a sentence with the part as its subject (rule 1).
- The props became parallel bullets (rule 7).
- The prop table, the import line and the opening sample did not change. A component page is mostly a table, so a
  rewrite of one is small.
