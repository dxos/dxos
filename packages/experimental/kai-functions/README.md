# Kai Remote Functions

## Set-up Multipass

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

## Build and deploy functions to Faasd

See `./deploy.sh`


## Running the CLI Daemon

1. Configure `$HOME/.config/dx/default.yml` (Client persistence and Faasd Gateway.)
2. From the CLI directory start the daemon:
   
```bash
./bin/dev daemon run --listen=unix://$HOME/.dx/run/default.sock --listen=ws://localhost:4567 --profile=default
```

## Test with Notebook

- Install vscode plugin: Node.js Notebooks (REPL)
- Open cli notebook (open `testing.nnb`)
- Create trigger:

```yml
  subscription: {
    type: 'dxos.experimental.chess.Game'
  }
```

## Connect Devtools

- https://devtools.dev.dxos.org/?target=ws://localhost:4567#/echo/feeds 

## Connect KAI

- Get space key from Devtools

```bash
dx space invite SPACE_KEY
```
