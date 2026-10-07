//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Host from './Host.ts';
import * as Options from './Options.ts';

describe('Session', () => {
  test('starts without a session until a turn reports one', () => {
    expect(new Host.Session().sessionId).to.be.undefined;
  });

  test('adopts the session it was told to resume', () => {
    expect(new Host.Session({ resume: 'session-1' }).sessionId).to.eq('session-1');
  });

  test('a fork branches from the parent session', () => {
    const parent = new Host.Session({ resume: 'session-1' });
    expect(parent.fork().sessionId).to.eq('session-1');
  });

  test('a fork of a session that never ran has nothing to branch from', () => {
    expect(new Host.Session().fork().sessionId).to.be.undefined;
  });
});

describe('Options', () => {
  test('carries resume through', () => {
    expect(Options.make({ cwd: '/tmp', resume: 'session-1' }).resume).to.eq('session-1');
  });

  test('drops forkSession when there is nothing to fork from', () => {
    expect(Options.make({ cwd: '/tmp', forkSession: true }).forkSession).to.be.undefined;
  });

  test('keeps forkSession alongside resume', () => {
    expect(Options.make({ cwd: '/tmp', resume: 'session-1', forkSession: true }).forkSession).to.be.true;
  });

  test('pins the read-only permission posture', () => {
    const options = Options.make({ cwd: '/tmp' });
    expect(options.permissionMode).to.eq('dontAsk');
    expect(options.allowedTools).to.deep.eq([...Options.READ_ONLY_TOOLS]);
    expect(options.settingSources).to.deep.eq([]);
  });
});
