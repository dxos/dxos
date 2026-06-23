//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';
import { translations as componentsTranslations } from '@dxos/react-ui-components/translations';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';

import { meta } from '#meta';
import { Routine } from '#types';

export const translations: Resource[] = [
  ...componentsTranslations,
  ...formTranslations,
  {
    'en-US': {
      [Type.getTypename(Routine.Routine)]: {
        'typename.label': 'Routine',
        'typename.label_zero': 'Routines',
        'typename.label_one': 'Routine',
        'typename.label_other': 'Routines',
        'object-name.placeholder': 'New routine',
        'add-object.label': 'Add routine',
        'rename-object.label': 'Rename routine',
        'delete-object.label': 'Delete routine',
      },
      [meta.profile.key]: {
        'plugin.name': 'Routine',
        'automation-panel.label': 'Automations',
        'create-panel.template.placeholder': 'Search templates...',

        'schedule.kind.once.label': 'Once',
        'schedule.kind.hourly.label': 'Hourly',
        'schedule.kind.daily.label': 'Daily',
        'schedule.kind.weekly.label': 'Weekly',
        'schedule.kind.monthly.label': 'Monthly',
        'schedule.kind.custom.label': 'Custom',
        'schedule.at.label': 'At',
        'schedule.on.label': 'On',
        'schedule.minute.label': 'At minute',
        'schedule.day.label': 'Day of month',
        'schedule.cron.label': 'Cron',
        'schedule.close.label': 'Close',
        'schedule.note.message': 'Runs are staggered by a few minutes to spread server load.',

        'command.placeholder': 'Enter slash command...',
        'template.placeholder': 'Enter template...',
        'run-prompt.label': 'Run prompt',
        'routine-running.label': 'Running…',
        'run.label': 'Run',
        'run-error.message': 'Failed to run automation.',

        'automation-name.label': 'Name',
        'general.title': 'General',
        'general.description': 'Name and description.',

        'actions.title': 'Actions',
        'actions.description': 'What this automation runs.',
        'action.placeholder': 'Select an operation or instructions',
        'action-input.label': 'Input',
        'action-kind.operation.label': 'Operation',
        'action-kind.instructions.label': 'Instructions',

        'triggers.title': 'Triggers',
        'triggers.description': 'When this automation runs.',
        'trigger-kind.placeholder': 'Select trigger type',
        'trigger-kind.timer.label': 'Schedule',
        'trigger-kind.timer.description': 'Run on a recurring schedule or once at a future time.',
        'trigger-kind.subscription.label': 'Query',
        'trigger-kind.subscription.description': 'Run when objects matching a query change.',
        'trigger-kind.webhook.label': 'Webhook',
        'trigger-kind.webhook.description': 'Trigger from a POST request.',
        'trigger-kind.feed.label': 'Feed',
        'trigger-kind.feed.description': 'Run when a new item arrives in a feed.',
        'trigger-kind.email.label': 'Email',
        'trigger-kind.email.description': 'Run when an email is received.',
        'trigger-kind.clear.label': 'Clear',
        'trigger-kind.query-stub.message': 'Query editing is not yet available.',
        'trigger-kind.email-note.message': 'Runs whenever a new email is received.',

        'method.label': 'Method',
        'port.label': 'Port',
        'cron.placeholder': '0 0 * * *',
        'feed.placeholder': 'Select a feed',
        'enabled.label': 'Enabled',
        'enabled.description': 'Turn this automation on or off.',
        'add-trigger.label': 'Add trigger',
        'add-trigger-first.message': 'Add a trigger to enable.',
        'remove-trigger.label': 'Remove',
        'select-action-first.message': 'Select an action first.',
        'automation-companion.label': 'Routine',
        'no-automations.message': 'No automations for this object.',
        'automation-not-associated.message': 'Not yet associated with this object.',
        'automation-detached.message': 'No longer associated with this object.',
        'add-automation.label': 'Add automation',
        'save.label': 'Save',
        'cancel.label': 'Cancel',

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
