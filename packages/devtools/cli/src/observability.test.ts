//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';

import { commandPath, observabilityNamespace, otelEndpoint, projectToken } from './observability';

describe('CLI observability', () => {
  // The event names a command, never what the user typed into it.
  test('names a command by its subcommand path, keeping flags and positionals out', ({ expect }) => {
    expect(commandPath(tree, [])).to.equal('dx');
    expect(commandPath(tree, ['space', 'list'])).to.equal('space list');
    expect(commandPath(tree, ['space', 'list', '--json'])).to.equal('space list');
    expect(commandPath(tree, ['chat', '--prompt', 'my private notes'])).to.equal('chat');
    expect(commandPath(tree, ['--profile', 'work', 'space', 'list'])).to.equal('dx');
    // Positionals are the payloads: a file to deploy, a space id, a function's input.
    expect(commandPath(tree, ['fn', 'invoke', 'someKey', '{"secret":1}'])).to.equal('fn invoke');
    expect(commandPath(tree, ['fn', 'deploy', '/Users/someone/private/script.ts'])).to.equal('fn deploy');
    // A token that is not a subcommand ends the path rather than being reported as one.
    expect(commandPath(tree, ['definitely-not-a-command'])).to.equal('dx');
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

type Node = { name: string; subcommands: { commands: Node[] }[] };

const node = (name: string, children: Node[] = []): Node => ({
  name,
  subcommands: children.length > 0 ? [{ commands: children }] : [],
});

/** Enough of the real tree to exercise the walk; `fn` is where the sensitive positionals live. */
const tree = node('dx', [node('space', [node('list')]), node('chat'), node('fn', [node('invoke'), node('deploy')])]);
