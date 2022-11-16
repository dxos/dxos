---
position: 2
label: Creating applications
next: ./synchronizing-state
prev: ./
---
# Creating applications

You can use ECHO and HALO with any application framework. DXOS offers a curated set of application project templates which put together some opinions to optimize for high performance local-first applications. Read below about the [list of opinions](#template-opinions) in each template.

### Install the CLI

Only `pnpm` is supported for now.

```bash
pnpm i -g @dxos/cli
```

### Create and start the application

```bash
dx app create myapp
cd myapp
pnpm install
pnpm serve
```

This will start the development server. :clap:

Other available scripts:

```bash
pnpm build # build with tsc
pnpm bundle # production build
pnpm preview # vite preview
pnpm storybook  # run the storybook
```

## Templates

The templates available are all located in the `dxos` repository:
| Name | Description | Location |
| --- | --- | --- |
| `hello` <Badge text="default" type="tip" vertical="middle" /> | Default template with minimal boilerplate | [`packages/apps/templates/hello-template`](https://github.com/dxos/dxos/tree/main/packages/apps/templates/hello-template) |
| `bare` | Same as above but without frills and an empty canvas | [`packages/apps/templates/bare-template`](https://github.com/dxos/dxos/tree/main/packages/apps/templates/bare-template) |

## Opinions in the templates

| Opinion | Rationale |
| --- | --- |
| [`vite`](https://vitejs.dev/) | Chosen for it's crisply fast inner developer loop, pluggability, code-splitting support and other great features. |
| [`vite-plugin-pwa`](https://github.com/vite-pwa/vite-plugin-pwa) | Applications will work offline by default as Progressive Web Apps. |
| [`typescript`]() | Static types make everything better. |
| [`react`]() | Leading front end framework. |
| [`mocha`]() | A cozy test framework which works in browser |
