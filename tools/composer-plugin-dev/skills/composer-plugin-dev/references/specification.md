# `PLUGIN.mdl` specification (in-repo only)

Inside the dxos monorepo, every plugin must have a `PLUGIN.mdl` file written in **MDL** — the spec language defined by `plugin-spec`. Community plugins can adopt this voluntarily but it isn't required.

## The spec is the design document

Do **not** write a separate design doc. The `PLUGIN.mdl` is the source of truth for what the plugin does. It must be:

- **Created first** — before any code.
- **Approved** by the user before implementation.
- **Kept up-to-date** — when features change, update the spec first.
- **Used to derive tests** — `feat`, `req`, and `test` blocks map to acceptance tests.

## Files

- Template: `packages/plugins/plugin-spec/docs/PLUGIN-.template.mdl`.
- Reference: `packages/plugins/plugin-chess/PLUGIN.mdl`.
- Grammar: `packages/plugins/plugin-spec/src/extension/mdl.grammar`.
- Design rationale: `packages/plugins/plugin-spec/docs/DESIGN.md`.

## Minimal shape

```yaml
---
id: org.dxos.plugin.foo
name: FooPlugin
version: 0.1.0
---
```

A short prose description of the plugin.

## Types

```mdl
type Thing
  fields:
    name: string
    notes?: string
```

## Components

```mdl
component FooArticle
  desc: Full-width article for editing a Thing.
```

## Features

```mdl
feat F-1: Manage Things
  req F-1.1: Users can create, rename, and delete Things.
```

## Acceptance

```mdl
test T-1:
  given: a Space with no Things
  when: the user clicks "Add thing"
  then: a new Thing is created with default name
```

## Workflow

For non-trivial plugin work, use `/superpowers:writing-plans` (Subagent-Driven). Once the spec is approved, write the skeleton (see [scaffolding.md](./scaffolding.md)) and add features incrementally — updating the spec each time.

## Community plugins

This file does not apply outside the monorepo. A `SPEC.md` (free-form Markdown) is sometimes useful, but there's no toolchain integration.
