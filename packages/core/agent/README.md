# DX Agent

- Agents are background processes that implement a DXOS network peer.
- Agents have an identity and represent a user's device.
- Agents are managed by a daemon process controlled by the `dx agent` CLI commands.
- By default, agents will automatically sync all Spaces that the user has access to.
- Agents may be configured to automatically create epochs for Spaces that were created by the associated user.


## Usage

Both the CLI and agents should be configured to use a given profile using either the `--profile` flag or `DX_PROFILE` environment variable. 
The CLI will automatically connect to the agent using the given profile.

To run an agent in the foreground:

```bash
DX_PROFILE=test dx agent run
```

The CLI will then connect automatically to the agent:

```bash
DX_PROFILE=test dx halo
```

NOTE: The CLI will automatically start an agent if one is not already running.

To run with logging enabled:

```bash
LOG_CONFIG=./log-config.yml dx agent start -f --ws=5001
```

### Managing HALO Devices

The CLI can support multiple profiles, each with its own HALO identity.
Similarly, separate browser profiles can be sued to support multiple HALO identities.

To configure the agent to join an existing HALO:

- Open https://halo.dxos.org, then get the invitation code by adding a device.
- Run the following command then enter the invitation code:

```bash
DX_PROFILE=test dx halo join
```

To configure a browser profile to join an identity created by the CLI:

- Open https://halo.dxos.org, then join from an existing device.
- Run the following command then enter the invitation code into the browser:

```bash
DX_PROFILE=test dx halo create <username>
DX_PROFILE=test dx halo share
```

### Epochs

To configure the agent to automatically trigger new epochs set the `epoch` flag:

```bash
DX_PROFILE=test dx agent run --epoch=auto
```


## Development

Source the following script to set an alias for `dx` that can be called from any directory:

```bash
cd packages/devtools/cli
. ../../devtools/cli/scripts/dev.sh
```

Example:

```bash
DX_PROFILE=test dx agent run --socket --web-socket=4567 --http=3000
```

NOTE: The `agent` will need to be recompiled after any changes.


### Reset

Run the following command to reset all data for a given profile:

```bash
DX_PROFILE=test dx reset --force --no-agent
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

## Demo

Use the [DXOS ZSH theme](../../../tools/zsh/ohmyz/themes/dxos.zsh-theme) to display the current profile in the shell prompt.

```bash
# Source dx alias.
. ./packages/devtools/cli/scripts/dev.sh

export DX_PROFILE=test

dx agent stop
dx agent list
dx reset --force --no-agent
dx halo create Tester --no-agent
dx halo --no-agent

dx agent start --ws=5000 --echo=5001 --monitor
```

## Testing

To test the ECHO REST API endpoint use `curl`:

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
