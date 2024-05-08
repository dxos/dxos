---
order: 100
---

# Troubleshooting

### Resetting Storage

You may occasionally need to reset the storage state behind [`HALO`](./halo.md) in case of problems.

::: warning
This procedure clears all storage for all apps using ECHO and HALO on the machine.
:::

* navigate a browser to `halo.dxos.org` (or wherever the [vault](./glossary.md#vault) was configured to be - by default it's `halo.dxos.org`)
* open developer tools in the browser
* go to the `Application` tab developer tools, and locate the Storage node.
* click `Clear site data`
* go back to your app and reload, the storage should be re-created

### Ad Blockers

Ad blockers and other browser extensions may cause problems installing apps.

### `EINVALIDPACKAGENAME` when initializing a new app

This is likely due to an older version of `npm` and/or `node`.
To use `npm init @dxos@latest` node needs to be at `v18` or newer. We recommend using [Node Version Manager](https://github.com/nvm-sh/nvm) or similar to ensure `node >= 18` and `npm >= 9`.
