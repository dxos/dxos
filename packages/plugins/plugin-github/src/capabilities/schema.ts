//
// Copyright 2026 DXOS.org
//

import { PullRequest } from '@dxos/types';

import { Walkthrough } from '#types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle, so naming them
 * here keeps them out of the plugin body's module graph.
 *
 * `PullRequest` comes with `Walkthrough` because a walkthrough holds a ref to one, and a space that
 * can read the walkthrough has to be able to resolve what it points at.
 */
export default [Walkthrough.Walkthrough, PullRequest.PullRequest];
