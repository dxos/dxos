//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Automation',
        'automation-panel.label': 'Automations',
        'script-automation.label': 'Automation',
        'automation-verbose.label': 'Manage automations',
        'automation.description': 'You can manage all the triggers which automate your space here.',

        'runtime.label': 'Enable Local Runtime',
        'runtime.description':
          'This will start a trigger dispatcher locally for this space to run triggers on your device while Composer is running.',

        'functions-panel.label': 'Functions',
        'functions-verbose.label': 'Manage deployed functions',
        'functions-registry-verbose.label': 'Functions registry',
        'functions-registry.description': 'Import functions from the registry',
        'functions.description': 'You can manage all the functions deployed from your space on EDGE here.',
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
        'trigger-type.queue.label': 'Feed',

        'trigger-payload-prop-name.placeholder': 'New payload property name',
        'import-function-button.label': 'Loading...',
        'loading-functions.message': 'Loading functions...',
        'update-function-button.label': 'Update',
      },
    },
  },
] as const satisfies Resource[];
