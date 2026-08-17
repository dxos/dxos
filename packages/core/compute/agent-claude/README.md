# @dxos/agent-claude

Claude Agent SDK host: runs the SDK's agent loop in a local Node process and projects its output
into ECHO messages.

The SDK is not a model provider — it brings its own loop, tools, permission system and compaction —
so it enters DXOS as an agent whose transcript is projected into a feed, not as an entry in
`@dxos/ai`'s provider registry.

Node-only. Never import this package from a browser bundle.

## Permissions

M1 runs read-only by construction (see `Options.ts`): `permissionMode: 'dontAsk'` denies anything
that would otherwise prompt, so the host can never block on an approval UI that does not exist yet.
Denied calls still land in the transcript as errored tool results, which is how the requirements for
a real permission UI get collected.

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [FSL-1.1-Apache-2.0](./LICENSE) Copyright 2022 © DXOS
