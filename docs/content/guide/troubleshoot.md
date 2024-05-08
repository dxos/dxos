---
order: 100
---

# Troubleshooting

### Resetting Storage

You may occasionally need to reset the storage state behind [`HALO`](./halo/) in case of problems.

::: warning
If you haven't shared your identity with other devices than that identity will be lost.

If you have data stored locally for this domain that hasn't been synced that data will be lost.
:::

* Open the DXOS [developer tools](./tooling/)
* Go to the 'Storage' tab
* Click 'Reset Storage' in the top right
* Go back to your app and reload

### Ad Blockers

Ad blockers and other browser extensions may cause problems installing apps.

### `EINVALIDPACKAGENAME` when initializing a new app

This is likely due to an older version of `npm` and/or `node`.
To use `npm init @dxos@latest` node needs to be at `v18` or newer. We recommend using [Node Version Manager](https://github.com/nvm-sh/nvm) or similar to ensure `node >= 18` and `npm >= 9`.
