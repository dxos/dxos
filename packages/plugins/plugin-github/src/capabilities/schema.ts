//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { PullRequest } from '@dxos/types';

import { Walkthrough } from '#types';

export const Schema = AppCapability.schema([Walkthrough.Walkthrough, PullRequest.PullRequest]);
