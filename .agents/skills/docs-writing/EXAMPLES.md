# Before and after

One rewritten passage for each of four page templates, with the rules from [`SKILL.md`](SKILL.md) that each one uses. The
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
A query selects entities from one or more sources and keeps its results current as the data changes. Your app reads
data the same way whether it was written here or by another peer.

## Model

In a client-server app, you fetch a list, and you fetch it again when you think it has changed. With ECHO, you
describe the entities you want once, and the results follow the data.

You build that description from two parts:

- A **filter** is a predicate. It says which entities match, by type, field values, text or time.
- A **query** is the shape around filters. It says which entities to start from, which references or relations to
  follow, and how to order, limit and group the results.

**Example** (Building a filter and two queries)

<Snippet file='concept-queries' region='shape' />

`employers` follows each Ada's `employer` reference forwards. `staff` follows the same field backwards, from Acme to
the people who point at it, so the query never loads a person to check where they work.

[Querying](/docs/echo/learn/querying/) builds queries like these for the tutorial app.
```

What changed:

- The opening was a definition and a consequence joined by "so". It is now two sentences, and the second has the
  reader in it (rules 1 and 2). No connective joins them, because the order already says which follows from which
  (rule 9).
- Model starts from a fetch and a refetch, which the reader has written. This is the page's one foothold (rule 3).
- Two definitions joined by colons became two parallel bullets, each with its term as subject (rules 7 and 8).
- The sample has a label. The sentences after it start from two names in the code and say what the sample's comments
  do not: that the two queries walk one field in opposite directions, and what that saves (rule 5).
- The link's text is the target page's title (rule 12).

### A sample whose comments say enough

Later on the same page:

```mdx
A query reads from **sources**, which you choose with `Scope`: this space, the code-shipped registry of types, or a
[feed](/docs/echo/concepts/feeds/). By default, without `from`, a query reads the database it runs on.

**Example** (Reading types from two sources)

<Snippet file='concept-queries' region='scope' />

## Behavior
```

The snippet carries the comment "Every type this space stores, and every type registered in code." That is the idea,
so no sentence follows the sample (rule 5).

### A behavior bullet keeps its citation

Before:

```mdx
- A local write shows in the results, and reaches subscribers, before the writing call returns.
  <SpecCite item='org.dxos.echo.query#F-2.1' />
- A page read with `skip` is cut by the source that answers it. Local writes can drop entries from the page, but they
  do not re-page it. <SpecCite item="org.dxos.echo.query#F-9.2" />
```

After:

```mdx
- When you write locally, the write shows in the results, and reaches subscribers, before the writing call returns.
  <SpecCite item='org.dxos.echo.query#F-2.1' />
- If you page with `skip`, the source that answers decides which rows are on the page. A local write can remove a row
  from your page, but it never pulls the next row in. <SpecCite item="org.dxos.echo.query#F-9.2" />
```

Each guarantee is as strong as it was. The first moved its subject to the reader. The second traded the spec's words,
"cut" and "re-page", for what the reader sees happen to their page. A bullet whose subject is the system, such as "A
live query never ends", stays as it is.

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

And two steps. Before:

```mdx
1. **Declare an organization.** `Type.makeObject` takes the name and the schema, and returns a class that is both the
   schema and the TypeScript type of its instances.

   <Snippet file='echo-tutorial/schema' region='organization' />

   `Format.URL` marks the website as a URL, so a form offers a URL field for it. `IconAnnotation` gives the type an icon
   and a hue, which the app's list and graph use.

2. **Point a person at an organization.** `employer` is a reference to an `Organization`.

   <Snippet file='echo-tutorial/schema' region='person' />
```

After:

```mdx
1. **Declare an organization.** `Type.makeObject` takes the name and the schema. It returns a class that is both the
   schema and the TypeScript type of its instances.

   <Snippet file='echo-tutorial/schema' region='organization' />

   `Format.URL` marks the website as a URL, so a form offers a URL field for it. `IconAnnotation` gives the type an
   icon and a hue, which the app's list and graph use.

2. **Point a person at an organization.** `employer` is a reference to an `Organization`.

   <Snippet file='echo-tutorial/schema' region='person' />
```

What changed:

- Background starts from a TypeScript interface (rule 3).
- "We" builds the app (rule 10). The passive "are built" got an actor.
- Step 1 keeps its bold instruction and takes no `**Example**` label. The sentences after its sample are for the two
  lines a reader would not guess the purpose of.
- Step 2 ends on its sample. Its lead already said the one thing the sample shows (rule 5).

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

`withoutAda` holds every person except the ones named Ada. Both functions take queries, so each argument can have
steps of its own.
```

Three more explanations from the same page, each after its own sample:

```mdx
`staff` and `workers` both reach the people at Acme. `staff` gets there through a reference field on `Person`, and
`workers` through `WorksAt` relations, which can carry fields of their own.
```

```mdx
`Order.updated` only decides between people with the same name, because orders apply in turn.
```

```mdx
`count` is a field of the one record the query returns. The name comes from the key you pass to `aggregate`.
```

What changed:

- Each member has what it does and when to use it (rule 6). Each "what" says more than the member's name.
- Each explanation starts from a different name in its sample, so no two open alike. Each one gives a consequence or
  a reason, which the code cannot say for itself (rule 5).
- The Members at a glance table and the Related list did not change.

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

The list of members became parallel bullets (rule 7), and the citation stayed on the sentence it cites.

## Component: `tile/api/button.mdx`

Before:

```mdx
<Snippet file='tile-components' region='buttons' lang='tsx' />

## `Button.Toggle`

A button that stays pressed. It takes `Button.Root`'s props, plus `pressed`, `defaultPressed` and `onPressedChange`,
and `activeIcon` for the icon while pressed.

## `Button.Group`

Buttons in a row with shared spacing. `justify` is `'start'`, `'end'` or `'between'`. `fill` shares the width equally,
so a lone button stretches across the group. `compact` removes the gap, for a run of icon-only buttons.
```

After:

```mdx
A button is a control the user presses to act. `Button` has parts for a toggle, a group and a button that opens a menu.

<Snippet file='tile-components' region='buttons' lang='tsx' />

## `Button.Toggle`

`Button.Toggle` is a button that stays pressed. It takes the props of `Button.Root`, plus `pressed`, `defaultPressed`
and `onPressedChange`. Use `activeIcon` to show a different icon while the button is pressed.

## `Button.Group`

`Button.Group` puts buttons in a row with shared spacing.

- `justify` is `'start'`, `'end'` or `'between'`.
- `fill` shares the width equally, so a lone button stretches across the group.
- `compact` removes the gap. Use `compact` to pack a run of icon-only buttons.
```

What changed:

- The page opens with one sentence that says what a button is, with the common noun as its subject (rule 1).
- A fragment under each heading became a sentence with the part as its subject.
- The props became parallel bullets (rule 7), and a prop gets "Use `prop` to" (rule 6).
- The prop table's rows and columns, the import line and the opening sample did not change. A component page is
  mostly a table, so a rewrite of one is small.

### A table cell

Before:

```mdx
| `Accordion.Item` | One section; a `disabled` item keeps its place |
| `size` | 1 to 5; defaults to `3` |
| `disabled` | boolean | Disable every control |
```

After:

```mdx
| `Accordion.Item` | One section. A `disabled` item keeps its place |
| `size` | 1 to 5. `3` by default |
| `disabled` | `boolean` | Disables every control |
```

Two facts became two sentences, the default moved to the end of its cell, the type went into code font, and the
effect starts with a verb in the third person.
