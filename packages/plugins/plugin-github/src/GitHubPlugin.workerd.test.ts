//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';
import { PullRequest } from '@dxos/types';

import * as GitHubPlugin from './GitHubPlugin.ts';
import { GitHubOperation, Walkthrough } from './types/index.ts';

describe('GitHubPlugin in workerd', () => {
  test('activates headless and contributes its operations and types', async ({ expect }) => {
    const { failures, operationKeys, typenames } = await activateHeadlessPlugins([GitHubPlugin.make()]);
    expect(failures).toEqual([]);
    expect(operationKeys).toContain(String(GitHubOperation.ImportPullRequest.meta.key));
    expect(typenames).toContain(Type.getTypename(PullRequest.PullRequest));
    expect(typenames).toContain(Type.getTypename(Walkthrough.Walkthrough));
  });
});
