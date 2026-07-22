# @dxos/assistant-evals

Cross-plugin assistant testing: gated agent e2e tests (`src/testing/*.test.ts`) and `evalite`-scored
evals (`src/evals/*.eval.ts`), sharing one harness. Single-plugin/skill scenarios belong in their own
plugin package instead, importing `createEvalRunner` / assertion helpers from here as a library — see
`packages/core/compute/ai/TESTING.md` § "Where evals live".

## Agent e2e tests (`src/testing/`)

Gated behind `runMemoizedTests()` — off by default, so PR CI stays fast; opt in with
`DX_RUN_LLM_TESTS=1` or `ALLOW_LLM_GENERATION=1` (regenerates memoized conversations).

Each test file follows a strict uniform structure. A test consists of **only a prompt** — no setup
code, assertions, or manual DB manipulation:

```typescript
import { describe, it } from '@effect/vitest';

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
  for tests that need none (e.g. smoke tests), or pass a custom `Ref.make(SomeSkill.make())` array.

```bash
# Replay from memoized conversations
moon run assistant-evals:test

# Live, regenerating conversations (requires credentials)
ALLOW_LLM_GENERATION=1 moon run assistant-evals:test -- src/testing/database.test.ts
```

## Evals (`src/evals/`)

Call the live LLM via `DX_ANTHROPIC_API_KEY` — no conversation cache, scored by `evalite`/`autoevals`
scorers instead of self-reported completion. Shared runner setup is in `src/runner.ts`, DB-state
assertion helpers in `src/assertions.ts`.

```bash
export DX_ANTHROPIC_API_KEY=...
moon run assistant-evals:evals
```
