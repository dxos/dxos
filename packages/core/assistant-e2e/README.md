# @dxos/assistant-e-2-e

Agent end-to-end tests that verify assistant behavior by running prompts against the full agent stack.

## Writing Tests

Each test file in `src/testing/` follows a strict uniform structure. A test consists of **only a prompt** — no setup code, assertions, or manual DB manipulation.

### Template

```typescript
import { Prompt } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';
import { describe, it } from '@effect/vitest';
import { agentTest, DEFAULT_TEST_TIMEOUT, getDefaultBlueprints } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

describe('DescriptiveName', () => {
  it.effect(
    'short test name',
    agentTest(
      Prompt.make({
        instructions: trim`
          Your prompt here.

          Completion criteria:
          - Expected outcome 1.
          - Expected outcome 2.
        `,
        blueprints: getDefaultBlueprints(),
      }),
    ),
    { timeout: DEFAULT_TEST_TIMEOUT },
  );
});
```

### Rules

- `Obj.ID.dangerouslyDisableRandomness()` **must** appear at module scope before `describe`.
- No extra code apart from the prompt — the test is the prompt and nothing else.
- Always use `{ timeout: DEFAULT_TEST_TIMEOUT }`.
- Use `trim` template literal for instructions.

### Prompt Guidelines

- Be specific but not overly verbose.
- Add **completion criteria** so success is unambiguous.
- The agent starts with an **empty database** — instruct it to create any required data.

### Blueprints

- `getDefaultBlueprints()` — standard tests (includes `BlueprintManagerBlueprint`, `DatabaseBlueprint`).
- Omit `blueprints` for tests that need none (e.g., smoke tests).
- For custom sets, pass an array of `Ref.make(SomeBlueprint.make())`.

### Expecting Failure

```typescript
agentTest(
  { expect: 'failure' },
  Prompt.make({ instructions: trim`Do nothing and fail.` }),
),
```

## Running Tests

```bash
# Replay from memoized conversations (CI mode)
moon run assistant-e-2-e:test

# Generate new conversations (requires credentials)
ALLOW_LLM_GENERATION=1 moon run assistant-e-2-e:test

# Single test file
ALLOW_LLM_GENERATION=1 moon run assistant-e-2-e:test -- src/testing/database.test.ts
```

Memoized conversations are stored in `*.conversations.json` next to each test file. Always commit these after regeneration.

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [MIT](./LICENSE) Copyright 2022 © DXOS
