# DXOS Documentation Site

This site is based on `vuepress`.

To start the app:

```sh
pnpm nx serve docs # dxos monorepo
# pnpm serve if it were a standalone package
```

Docs are written as markdown files in the `docs` folder of this app.

Generated API docs are derived by first generating a json file using typedoc
```sh
pnpm nx typedoc docs
```

Then by templating that file into markdown in the `docs/api` folder
```sh
pnpm nx plate docs
```

In case you want to remove the `docs/api` folder
```sh
pnpm nx clean:plate docs
```

The `@dxos/plate` template that generates the api docs is found in `src/templates/api`
