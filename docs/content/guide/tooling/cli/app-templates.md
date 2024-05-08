---
description: DXOS Application templates
label: Templates
order: 2
---

# Application Templates

DXOS provides turnkey application templates complete with all the essentials for local application development.

To create a new DXOS project:

```bash
npm init @dxos@latest
# or
npm init @dxos/bare@latest
```

::: note
If you encounter an error with `EINVALIDPACKAGENAME` it's likely the npm/node versions are out of date. Ensure `node -v` is 18 or higher and `npm -v` is 9 or higher.
:::

These can also be used from the `dx` CLI:

```bash
dx app create <project-name>
# or
dx app create --template bare <project-name>
```

## `hello` template

This is the default template when using `npm init @dxos@latest` or `dx app create`. It inherits everything from the `bare` template and adds a single-page welcome guide which is easy to delete.

## `bare` template

This template provides some opinions for app development:

| Feature                  | Description                                                                |
| :----------------------- | :------------------------------------------------------------------------- |
| `vite`                   | A fast developer loop based on esbuild.                                    |
| `typescript`             | Type safety                                                                |
| `vite-pwa`               | Turnkey [PWA](../../glossary.md#PWA) configuration provided by `vite-plugin-pwa` |
| `tailwind`               | A productive CSS framework                                                 |
| `phosphor-icons`         | A solid icons library                                                      |
| `@dxos/client`           | ECHO, HALO, KUBE configuration support                                     |
| `@dxos/react-components` | UI components for React                                                    |
| `@dxos/react-shell`      | UI flows for managing HALO identity and ECHO spaces                        |

## `tasks` template

This is a basic tasks app template. Try out the [Tasks app hosted on dxos.org](https://tasks.dxos.org).

```bash
npm init @dxos/tasks@latest
# or
dx app create --template tasks <project-name>
```

Tasks includes the sharing panels for inviting other collaborators into the task list.

## Turn features on or off

Invoking the template with `--interactive` like below will ask about enabling each feature one at a time.

```bash
npm init @dxos@latest --interactive # or
dx app create <appname> --interactive
```

Example turning off PWA features:

```bash
dx app create example --interactive
Creating app...
? Include react: Yes
? Include the DXOS UI system for react: Yes
? Include a Storybook component sandbox (https://storybook.js.org): Yes
? Enable PWA support: No

Application example created.

Run the app:
$ cd example
$ pnpm install
$ pnpm serve

See also:
- example/README.md
- https://docs.dxos.org/guide/cli/app-templates
```

## Source code

The templates can be found in the main [`dxos` repo](https://github.com/dxos/dxos) under [`packages/apps/templates`](https://github.com/dxos/dxos/tree/main/packages/apps/templates).
