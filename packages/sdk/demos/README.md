# SDK Demos

Storybooks for SDK demos, tutorials, and testing experimental components.

## Running the storybooks

```bash
rushx storybook
```

## Using local signal server

By default, storybooks use a singal server deployed on a demo kube.

Local signal server can be used for better performance.

1. Run the local signal server

```bash
npx @dxos/signal
```

2. Use the signal server with storybooks

First, copy the environment file example:

```bash
cp .env.example .env
```

Next, edit the `.env` file, leaving the following `STORYBOOK_SIGNAL` variable uncommented:

```bash
STORYBOOK_SIGNAL="ws://localhost:4000"
```

## Electron

For demos, create a native electron app:

```
mkdir -p ./dist
npx nativefier http://localhost:9001 ./dist
open dist/APP-darwin-x64/APP.app
```

NOTE: This is large -- don't check it in.

## Grid demo

The grid demo allows to demonstrate replication by opening multiple windows in a grid and joining them in a party.

1. Configuration

```bash
cp .env.example .env
```

Edit `.env` if necessary

2. Run storybooks

```bash
rushx storybook
```

3. Run the grid demo

In a different terminal window, run:

```bash
rushx grid:demo
```

You can end the demo by hitting `CTRL+C` in the terminal window.
