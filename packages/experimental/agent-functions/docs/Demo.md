# Demo

- TODO(burdon): Set-up custom domain with CF Access for demo (demo.composer.spaces).
- TODO(burdon): Clear bash history and seed commands.
- TODO(burdon): ENV for no-agent.
- TODO(burdon): Remove need for functions plugin config.

# Terminals

```bash
cd ~/Code/dxos/dxos/packages/experimental/agent-functions
. $(git rev-parse --show-toplevel)/packages/devtools/cli/scripts/dev.sh
```

## Background

### 0). Start Composer

```bash
pnpm nx serve composer-app
```

### 1). Stop and Reset Agent

```bash
sudo killall node

dx agent stop && dx reset --force && dx halo create "DXOS Agent" --no-agent && dx halo identity --no-agent
dx space create --no-agent
```

### 2). Start Agent

```bash
dx agent start -f
```

## Foreground

### 3). Start Functions Dev Server

NOTE: Configure profile:

```bash
vi ~/.config/dx/profile/default.yml
```
```yaml
  agent:
    plugins:
      - id: dxos.org/agent/plugin/dashboard
      - id: dxos.org/agent/plugin/functions
        config:
          manifest: /Users/burdon/Code/dxos/dxos/packages/experimental/agent-functions/functions.yml
```

```bash
cd ~/packages/experimental/agent-functions/functions.yml
LOG_FILTER="info" dx function dev -r ts-node/register --verbose --reload
```

### 4). Invite Space

NOTE: Migrate Space?

```bash
dx space share --open --host http://localhost:5173
```

- Create Chess Game
- Test Chess Function

## Testing Function

```bash
dx composer query
```

```bash
dx composer import ./testing/data/functions.json
```

## Email

https://hub.dxos.network/admin/email

```bash
cd ~/Code/dxos/w3/packages/hub
./scripts/email

./scripts/send_email
```


