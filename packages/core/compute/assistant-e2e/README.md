# @dxos/assistant-e2e

> **Deprecated.** Superseded by `@dxos/assistant-evals` (`evalite`-scored evals, graded by
> deterministic DB/tool-invocation assertions or an LLM judge instead of self-reported completion).
> This package is slated for removal once its remaining scenarios (`inbox-enable`, `local-ai`,
> `sandbox` — see below) are ported to an eval or dropped. Do not add new tests here.

Gated agent e2e tests: `agentTest` wraps a prompt as a memoized-replay vitest test, off by default
so PR CI stays fast (`runMemoizedTests()`, opt in with `DX_RUN_LLM_TESTS=1` or
`ALLOW_LLM_GENERATION=1` to regenerate memoized conversations).

Each test file follows a strict uniform structure. A test consists of **only a prompt** — no setup
code, assertions, or manual DB manipulation:

```typescript
import { describe, it } from '@effect/vitest';

import { runMemoizedTests } from '@dxos/ai/testing';
import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout, getDefaultSkills } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

describe.skipIf(!runMemoizedTests())('DescriptiveName', () => {
  it.effect(
    'short test name',
    agentTest({
      instructions: trim`
        Your prompt here.

        Completion criteria:
        - Expected outcome 1.
        - Expected outcome 2.
      `,
      skills: getDefaultSkills(),
    }),
    { timeout: agentTestTimeout() },
  );
});
```

Rules:

- `Obj.ID.dangerouslyDisableRandomness()` **must** appear at module scope before `describe`.
- No extra code apart from the prompt — the test is the prompt and nothing else.
- Always pass `{ timeout: agentTestTimeout() }` as the third argument.
- The agent starts with an **empty database** — instruct it to create any required data.
- `getDefaultSkills()` covers standard tests (`SkillManagerSkill`, `DatabaseSkill`); omit `skills`
  for tests that need none, or pass a custom `Ref.make(SomeSkill.make())` array.

```bash
# Replay from memoized conversations
moon run assistant-e2e:test

# Live, regenerating conversations (requires credentials)
ALLOW_LLM_GENERATION=1 moon run assistant-e2e:test -- src/testing/sandbox.test.ts
```
