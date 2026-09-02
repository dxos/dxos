//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';

import { commandPath, observabilityNamespace, otelEndpoint, projectToken } from './observability';

describe('CLI observability', () => {
  // The event names a command, never what the user typed into it.
  test('names a command by its subcommand path, keeping flags and their values out', ({ expect }) => {
    expect(commandPath([])).to.equal('dx');
    expect(commandPath(['space', 'list'])).to.equal('space list');
    expect(commandPath(['space', 'list', '--json'])).to.equal('space list');
    expect(commandPath(['chat', '--prompt', 'my private notes'])).to.equal('chat');
    expect(commandPath(['--profile', 'work', 'space', 'list'])).to.equal('dx');
  });

  // A source checkout is where the tests, demos and debugging happen, and CI runs the released
  // binary in the smoke test — neither is usage, and neither should reach a project.
  test('reports nowhere unless asked', ({ expect }) => {
    expect(projectToken()).to.be.undefined;
    expect(otelEndpoint()).to.be.undefined;
  });

  test('keeps observability state per profile', ({ expect }) => {
    expect(observabilityNamespace('default')).to.match(/\/\.config\/dx\/profile\/default$/);
    expect(observabilityNamespace('work')).to.not.equal(observabilityNamespace('default'));
  });
});
