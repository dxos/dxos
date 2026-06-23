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
import { describe, it } from '@effect/vitest';

import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout, getDefaultSkills } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

describe('DescriptiveName', () => {
  it.effect(
    'short test name',
    agentTest({
      instructions: trim`
        Your prompt here.
      `,
      skills: getDefaultSkills(),
    }),
    { timeout: agentTestTimeout() },
  );
});
```

### Mandatory Rules

1. `Obj.ID.dangerouslyDisableRandomness()` **must** be at module scope, before `describe`.
2. Tests use `it.effect` from `@effect/vitest` and pass an options object to `agentTest({ instructions, skills })`.
3. **No extra code** — no manual DB setup, no custom assertions, no helper functions. The test is the prompt and nothing else.
4. Always pass `{ timeout: agentTestTimeout() }` as the third argument.
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

2. **Seeding data in the prompt.** If the scenario needs ECHO objects, instruct the agent to create them **at the beginning** of the task. The default prompt stack includes `DatabaseSkill` via `getDefaultSkills()` — use database/query/create flows from that skill, not test setup code.

3. **Tool names.** The prompt may name specific tools or operations (e.g. `org.dxos.plugin.inbox.operation.read-email`) so the agent and reviewers align on what must run.

4. **Completion criteria and tools.** Criteria may require that a given tool **succeeds** (no thrown error / failed exit) and optionally what it **returns** (e.g. empty list, zero rows, specific shape). Prefer “operation X completes successfully; result may be …” when empty data is valid.

5. **Short report format.** If the TypeScript needs **no deviation** from the standard template in [Test File Structure](#test-file-structure) (same imports, `agentTest`, `getDefaultSkills`, timeouts, etc.), only output a heading and a pointer to the prompt lines — do not paste the full file:

<example>
```md
# enables the inbox skill and queries emails

The database starts empty.

First, create a Mailbox object in the space using the database skill tools (typename org.dxos.type.mailbox). Give it a clear name.

Then enable the inbox skill (key: org.dxos.skill.inbox) using the skill manager.

Invoke the read-email operation for that mailbox (org.dxos.plugin.inbox.operation.read-email). There are no email messages yet; the tool must still complete successfully and may return empty content.

Completion criteria:

- A Mailbox object exists in the database.
- The inbox skill is successfully enabled, or you report the exact tool error if it cannot be enabled.
- The read-email operation completes without error; the returned content may be empty (zero emails).

````
</example>

Adjust the heading to match the `it.effect` title and the path/range to the `instructions` / `trim` template (or the whole `agentTest({ ... })` options object if needed).

## Skills

- Use `getDefaultSkills()` for standard tests (includes `SkillManagerSkill` and `DatabaseSkill`).
- Omit `skills` from the options object if the test needs no skills (e.g., smoke tests).
- For custom skill sets, pass an array of `Ref.make(SomeSkill.make())`.

## Expecting Failure

To test that an agent correctly reports failure, set `expect: 'failure'` in the options object:

```typescript
agentTest({
  expect: 'failure',
  instructions: trim`
    Do nothing and fail.
  `,
}),
```

## Running Tests

```bash
# Replay from memoized conversations (CI mode)
moon run assistant-e2e:test

# Generate new conversations (requires credentials)
ALLOW_LLM_GENERATION=1 moon run assistant-e2e:test

# Single test file
ALLOW_LLM_GENERATION=1 moon run assistant-e2e:test -- src/testing/database.test.ts
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
| Assuming pre-seeded data without saying so in the prompt     | State empty DB; seed via database skill instructions at the start of the prompt. |
````
