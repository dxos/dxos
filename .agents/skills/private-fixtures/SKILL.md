---
name: private-fixtures
description: >-
  Push, pull and use private test fixtures — real recordings, inboxes or other PII-bearing files that
  must never enter git — through the encrypted `test-fixtures` R2 bucket with `moon run fixtures:*`.
  Use when a test or eval needs a real corpus (a `.wav` voice recording for transcription, a mailbox
  archive), when asked to upload or share a fixture with agents, when a fixture-backed test skips, or
  when a cloud session needs the agents fixtures key from 1Password.
---

# Private fixtures

Fixtures live outside git: encrypted with `age` before they leave the machine, stored in the private
`test-fixtures` R2 bucket, and pulled into the git-ignored `testing/fixtures/` at the repo root. The
tool is `tools/fixtures` (`bin/fixtures.mjs` for the CLI, `src/index.ts` for tests); its header
comment is the reference.

## Two scopes

| Scope            | Remote folder     | Encrypted to                            | Who can pull                                 |
| ---------------- | ----------------- | --------------------------------------- | -------------------------------------------- |
| `user` (default) | `mailbox/<user>/` | the pusher's own key                    | the pusher only                              |
| `agents`         | `agents/`         | the pusher's key **and** the agents key | the pusher and any agent with the agents key |

Use `--scope agents` for anything an agent should test against (e.g. voice recordings for
transcription evals). Everything else stays per-user.

## Keys

- **Your own key:** `age-keygen -o ~/.config/dxos/fixtures.key`, then
  `export DX_FIXTURES_AGE_KEY=~/.config/dxos/fixtures.key` (an `op://` reference also works).
- **Agents key:** the secret is in 1Password, vault `eng-dev`, item `network.dxos.fixtures`,
  field `credential`. Its public half is committed as `AGENTS_RECIPIENT` in `bin/fixtures.mjs`.
  To pull agents fixtures someone else pushed:
  `export DX_FIXTURES_AGENTS_KEY='op://eng-dev/network.dxos.fixtures/credential'`.
- **Cloud sandbox:** `op` reads that reference through the service account, so the pull works as-is
  provided the service account can see `eng-dev` (see the `1password` skill).
- **Local session:** never run `op` (it pops a desktop prompt). Point `DX_FIXTURES_AGENTS_KEY` at a
  file the user exported, or ask the user to run the command.

Rotating the agents key: generate a new one, update the 1Password item and `AGENTS_RECIPIENT`, and
push the agents fixtures again; old objects stay readable only with the old key.

## Push and pull

```bash
moon run fixtures:push -- ~/Downloads/voice-pauses-20261023-153000.wav --scope agents
moon run fixtures:pull -- voice-pauses --scope agents
moon run fixtures:info
```

- The name and version come from the filename (`<name>-<YYYYMMDD-HHMMSS>.<ext>`); `--name` overrides
  the name, and an unstamped file is stamped now. Every push is a new version; nothing is overwritten.
- JSON fixtures are checked to be an array before upload; any other file (`.wav`) is carried as-is.
- `pull` takes the newest version via the remote pointer; `--at <version> --ext <ext>` pins one.
- wrangler must be authenticated against the DXOS Cloudflare account (`wrangler login`, or
  `CLOUDFLARE_API_TOKEN` in the cloud).

## Using a fixture in a test

```ts
import { fixtureExists, fixturePath } from '@dxos/fixtures';

describe.skipIf(!fixtureExists('voice-pauses', { extension: 'wav' }))('pauses', () => {
  test('splits at each pause', ({ expect }) => {
    const path = fixturePath('voice-pauses', { extension: 'wav' });
    expect(path).toBeDefined();
    // …
  });
});
```

CI has neither credential, so every fixture-backed suite must gate on `fixtureExists` and skip: a
private corpus must never be able to fail the build. Never copy a pulled fixture into the repo, a PR,
a log or an artifact.
