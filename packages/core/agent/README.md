# DX Agent

Agents are managed by the daemon process via the CLI.

## Development

To run the daemon:

```bash
# Source dx-dev alias.
. ../../devtools/cli/scripts/dev.sh

# Start the an agent with a `test` profile.
DX_PROFILE=test \
  LOG_FILTER="run-services:debug" \
  dx-dev agent run \
    --listen=unix:///tmp/dx/run/profile/test/agent.sock \
    --listen=ws://localhost:4567 \
    --listen=http://localhost:3000
```

To enable debugging, add the following env then open in VSCode (CMD-SHIFT-P "Attach to Node process") 

```bash
  NODE_OPTIONS="--inspect-brk"
```

## Testing

To test the Client proxy:

```bash
# One-time setup.
python3 -m pip install -r ./scripts/requirements.txt

# Run the test.
python3 ./scripts/test.py | jq
```
