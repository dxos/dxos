//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { TestCase, TestPlan, TestRun } from '#types';

export const Schema = AppCapability.schema([TestPlan.TestPlan, TestCase.TestCase, TestRun.TestRun]);
