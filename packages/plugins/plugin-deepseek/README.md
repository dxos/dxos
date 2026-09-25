# @dxos/plugin-deepseek

License: [FSL-1.1-Apache-2.0](./LICENSE) Copyright 2022 © DXOS

Headless DXOS Composer plugin that lets the user connect their
[DeepSeek](https://platform.deepseek.com) account by pasting an API key, and lets
the assistant run the DeepSeek harness with it.

It contributes:

- A **Connector** entry (`source: "deepseek.com"`) with an API-key credential
  form, rendered by the generic Connector UI. On submit the key is stored as an
  `AccessToken` plus a `Connection` in ECHO.
- A **Skill** (`org.dxos.skill.deepseek`) with two operations. `InstallHarness`
  creates a `plugin-sandbox` container, binds that `AccessToken` to it as the
  `DEEPSEEK_API_KEY` credential — by reference, so the key is resolved into the
  container's environment per exec and never enters a tool result or transcript —
  and installs the harness CLI. `RunHarness` runs the harness on a prompt in that
  sandbox and returns its stdout, stderr and exit code. The skill sets
  `agentCanEnable: true`, so the agent turns it on mid-task.

The harness CLI is installed into the sandbox, not bundled: the npm package
(`DEFAULT_HARNESS_PACKAGE`) and binary (`DEFAULT_HARNESS_BIN`) are defaults that
each call can override via `harnessPackage` / `harnessBin`.

No React/UI surfaces. See [`PLUGIN.mdl`](./PLUGIN.mdl) for the specification.
