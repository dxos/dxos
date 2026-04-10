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

## Reports (when something goes wrong or you hand off a spec in chat)

Use these when describing or fixing agent e2e tests outside the repo, or when pairing in chat:

1. **Assume an empty database** at the start of every prompt unless the spec says otherwise. Do not assume mailboxes, messages, or any other objects already exist.

2. **Seeding data in the prompt.** If the scenario needs ECHO objects, instruct the agent to create them **at the beginning** of the task. The default prompt stack includes `DatabaseBlueprint` via `getDefaultBlueprints()` — use database/query/create flows from that blueprint, not test setup code.

3. **Tool names.** The prompt may name specific tools or operations (e.g. `org.dxos.plugin.inbox.operation.read-email`) so the agent and reviewers align on what must run.

4. **Completion criteria and tools.** Criteria may require that a given tool **succeeds** (no thrown error / failed exit) and optionally what it **returns** (e.g. empty list, zero rows, specific shape). Prefer “operation X completes successfully; result may be …” when empty data is valid.

5. **Short report format.** If the TypeScript needs **no deviation** from the standard template in [Test File Structure](#test-file-structure) (same imports, `agentTest`, `getDefaultBlueprints`, timeouts, etc.), only output a heading and a pointer to the prompt lines — do not paste the full file:

<example>
```md
# enables the inbox blueprint and queries emails

The database starts empty.

First, create a Mailbox object in the space using the database blueprint tools (typename org.dxos.type.mailbox). Give it a clear name.

Then enable the inbox blueprint (key: org.dxos.blueprint.inbox) using the blueprint manager.

Invoke the read-email operation for that mailbox (org.dxos.plugin.inbox.operation.read-email). There are no email messages yet; the tool must still complete successfully and may return empty content.

Completion criteria:

- A Mailbox object exists in the database.
- The inbox blueprint is successfully enabled, or you report the exact tool error if it cannot be enabled.
- The read-email operation completes without error; the returned content may be empty (zero emails).

````
</example>

Adjust the heading to match the `it.effect` title and the path/range to the `instructions` / `trim` template (or the whole `Prompt.make` if needed).

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
````

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

| Mistake                                                      | Fix                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Adding setup code or assertions                              | Remove them — the prompt is the entire test.                                         |
| Missing `Obj.ID.dangerouslyDisableRandomness()`              | Add it at module scope before `describe`.                                            |
| Vague prompts without completion criteria                    | Add explicit "Completion criteria:" section.                                         |
| Assuming data exists in the DB                               | Instruct the agent to create required data.                                          |
| Not committing `*.conversations.json`                        | Always commit updated conversation fixtures.                                         |
| Pasting entire test files in chat when structure is standard | Use the short report format under **Reports**: heading + `@path (lines)`.            |
| Assuming pre-seeded data without saying so in the prompt     | State empty DB; seed via database blueprint instructions at the start of the prompt. |
