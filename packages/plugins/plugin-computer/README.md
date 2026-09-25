# @dxos/plugin-computer

> **Proof of concept, dev only.** Presented in the app as **Coding (Dev)**. The tools need a Composer
> served by a vite dev server that mounted this package's plugin; the tree they work in is that
> server's own working directory. A deployed build has no dev server, so it has no shell: both tools
> fail with a configuration error.

A minimal coding harness for Composer's assistant: a **bash** tool and a **multi-string-replace**
edit tool that run in a working tree on the developer's machine.

This is the in-app alternative to `@dxos/agent-claude`, which delegates a whole turn to the Claude
Agent SDK. Here the loop stays DXOS's own — the assistant keeps its context, its skills and its
transcript — and gains the two tools that loop was missing.

## How it fits together

```text
browser                                    dev server (node)
─────────────────────────────────────      ────────────────────────────────────────
skill "Coding (Dev)"
  ├── bash  ──┐                            POST /api/computer/exec
  └── edits ──┴──▶ @dxos/plugin-computer/shell ─────▶  bash -c <script>  in <root>
                     (fetch, same origin)              ▲
                                                       │ stdin: {"edits":[…]}
                     prebaked apply-edits.mjs ─────────┘
```

The host exposes exactly **one** verb: run a shell script under a configured root and return its
stdout, stderr and exit code. The edit tool is not a second route — it runs a prebaked node script
that the middleware materializes into a temp directory and names to every script through
`$DX_COMPUTER_SCRIPTS`, with the edits arriving on stdin so no quoting in the replacement text can
change what the shell runs. `$DX_COMPUTER_ROOT` carries the root to those scripts; it is set by the
middleware, not by the developer.

## Enabling it

1. Start the Composer dev server from the tree the harness may work in (`moon run
   composer-app:serve`). The shell route mounts against that process's cwd.

2. Enable the **Coding (Dev)** plugin in Composer's settings (it is registered only in dev/labs
   builds and is off by default), then enable the **Coding (Dev)** skill in the conversation.

## Packaging

| Entry                                  | Realm   | Contents                                              |
| -------------------------------------- | ------- | ----------------------------------------------------- |
| `@dxos/plugin-computer`                | browser | the plugin, its skill and its operation definitions   |
| `@dxos/plugin-computer/shell`          | browser | wire contract + fetch client for the route            |
| `@dxos/plugin-computer/vite-plugin`    | node    | `ComputerShellPlugin` and the middleware it mounts    |

## What the root does and does not do

The root is the directory every script starts in, and the edit tool refuses any path outside it. It
is **not** a sandbox: the bash tool runs bash, so a script can walk out of the tree on its own. What
the check buys is that a caller cannot silently retarget the host at a different tree — an attempt
is an error rather than a quietly substituted directory.

The protections that are real:

- **Dev only, settings-gated.** `apply: 'serve'` mounts the route in a dev server and nowhere else, so
  a deployed Composer has no shell; the Composer plugin is off by default and registered only in
  dev/labs builds.
- **Same-origin only.** The route requires a JSON content type, which a cross-origin page cannot
  send without a preflight this route never answers, and it refuses a request whose `Origin` names
  another host.
- **Bounded.** Per-request timeout (killing the whole process group), and an output cap that reports
  `truncated` rather than returning a response the size of a build log.
- **Not agent-enablable.** The skill sets `agentCanEnable: false`, so the assistant cannot turn shell
  access on for itself mid-conversation.

Treat it the way you would treat a terminal you left open: the assistant can do anything you can.

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [FSL-1.1-Apache-2.0](./LICENSE) Copyright 2022 © DXOS
