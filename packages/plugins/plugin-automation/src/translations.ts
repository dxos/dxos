//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Automation',
        'automation-panel.label': 'Automations',
        'script-automation.label': 'Automation',
        'automation-verbose.label': 'Manage automations',
        'automation.description': 'Triggers that automate this space.',

        'runtime.label': 'Trigger runtime location',
        'runtime.description': 'Determines where the triggers in this space will execute.',
        'runtime.disabled.label': 'Triggers disabled',
        'runtime.local.label': 'Local',
        'runtime.edge.label': 'EDGE (experimental)',

        'functions-panel.label': 'Functions',
        'functions-verbose.label': 'Manage deployed functions',
        'functions-registry-verbose.label': 'Functions registry',
        'functions-registry.description': 'Import functions from the registry',
        'functions.description': 'Functions deployed from this space on EDGE.',
        'show-source-button.label': 'Show source',
        'delete-function-button.label': 'Delete function',

        'function-parameters.label': 'Function parameters',

        'trigger-editor.title': 'Configure Trigger',
        'trigger-editor.description':
          'Triggers are used to run functions at specific times or when specific events occur.',
        'new-trigger.label': 'Add Trigger',

        'trigger-type.timer.label': 'Timer',
        'trigger-type.webhook.label': 'Webhook',
        'trigger-type.websocket.label': 'Websocket',
        'trigger-type.subscription.label': 'Subscription',
        'trigger-type.email.label': 'Email',
        'trigger-type.feed.label': 'Feed',

        'trigger-payload-prop-name.placeholder': 'New payload property name',
        'import-function-button.label': 'Loading...',
        'update-function-button.label': 'Update',
        'loading-functions.message': 'Loading functions...',

        'edge.trigger.status.loading.message': 'Loading edge trigger status…',
        'edge.trigger.status.unavailable.message': 'Edge trigger status unavailable',
        'edge.trigger.status.dispatcher.label': 'Edge dispatcher: {{state}}',
        'edge.trigger.status.active.label': 'active',
        'edge.trigger.status.inactive.label': 'inactive',
        'edge.trigger.status.next.cron.label': 'Next cron run: {{time}}',
        'edge.trigger.status.next.alarm.label': 'Next alarm: {{time}}',
        'edge.trigger.status.inactivity.label': 'Inactivity timeout: {{remaining}} remaining',
        'edge.trigger.status.registered.label': 'Edge: registered',
        'edge.trigger.status.not.registered.label': 'Edge: not registered',
        'edge.trigger.status.registered.count.label': 'Enabled cron triggers on edge: {{registered}} / {{total}}',
        'edge.trigger.status.cron.na.label': 'Edge: cron registration n/a',
        'edge.trigger.status.disabled.detail.label': 'disabled',
      },
    },
  },
] as const satisfies Resource[];
