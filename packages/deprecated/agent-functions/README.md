# Agent Functions

## Testing

Call the plugin proxy.

```bash
curl -i -X POST -H "Content-Type: application/json" http://localhost:7100/dev/hello
```

Call and parse function.

```bash
curl -s -X POST -H "Content-Type: application/json" http://localhost:7100/dev/hello | jq
```

## TODO(burdon):
- stack.yml files
- Function namespace (OpenFaaS).
- Deploy from URL (yml file in GH, package in GHCR).
- Local docker/package registry for offline/perf.

## Getting Started

### Install Docker Desktop

[Docker Desktop](https://docs.docker.com/desktop/install/mac-install/) is required to build Docker images.

### Install Faasd on Multipass

Faasd must run in a VM since it will create its own `containerd` runtime.
[Multipass](https://github.com/openfaas/faasd/blob/master/docs/MULTIPASS.md) supports Ubuntu VMs for OSX.

```bash
brew install --cask multipass

# Download cloud-config and update ssh key:
# curl -sSLO https://raw.githubusercontent.com/openfaas/faasd/master/cloud-config.txt
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

## OpenFaas Dashboard

Open the Faasd console (username=admin; password from script below): 

```bash
. ./scripts/env.sh
open http://$IP:8080
```

## Build and deploy functions to Faasd

NOTE: Building the Docker image may take a few minutes (npm install is slow).

```bash
./scripts/deploy.sh
```

List functions:

```bash
DX_PROFILE=test dx function list
```

Invoke function:

```bash
DX_PROFILE=test dx function exec hello
```

View logs (https://docs.openfaas.com/cli/logs):

```bash
faas-cli logs hello
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

1. Configure `$HOME/.config/dx/profile/test.yml` (Set client persistence and OpenFaaS Gateway.)
2. From the CLI directory start the daemon:

```bash
dx agent list
DX_PROFILE=test dx agent start
```

NOTE: Must invoke run to listen on socket (for functions and devtools).

```bash
dx agent list
DX_PROFILE=test dx agent run --web-socket=4567
```

Test via the CLI:

```bash
DX_PROFILE=test dx halo
DX_PROFILE=test dx space list
```

NOTE: Check/delete the socket file to troubleshoot.

### Test with Notebook

- Install VSCode plugin: `Node.js` Notebooks (REPL)
- Open cli notebook (open `./notebooks/testing.nnb`)
- Create trigger:

```yml
subscription: {
  type: 'dxos.org/type/Chess'
}
```

### Connect Devtools

- https://devtools.dxos.org/?target=ws://localhost:4567

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
