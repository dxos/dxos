//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Automation } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Automation.Automation)]: {
        'typename.label': 'Automation',
        'typename.label_zero': 'Automations',
        'typename.label_one': 'Automation',
        'typename.label_other': 'Automations',
        'object-name.placeholder': 'New automation',
        'add-object.label': 'Add automation',
        'rename-object.label': 'Rename automation',
        'delete-object.label': 'Delete automation',
      },
      [meta.profile.key]: {
        'plugin.name': 'Automation',
        'automation-panel.label': 'Automations',
        'create-panel.template.placeholder': 'Search templates...',

        'command.placeholder': 'Enter slash command...',
        'template.placeholder': 'Enter template...',
        'run-prompt.label': 'Run prompt',
        'routine-running.label': 'Running…',

        'automation-name.label': 'Name',
        'general.title': 'General',
        'general.description': 'Name and status.',
        'action.title': 'Action',
        'action.description': 'What this automation runs.',
        'action.placeholder': 'Select an operation or routine',
        'action-input.label': 'Input',
        'action-kind.operation.label': 'Operation',
        'action-kind.routine.label': 'Routine',
        'trigger-picker.title': 'Trigger',
        'trigger-picker.description': 'When this automation runs.',
        'trigger-kind.placeholder': 'Select trigger type',
        'trigger-kind.timer.label': 'Schedule',
        'trigger-kind.feed.label': 'Feed',
        'cron.placeholder': '0 0 * * *',
        'feed.placeholder': 'Select a feed',
        'enabled.label': 'Enabled',
        'enabled.description': 'Turn this automation on or off.',
        'add-trigger.label': 'Add trigger',
        'add-trigger-first.message': 'Add a trigger to enable.',
        'remove-trigger.label': 'Remove',
        'select-action-first.message': 'Select an action first.',
        'automation-companion.label': 'Automation',
        'no-automations.message': 'No automations for this object.',
        'automation-not-associated.message': 'Not yet associated with this object.',
        'automation-detached.message': 'No longer associated with this object.',

        'testing.title': 'Testing',
        'force-run.label': 'Force run',
        'reset-cursor.label': 'Reset feed cursor',
        'reset-cursor-confirm.label': 'Confirm reset feed cursor',

        'automation-verbose.label': 'Manage automations',
        'automation.description': 'Manage where automations in this space run.',

        'runtime.label': 'Runtime location',
        'runtime.description': 'Determines where automations in this space run.',
        'runtime.disabled.label': 'Disabled',
        'runtime.local.label': 'Local',
        'runtime.edge.label': 'EDGE (experimental)',
      },
    },
  },
] as const satisfies Resource[];
