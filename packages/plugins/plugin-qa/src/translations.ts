//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { TestCase, TestPlan, TestRun } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(TestPlan.TestPlan)]: {
        'typename.label': 'Test plan',
        'typename.label_zero': 'Test plans',
        'typename.label_one': 'Test plan',
        'typename.label_other': 'Test plans',
        'object-name.placeholder': 'New test plan',
        'add-object.label': 'Add test plan',
        'rename-object.label': 'Rename test plan',
        'delete-object.label': 'Delete test plan',
      },
      [Type.getTypename(TestCase.TestCase)]: {
        'typename.label': 'Test case',
        'typename.label_other': 'Test cases',
      },
      [Type.getTypename(TestRun.TestRun)]: {
        'typename.label': 'Test run',
        'typename.label_other': 'Test runs',
      },
      [meta.profile.key]: {
        'plugin.name': 'QA',
        'cases.label': 'Cases',
        'runs.label': 'Runs',
        'no-cases.message': 'No cases yet.',
        'no-runs.message': 'No runs yet.',
        'unreported.label': 'unreported',
      },
    },
  },
] as const satisfies Resource[];
