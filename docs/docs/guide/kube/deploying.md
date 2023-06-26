---
order: 1
---

# Deploying apps to KUBE

To deploy your app to KUBE, first ensure a KUBE is running by following the [installation steps](./README.md#kube-installation).

If using a [DXOS application template](#create-an-app):

```bash
pnpm run deploy
```

Otherwise, to deploy any static application:

*   Ensure the [`dx` CLI](#creating-apps-with-dx-cli) is installed
*   Ensure there is a [`dx.yml`](./dx-yml-file) file in the project root
*   Run `dx app publish`

The app will be accessible in a browser at `http://<app-name>.localhost` where `<app-name>` is found in `dx.yml`. 🚀

For example, and app created with `dx app create hello`, the app will be on [`hello.localhost`](http://hello.localhost) by default.

::: warning Caution
Your app will now always be available on your machine until KUBE or the specific app is stopped.
:::
