# Demo

## Prep

- Space with presentation (lookup hypergraph), stack, table, sketch, etc.
- Reset mail with 5 initial messages.
- iPad with notes

## Browser

- RESET
- Set Halo name

## Terminals

```bash
cd ~/Code/dxos/dxos/packages/experimental/agent-functions
. $(git rev-parse --show-toplevel)/packages/devtools/cli/scripts/dev.sh
```

### Background

#### 0). Start Composer

```bash
pnpm nx serve composer-app
```

#### 1). Stop and Reset Agent

```bash
sudo killall node
dx agent stop && dx reset --force && dx halo create "DXOS Agent" --no-agent && dx halo identity --no-agent && dx agent start -f
```

#### 2). Create a space

NOTE: DO THIS BEFORE STARTING DEV SERVER (to register functions). NEED TO RESTART IF ADDING SPACES.

```bash
dx space create Demo
```

### Foreground

#### 3). Start Functions Dev Server

NOTE: Configure profile:

```bash
vi ~/.config/dx/profile/default.yml
```
```yaml
  agent:
    plugins:
      - id: dxos.org/agent/plugin/functions
        config:
          manifest: /Users/burdon/Code/dxos/dxos/packages/experimental/agent-functions/functions.yml
```

```bash
cd ~/packages/experimental/agent-functions/functions.yml
LOG_FILTER="info" dx function dev -r ts-node/register --verbose --reload
```

#### 4). Invite Space

```bash
dx space share --open --host http://localhost:5173
```

- Create Chess Game
- Test Chess Function

### Testing Function

```bash
dx composer query
```

```bash
dx composer import ./testing/data/functions.json
```

### Email

- https://hub.dxos.network/admin/email
- https://hub.dxos.network/api/mailbox/hello@dxos.network

```bash
cd ~/Code/dxos/w3/packages/hub
./scripts/email

./scripts/send_email
```
