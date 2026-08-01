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
        'automation-panel.label': 'Routines',
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
        'run-error.message': 'Failed to run routine.',

        'automation-name.label': 'Name',
        'general.title': 'General',
        'general.description': 'Name and description.',

        'actions.title': 'Actions',
        'actions.description': 'What this routine runs.',
        'action.placeholder': 'Select an operation or instructions',
        'action-input.label': 'Input',
        'action-kind.operation.label': 'Operation',
        'action-kind.instructions.label': 'Instructions',

        'triggers.title': 'Triggers',
        'triggers.description': 'When this routine runs.',
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
        'enabled.description': 'Turn this routine on or off.',
        'add-trigger.label': 'Add trigger',
        'add-trigger-first.message': 'Add a trigger to enable.',
        'remove-trigger.label': 'Remove',
        'select-action-first.message': 'Select an action first.',
        'automation-companion.label': 'Routine',
        'routine-runs.label': 'Runs',

        'history.empty.message': 'No runs yet.',
        'history.status.success.label': 'Success',
        'history.status.failure.label': 'Failed',
        'history.status.pending.label': 'Running',
        'no-routines.message': 'No routines for this object.',
        'routine-not-associated.message': 'Not yet associated with this object.',
        'routine-detached.message': 'No longer associated with this object.',
        'add-routine.label': 'Add routine',
        'routine-actions.label': 'Routine actions',
        'disabled.label': 'Disabled',
        'delete.label': 'Delete',
        'save.label': 'Save',
        'cancel.label': 'Cancel',

        'testing.title': 'Testing',
        'force-run.label': 'Force run',
        'reset-cursor.label': 'Reset feed cursor',
        'reset-cursor-confirm.label': 'Confirm reset feed cursor',

        'routine-verbose.label': 'Manage routines',
        'routine.description': 'Manage where routines in this space run.',

        'runtime.label': 'Enable triggers',
        'runtime.description': "Run this space's triggers. Individual triggers can be routed to the edge.",
      },
    },
  },
] as const satisfies Resource[];
