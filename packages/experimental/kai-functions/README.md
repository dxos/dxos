# Kai Remote Functions

## Getting Started

### Install Multipass

Faasd must run in a VM since it will create its own `containerd` runtime.
[Multipass](https://github.com/openfaas/faasd/blob/master/docs/MULTIPASS.md) supports Ubuntu VMs for OSX.

```bash
multipass launch --name faasd --cloud-init ./setup/cloud-config.txt -d 10G
multipass info faasd
```

```bash
multipass launch stop faasd
multipass launch delete faasd
multipass launch purge
```

### Install Faasd

https://www.openfaas.com/blog/serverless-nodejs

```bash
brew install faas-cli
faas-cli template store list --verbose
```


## Build and deploy functions to Faasd

```bash
./scripts/deploy.sh
```


## Development

Configure env variables:

```bash
. ./scripts/env.sh

# Or manually:
export IP=$(multipass info faasd | grep IPv4 | awk '{print $2}')
export OPENFAAS_URL="http://$IP:8080"
```

### Running the CLI Daemon

TODO(burdon): Change to test everywhere.

1. Configure `$HOME/.config/dx/default.yml` (Set client persistence and Faasd Gateway.)
2. From the CLI directory start the daemon:

```bash
dx-dev daemon run --listen=unix://$HOME/.dx/run/default.sock --listen=ws://localhost:4567 --profile=default
```

To run the CLI:

```bash
DX_PROFILE=default dx-dev space list
```

NOTE: Check/delete the socket file to troubleshoot.

### Test with Notebook

- Install VSCode plugin: `Node.js` Notebooks (REPL)
- Open cli notebook (open `./notebooks/testing.nnb`)
- Create trigger:

```yml
  subscription: {
    type: 'dxos.experimental.chess.Game'
  }
```

### Connect Devtools

- https://devtools.dev.dxos.org/?target=ws://localhost:4567

### Connect KAI

- Create invitation (get space key from Devtools).

```bash
dx space invite SPACE_KEY
```

- Join Space from kai (Open Space list info panel in sidebar).




## OpenFaaS (faasd)

### Overview

- [fassd](https://docs.openfaas.com/deployment/faasd) is a lightweight [open source](https://github.com/openfaas/faasd) single-host container for functions.
- DXOS Agent implements faasd [connector](https://docs.openfaas.com/deployment/pro/#event-connectors).
- Connector queries for `org.dxos:subscription` ECHO objects and manages subscriptions.
  - ISSUE: Per Space?
  - ISSUE: Lifetime of subscriptions.
- ECHO mutations trigger function via event.
- Function has access to a Client object via the context.
- The Client is configured to connect to a ClientServices object (via a socket) hosted by the agent.


## Design

### Why faasd?

- Communities
  - OpenFaas [Community](https://docs.openfaas.com/community)
  - AWS Lambda/Google Run communities (MMs developers) 
  - Python AI community (10ks developers)
- Simple programming model
- Multiple languages (Node, Go, Python, etc...)
- Small footprint for local install via KUBE
  - Uses `containerd`.
  - Can be deployed using `cloud-init` script.
  - Can run on Pi 3 or 4 with 1G.
  - Compatible with other third-party microservices framework (e.g., `Next.js`)
  - Compatible with OpenFaaS for larger managed services
  - Cost to hots $5-10/mo.

### Functions

```js
module.exports = async (event, context) => {
  return context
    .status(200)
    .succeed({ message: 'hello' })
}
```
