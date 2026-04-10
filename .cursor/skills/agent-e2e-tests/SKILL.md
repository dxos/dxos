---
name: agent-e2e-tests
description: Use when writing, editing, or reviewing agent e2e tests in packages/core/assistant-e2e. Use when creating new test files in the testing/ directory, adding test cases, or fixing failing agent e2e tests.
---

# Agent E2E Tests

## Overview

Agent e2e tests verify assistant behavior end-to-end by running prompts against the full agent stack. Each test is **only a prompt** — no setup code, no assertions, no manual DB manipulation. The harness handles everything.

Package: `packages/core/assistant-e2e`

## Test File Structure

Every test file follows this exact template:

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
        `,
        blueprints: getDefaultBlueprints(),
      }),
    ),
    { timeout: DEFAULT_TEST_TIMEOUT },
  );
});
```

### Mandatory Rules

1. `Obj.ID.dangerouslyDisableRandomness()` **must** be at module scope, before `describe`.
2. Tests use `it.effect` from `@effect/vitest` and wrap the prompt with `agentTest()`.
3. **No extra code** — no manual DB setup, no custom assertions, no helper functions. The test is the prompt and nothing else.
4. Always pass `{ timeout: DEFAULT_TEST_TIMEOUT }` as the third argument.
5. Use `trim` template literal for instructions to strip leading whitespace.

## Prompt Guidelines

- **Be specific** but not overly verbose.
- **Add completion criteria** to prompts so success is unambiguous:

```typescript
instructions: trim`
  Search 5 richest people in the world and create Person objects in the database.

  Completion criteria:
  - 5 Person objects in the database.
  - Web search works.
`,
```

- The agent starts with an **empty database**. If the test requires data, instruct the agent to create it in the prompt.
- Do not rely on the agent's training data — use the tools provided.

## Blueprints

- Use `getDefaultBlueprints()` for standard tests (includes `BlueprintManagerBlueprint` and `DatabaseBlueprint`).
- Omit `blueprints` from `Prompt.make()` if the test needs no blueprints (e.g., smoke tests).
- For custom blueprint sets, pass an array of `Ref.make(SomeBlueprint.make())`.

## Expecting Failure

To test that an agent correctly reports failure:

```typescript
agentTest(
  { expect: 'failure' },
  Prompt.make({
    instructions: trim`
      Do nothing and fail.
    `,
  }),
),
```

Pass the options object as the first argument to `agentTest`.

## Running Tests

```bash
# Replay from memoized conversations (CI mode)
moon run assistant-e-2-e:test

# Generate new conversations (requires credentials)
ALLOW_LLM_GENERATION=1 moon run assistant-e-2-e:test

# Single test file
ALLOW_LLM_GENERATION=1 moon run assistant-e-2-e:test -- src/testing/database.test.ts
```

Memoized conversations are stored in `*.conversations.json` next to each test file. Commit these after regeneration.

## Common Mistakes

| Mistake                                         | Fix                                          |
| ----------------------------------------------- | -------------------------------------------- |
| Adding setup code or assertions                 | Remove them — the prompt is the entire test. |
| Missing `Obj.ID.dangerouslyDisableRandomness()` | Add it at module scope before `describe`.    |
| Vague prompts without completion criteria       | Add explicit "Completion criteria:" section. |
| Assuming data exists in the DB                  | Instruct the agent to create required data.  |
| Not committing `*.conversations.json`           | Always commit updated conversation fixtures. |
