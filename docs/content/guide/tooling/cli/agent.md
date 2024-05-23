---
description: DXOS Agent
label: Agent
order: 5
---

# Agents

The DXOS Agent provides offline backup and synchronization capabilities. It continuously replicates all data from all of your browser sessions. When your browser sessions are offline, it will replicate any changes from your spaces to any peers in the space. This allows changes to a space to be available even if the other peer was offline when the change was made.

Agents are implemented as a headless network peer device belonging to a DXOS identity. By default, they synchronize all Spaces that the identity has access to. Agents can be used to backup and migrate data from one browser profile to another.

Agents are managed by the `dx` CLI and can run as a daemon or in the foreground. An agent can be started manually or configured to run a system startup using an a service management daemon such as `systemd` or `launchd`.

## Installation

Install the DXOS CLI using Node v18 or higher:

```bash
npm i -g @dxos/cli
```

## Usage

### Startup

An agent can be run in the foreground or the background as a daemon.

Running an agent in the foreground is useful for troubleshooting or within a init system such as `systemd`.

To run an agent in the foreground:

```bash
dx agent start -f
```

The CLI will automatically use the agent, or start one in the background if one is not running, unless the '--no-agent' flag is used.

`dx agent list` will show the agent status.

### Logging

Logging verbosity can be controlled with the `LOG_FILTER` environment variable:

```bash
LOG_FILTER=info dx agent start -f
```

If the agent is run in background mode, log files will be created in `/tmp/dx/run/profile/<profile name>/logs`

### Managing HALO Devices

The agent acts as a HALO device, which can share an identity and ECHO space membership with other devices, such as a web browser.

#### To configure the agent to join an existing HALO identity from a browser:

* Open a DXOS app, such as [Composer](https://composer.dxos.org)
* Click on the avatar icon in the upper left corner.
* Click on "Add device"
* Click "Copy URL" to copy the invitation code.
* Run the CLI command `dx halo join` and paste the invitation code.

#### To configure a browser profile to join an identity created by the CLI:

* Ensure a HALO identity has been created in the agent, or use the `dx halo create <username>` command to create one.
* Run `dx halo share` to create a device invitation.
* Copy the invitation code and open it in a browser.

### Reset

Run the following command to reset all data for a given profile:

```bash
dx reset --force --no-agent
```

## Development

See [Development](https://github.com/dxos/dxos/tree/main/packages/devtools/cli#development)
