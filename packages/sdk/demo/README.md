# ECHO - Demo

A set of storybook demonstrating functionalities of ECHO database.

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
