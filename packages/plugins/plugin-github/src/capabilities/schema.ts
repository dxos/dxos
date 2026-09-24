//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { PullRequest } from '@dxos/types';

import { Walkthrough } from '#types';

/**
 * `PullRequest` comes with `Walkthrough` because a walkthrough holds a ref to one, and a space that
 * can read the walkthrough has to be able to resolve what it points at.
 */
export const Schema = AppCapability.schema([Walkthrough.Walkthrough, PullRequest.PullRequest]);
