//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { PullRequest } from '@dxos/types';

import * as Walkthrough from './Walkthrough.ts';

describe('Walkthrough', () => {
  test('holds the body, the commit and a ref to the pull request', () => {
    const pullRequest = makePullRequest();
    const walkthrough = Walkthrough.make({
      pullRequest: Ref.make(pullRequest),
      body: '# A change\n\nProse.\n',
      commit: 'deadbeef',
    });

    expect(Walkthrough.instanceOf(walkthrough)).to.eq(true);
    expect(walkthrough.body).to.eq('# A change\n\nProse.\n');
    expect(walkthrough.commit).to.eq('deadbeef');
    expect(walkthrough.pullRequest.target).to.eq(pullRequest);
  });

  test('is labelled by its title, falling back to the commit', () => {
    const pullRequest = makePullRequest();
    const titled = Walkthrough.make({
      pullRequest: Ref.make(pullRequest),
      title: Walkthrough.makeTitle(pullRequest),
      body: 'text',
      commit: 'abc',
    });
    const untitled = Walkthrough.make({ pullRequest: Ref.make(pullRequest), body: 'text', commit: 'abc' });

    expect(Obj.getLabel(titled)).to.eq(`${PullRequest.reference(pullRequest)}: ${pullRequest.title}`);
    expect(Obj.getLabel(untitled)).to.eq('abc');
  });

  test('the body is a plain string, not a text object', () => {
    const walkthrough = Walkthrough.make({
      pullRequest: Ref.make(makePullRequest()),
      body: 'text',
      commit: 'abc',
    });

    // A text object would replicate as a CRDT; this is replaced wholesale on every regeneration.
    expect(typeof walkthrough.body).to.eq('string');
  });

  test('is stale against any commit but the one it was generated from', () => {
    const walkthrough = Walkthrough.make({
      pullRequest: Ref.make(makePullRequest()),
      body: '',
      commit: 'abc123',
    });

    expect(Walkthrough.isStale(walkthrough, 'abc123')).to.eq(false);
    expect(Walkthrough.isStale(walkthrough, 'def456')).to.eq(true);
  });

  test('is an ECHO object of the expected type', () => {
    const walkthrough = Walkthrough.make({
      pullRequest: Ref.make(makePullRequest()),
      body: '',
      commit: 'abc',
    });

    expect(Obj.getTypename(walkthrough)).to.eq('org.dxos.type.walkthrough');
  });
});

const makePullRequest = () =>
  PullRequest.make({ owner: 'dxos', repo: 'dxos', number: 13082, title: 'A change', state: 'open' });
