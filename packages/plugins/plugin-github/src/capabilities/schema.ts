//
// Copyright 2026 DXOS.org
//

import { PullRequest } from '@dxos/types';

import { Walkthrough } from '#types';

/**
 * Schemas this plugin registers, in a module of their own so they are loaded on demand rather than
 * from the plugin body's graph.
 *
 * `PullRequest` comes with `Walkthrough` because a walkthrough holds a ref to one, and a space that
 * can read the walkthrough has to be able to resolve what it points at.
 */
export default [Walkthrough.Walkthrough, PullRequest.PullRequest];
