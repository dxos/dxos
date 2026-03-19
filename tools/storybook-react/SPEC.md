# Storybook

Best practices for writing storybook stories in the DXOS monorepo.

## Story Approaches

There are three approaches to writing stories, listed here from simplest to most complex.

### 1. No Client (Pure UI Components)

The simplest and ideally most common approach. Use this for components that take props and render UI without needing a DXOS client, identity, or ECHO data. Just pass in-memory data directly.

```typescript
import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

const meta = {
  title: 'ui/react-ui-foo/Foo',
  component: Foo,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof Foo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [{ id: '1', title: 'Test' }],
  },
};
```

### 2. Client Provider (Components with ECHO Data)

Use `withClientProvider` for primitive components that need ECHO data but not the full plugin framework. This creates a client, identity, and optionally a space.

```typescript
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

const meta = {
  title: 'ui/react-ui-foo/Foo',
  component: Foo,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withClientProvider({
      types: [Bar.Bar],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        space.db.add(Bar.make({ name: 'Test' }));
      },
    }),
  ],
} satisfies Meta<typeof Foo>;
```

### 3. Plugin Manager (Containers and Surfaces)

Use `withPluginManager` for stories that test **containers**, **plugin surfaces**, or anything that needs capabilities, operations, or the full plugin lifecycle. This is the most realistic environment.

```typescript
import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';

const meta = {
  title: 'plugins/plugin-foo/containers/FooArticle',
  render: FooStory,
  decorators: [
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Foo.Foo, Bar.Bar],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              defaultSpace.db.add(Foo.make({ title: 'Test' }));
            }),
        }),
        StorybookPlugin({}),
        FooPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof FooStory>;
```

#### `corePlugins()`

`corePlugins()` from `@dxos/plugin-testing` returns a standard set of plugins for storybook environments:

- `AttentionPlugin()`
- `GraphPlugin()`
- `OperationPlugin()` — required for testing operation invocation.
- `RuntimePlugin()`
- `SettingsPlugin()`
- `ThemePlugin({ tx: defaultTx })`

Include `corePlugins()` whenever you need to test operation invocation, attention, graph capabilities, or theming through the plugin system.

It does **not** include `SpacePlugin` (to avoid circular dependencies). Import `SpacePlugin` directly in stories that need it.

#### Prefer Plugins Over Decorators

When using `withPluginManager`, prefer plugins over standalone decorators. The plugin system provides these capabilities through `corePlugins()`:

| Decorator | Plugin Equivalent | Provided by `corePlugins()` |
|---|---|---|
| `withTheme()` | `ThemePlugin()` | Yes |
| `withAttention()` | `AttentionPlugin()` | Yes |
| `withLayout()` | `StorybookPlugin({})` | No (add separately) |
| `withClientProvider()` | `ClientPlugin({...})` | No (add separately) |

**Do not mix plugins with their decorator equivalents.** For example, do not use `withTheme()` alongside `corePlugins()` (which already includes `ThemePlugin`). Do not use `withClientProvider()` alongside `ClientPlugin()`.

**Correct:**
```typescript
decorators: [
  withPluginManager({
    plugins: [
      ...corePlugins(),       // includes ThemePlugin, AttentionPlugin, etc.
      ClientPlugin({...}),     // replaces withClientProvider
      StorybookPlugin({}),     // provides layout
      MyPlugin(),
    ],
  }),
],
```

**Incorrect:**
```typescript
decorators: [
  withTheme(),                 // redundant — corePlugins includes ThemePlugin
  withLayout({ layout: 'fullscreen' }),  // redundant — StorybookPlugin provides layout
  withAttention(),             // redundant — corePlugins includes AttentionPlugin
  withPluginManager({
    plugins: [
      ...corePlugins(),
      ClientPlugin({...}),
      StorybookPlugin({}),
    ],
  }),
],
```

#### Client Initialization

Use `initializeIdentity` from `@dxos/plugin-client/testing` to set up identity and default space:

```typescript
import { initializeIdentity } from '@dxos/plugin-client/testing';

ClientPlugin({
  types: [Foo.Foo],
  onClientInitialized: ({ client }) =>
    Effect.gen(function* () {
      const { identity, defaultSpace } = yield* initializeIdentity(client);
      defaultSpace.db.add(Foo.make({ title: 'Test' }));
    }),
}),
```

This replaces the boilerplate:
```typescript
yield* Effect.promise(() => client.halo.createIdentity());
yield* Effect.promise(() => client.spaces.waitUntilReady());
yield* Effect.promise(() => client.spaces.default.waitUntilReady());
```

## Story Structure

### Meta Definition

```typescript
const meta = {
  title: 'plugins/plugin-foo/containers/FooArticle',
  component: FooComponent,     // optional — use render instead for custom wrappers
  render: DefaultStory,        // optional — use for stories that need hooks or state
  decorators: [...],
  parameters: {
    layout: 'fullscreen',      // 'fullscreen' | 'centered' | 'column'
    translations: [...],       // if the component uses i18n
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

### Title Convention

Follow the directory structure:
- Plugins: `plugins/plugin-foo/containers/FooArticle` or `plugins/plugin-foo/components/FooBar`
- UI packages: `ui/react-ui-foo/FooComponent`

### Story Variants

Define variants as additional named exports. Override decorators at the story level when a variant needs different setup:

```typescript
export const Default: Story = {};

export const WithData: Story = {
  decorators: [
    withPluginManager({
      plugins: [...corePlugins(), ClientPlugin({...}), StorybookPlugin({})],
    }),
  ],
};
```

## Data Creation

### Simple: Direct `db.add`

```typescript
onClientInitialized: ({ client }) =>
  Effect.gen(function* () {
    const { defaultSpace } = yield* initializeIdentity(client);
    defaultSpace.db.add(Foo.make({ title: 'Test' }));
  }),
```

### Medium: Object Factory

Use `createObjectFactory` from `@dxos/schema/testing` for bulk data:

```typescript
import { createObjectFactory } from '@dxos/schema/testing';
import { faker } from '@dxos/random';

const factory = createObjectFactory(space.db, faker);
yield* Effect.promise(() =>
  factory([
    { type: Person.Person, count: 20 },
    { type: Organization.Organization, count: 10 },
  ]),
);
```

### Seed Faker

Seed faker for reproducible test data:

```typescript
faker.seed(0);
```

## Checklist

- [ ] Story title matches plugin and component name.
- [ ] Uses the simplest approach that works (no client > client decorator > plugin manager).
- [ ] Does not mix decorator and plugin equivalents.
- [ ] Includes `corePlugins()` when using `withPluginManager`.
- [ ] Registers ECHO types via `ClientPlugin({ types: [...] })`.
- [ ] Uses `initializeIdentity` instead of manual createIdentity/waitUntilReady.
- [ ] Seeds faker for reproducible data.
- [ ] Uses `satisfies Meta<typeof ...>` for type safety.
