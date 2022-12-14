# DXOS Inspector

Package with standalone INSPECTOR vite app. 
It listens for client in shared worker started by some app. 

## Start
`pnpm nx serve inspector-app`

## Query params
To inspect desired vault you can use query parameter `target`.
`target` parameter possible values:
  - `target=vault:<url for remote vault>` - Inspector will connect to remote Client (url example https://inspector.kube.dxos.org/?target=vault:https://halo.dxos.org/vault.html)