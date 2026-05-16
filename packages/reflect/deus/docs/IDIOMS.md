# Idioms

> A named, canonical way of doing one thing in DXOS, demonstrated by real code
> that the build system compiles and tests.

## What an idiom is

An **idiom** is a recurring solution to a problem in the DXOS codebase, given a
short slug and pinned to a single concrete artifact — a storybook story, a
test, a hook, a function, or a type. The artifact _is_ the canonical example;
the idiom is just metadata that names it, explains when to use it, and links it
to related symbols.

Idioms exist because:

- Agents need to find the right pattern by name before reading code.
- Humans need a single place to point to when reviewing a PR ("use the
  `org.dxos.react-ui-menu.toolbarMenu` idiom").
- The codebase needs guard rails against drift — when the canonical artifact
  breaks, the idiom breaks, and CI surfaces it.

### Principles

**Code is ground truth.** An idiom cannot exist without a compiling, exported
artifact that demonstrates it. No prose-only idioms, no aspirational idioms.

**Nothing is an idiom by default.** A storybook story is just a story; a test
is just a test. Only an explicit `@idiom <slug>` tag promotes it.

**JSDoc carries the metadata.** Idioms travel with the code they describe.
No sidecar files, no central registry to keep in sync.

**Distributed authoring, central discovery.** Any package can declare idioms.
A build-time scanner (`moon run introspect:idioms`) harvests them into a single
catalog.

**Slugs are NSIDs.** Every idiom slug must be a well-formed AT Protocol NSID
(see [`@dxos/util.id`](../../../common/util/src/id.ts) and
<https://atproto.com/specs/nsid>). Authority segments are reverse-domain dotted
(`org.dxos.<package>`), the name segment is camelCase. One namespace across
the monorepo.

Examples:
`org.dxos.react-ui-menu.toolbarMenu`,
`org.dxos.echo-react.reactiveQuery`,
`org.dxos.app-framework.capabilityProvider`.

## Tagging

An idiom is declared by adding an `@idiom` JSDoc tag to an exported symbol or a
top-level `test(...)` call.

### Tag shape

```ts
/**
 * <Leading prose — becomes the idiom summary.>
 *
 * @idiom <slug>
 *   applies: <when this pattern fits>
 *   instead-of: <what this replaces> [{@link AntiSymbol}]
 *   uses: {@link SymbolA}, {@link SymbolB}
 *   related: <slug>, <slug>
 */
```

| Field        | Required | Meaning                                                                |
| ------------ | -------- | ---------------------------------------------------------------------- |
| `<slug>`     | yes      | Globally unique [NSID](https://atproto.com/specs/nsid).                |
| `applies`    | yes      | One-line applicability — when to reach for this.                       |
| `instead-of` | no       | Anti-pattern this replaces. Prose plus optional `{@link}`.             |
| `uses`       | no       | Comma-separated `{@link}` references to the key symbols.               |
| `related`    | no       | NSID slugs of related idioms.                                          |

The leading JSDoc paragraph (above the `@idiom` line) is the **summary**: a
two-to-four sentence rationale. If the host symbol's own JSDoc already explains
the pattern well, the leading prose may be empty — the agent will read the
source.

`{@link}` references are standard JSDoc and resolve against the introspect
symbol graph.

### Hosts

The `@idiom` tag is recognized on:

- **Storybook story exports** — `export const X: Story = { … }` in any
  `*.stories.tsx` file. Best for UI patterns.
- **Tests** — top-level `test('…', …)` calls in any `*.test.ts`. Best for
  behavioral patterns (ECHO queries, effect flows, capability wiring). The tag
  goes on a JSDoc immediately preceding the `test(...)` call.
- **Exported symbols** — any `export` declaration: function, class, hook, type,
  schema, constant.

A test or story is _not_ an idiom by default — only the `@idiom` tag makes it
one. There is no implicit promotion based on naming, location, or other
heuristics.

If multiple artifacts demonstrate the same pattern, only one carries the tag —
the most representative. Others should link back via `related:` if useful.

## Examples

### UI pattern (story host)

```tsx
// packages/ui/react-ui-menu/src/Menu.stories.tsx

/**
 * Reactive toolbar driven by an atom-backed actions hook.
 *
 * Defining actions inside a hook lets them subscribe to reactive state
 * (echo, atoms, settings) without re-rendering the toolbar shell. The
 * menu structure is data, not JSX.
 *
 * @idiom org.dxos.react-ui-menu.toolbarMenu
 *   applies: Toolbars whose entries depend on reactive state
 *   instead-of: {@link Toolbar.Root} with hand-wired children
 *   uses: {@link useMenuActions}, {@link Menu.Root}
 *   related: org.dxos.react-ui-menu.menuActions, org.dxos.app-framework.actionGraph
 */
export const ReactiveToolbar: Story = {
  render: () => {
    const actions = useMenuActions(/* ... */);
    return <Menu.Root actions={actions} />;
  },
};
```

### Behavioral pattern (test host)

```ts
// packages/sdk/echo-react/src/use-query.test.tsx

/**
 * Live ECHO query that re-renders the component on insert/update/delete.
 *
 * @idiom org.dxos.echo-react.reactiveQuery
 *   applies: Subscribing to a live ECHO collection from a React component
 *   instead-of: imperatively re-reading the space inside an effect
 *   uses: {@link Query}, {@link useQuery}
 */
test('reactive query updates on insert', ({ expect }) => {
  const tasks = useQuery(space, Query.type(Task));
  // ...assertions that the query reacts...
});
```

### Pure-API pattern (symbol host)

```ts
// packages/sdk/app-framework/src/define-capability.ts

/**
 * @idiom org.dxos.app-framework.capabilityProvider
 *   applies: Exposing a service resolvable by id from elsewhere in the app
 *   uses: {@link contributes}, {@link Capability}
 *   related: org.dxos.app-framework.operationHandler, org.dxos.app-framework.pluginScaffold
 */
export const defineCapability = /* ... */;
```

## Discovery

Idioms are harvested by a build-time scanner:

```bash
moon run introspect:idioms
```

The scanner:

1. Walks the monorepo via the existing ts-morph pipeline used by
   `@dxos/introspect`.
2. Locates JSDoc nodes containing `@idiom` on exported symbols and top-level
   `test(...)` calls.
3. Parses the indented key:value body.
4. Resolves `{@link}` and `uses:` / `instead-of:` references against the
   symbol graph.
5. Captures source location and an excerpt of the host artifact.
6. Emits `packages/reflect/introspect/dist/idioms.json`.

### Validation

The scanner fails (non-zero exit, CI gate) on:

- Duplicate slugs.
- Unresolved `{@link}` references.
- Missing required fields (`applies`).
- A host artifact that does not compile.

Warnings (logged, not fatal):

- An idiom with no `uses:` or `instead-of:` references.
- An idiom whose summary is empty _and_ whose host has no JSDoc body.

## MCP surface

The `@dxos/introspect-mcp` server exposes:

```ts
list_idioms(filter?: { tag?: string })
  → { slug, summary, host: 'story' | 'test' | 'symbol', canonicalSource }[]

get_idiom(slug)
  → {
      slug,
      summary,
      applies,
      insteadOf?,
      uses: SymbolRef[],
      related: string[],
      canonicalSource: {
        kind: 'story' | 'test' | 'symbol',
        file: string,
        line: number,
        excerpt: string,
        storybookUrl?: string,  // when host is a story
      },
    }

find_idioms_by_symbol(ref: SymbolRef)
  → IdiomSummary[]  // idioms that `uses:` this symbol
```

`storybookUrl` is derived from the host file path + export name when the host
is a story; for tests and symbols it is omitted.

## Deus integration

Deus does not own idioms. The language only needs a one-line ext in `Deus.DXOS`
so a `.mdl` document can _reference_ an idiom by slug:

```mdl
ext idiom-ref
  uri: org.dxos.mdl.idiom-ref@1.0
  desc: Reference to an idiom by slug. Resolved via introspect.
  fields:
    slug: Identifier
```

A `PLUGIN.mdl` may then list
`uses-idioms: [org.dxos.react-ui-menu.toolbarMenu, org.dxos.app-framework.capabilityProvider]`
to declare which patterns the plugin builds on. The introspect linter resolves
the slug against the idiom catalog.

## Non-goals

- **Prose-only idioms.** Every idiom binds to a compiling artifact.
- **Idiom versioning.** Idioms move with their host code; semver is not
  introduced. A breaking change to a host is a breaking change to the idiom.
- **Cross-repo idioms.** Idioms only describe patterns in this monorepo.
- **Auto-generation.** No tool will write `@idiom` tags for you. Tagging is an
  explicit editorial act.

## Open questions

- **Idiom deprecation.** When a pattern is superseded, do we keep the old
  `@idiom` and add `@deprecated <reason> {@link new-slug}`, or remove it
  entirely? Leaning: keep + deprecate, so agents reading old code can still
  find the modern replacement.
- **Anti-idiom artifacts.** Should we support a `@anti-idiom <slug>` tag on a
  story or test that demonstrates the broken version side-by-side? Useful for
  rich storybook pages, but adds a second concept. Deferred to v2.
- **Authoring lint rules.** Should we enforce that every public package
  exposes at least one idiom? Probably not — discovery should be organic.
