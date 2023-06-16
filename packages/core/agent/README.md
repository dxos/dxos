# DX Agent

Agents are managed by the daemon process via the CLI.

## Development

Both the CLI and agents should be configured to use a given profile using either the `--profile` flag or `DX_PROFILE` environment variable. 
The CLI will automatically connect to the agent using the given profile.

To run an agent in the foreground:

```bash
# Source dx-dev alias.
. ../../devtools/cli/scripts/dev.sh

# Start the an agent with a `test` profile.
DX_PROFILE=test dx-dev agent run --socket --web-socket=4567 --http=3000
```

CLI commands will then connect to the agent:

```bash
DX_PROFILE=test dx-dev halo
```

NOTE: The CLI will automatically start an agent if one is not already running.


### Epochs

To configure the agent to automatically trigger new epochs set the `epoch` flag (to `auto` or a message count):

```bash
DX_PROFILE=test dx-dev agent run --socket --epoch=auto
```


### Devtools

To connect devtools, set the `target` query parameter to the agent's websocket URL, e.g.,

`https://devtools.dxos.org?target=ws://localhost:4567`


### Debugging

To enable logging, set `LOG_FILTER`:

```bash
LOG_FILTER="info,agent:debug"
```

To enable debugging, set `NODE_OPTIONS` then open in VSCode (CMD-SHIFT-P "Attach to Node process").

```bash
NODE_OPTIONS="--inspect-brk"
```

## Testing

To test the Client proxy endpoint use `curl`:

```bash
# Query spaces.
curl -s http://localhost:3000/spaces | jq
```

Or a `python` script:

```bash
# One-time setup.
python3 -m pip install -r ./scripts/requirements.txt

# Run the test.
python3 ./scripts/test.py | jq
```
