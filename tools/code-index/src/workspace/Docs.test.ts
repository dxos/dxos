//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Agent from './Agent.ts';
import * as Docs from './Docs.ts';

/**
 * The agent's whole contract is the prompt and the tool description, and both are assembled from
 * the `.d.ts` the sandbox is written against. These assert that join: a capability the sandbox has
 * but the docs never mention is a capability the model will not use.
 */
describe('Docs', () => {
  test('the declarations name every surface the bridge implements', () => {
    const api = Docs.api();
    expect(api).toContain('declare const rdf');
    expect(api).toContain('declare const storage');
    expect(api).toContain('declare const display');
    expect(api).toContain('declare const print');
    for (const call of ['query', 'ask', 'prefixes', 'vocabulary', 'mermaid', 'table', 'clear']) {
      expect(api).toContain(`${call}(`);
    }
  });

  test('the file header is stripped and the doc comments survive', () => {
    const api = Docs.api();
    expect(api).not.toContain('Copyright');
    expect(api).toContain('Persistent, per-project key/value memory');
  });

  test('the system prompt states the rule the whole design rests on', () => {
    const prompt = Docs.systemPrompt();
    expect(prompt).toMatch(/only what you publish through the `display` API/);
    // The examples are in the prompt because a local model writes far better SPARQL with them.
    expect(prompt).toContain('PREFIX deus:');
  });

  test("the tool's description carries the API, so its schema alone is enough to write code", () => {
    expect(Agent.ExecTool.name).toEqual('exec');
    expect(Agent.ExecTool.description).toContain('declare const rdf');
  });
});
