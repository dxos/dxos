//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin name': 'Automation',
        'automation panel label': 'Automations',
        'script automation label': 'Automation',
        'automation verbose label': 'Manage automations',
        'automation description': 'You can manage all the triggers which automate your space here.',

        'runtime label': 'Enable Local Runtime',
        'runtime description':
          'This will start a trigger dispatcher locally for this space to run triggers on your device while Composer is running.',

        'functions panel label': 'Functions',
        'functions verbose label': 'Manage deployed functions',
        'functions registry verbose label': 'Functions registry',
        'functions registry description': 'Import functions from the registry',
        'functions description': 'You can manage all the functions deployed from your space on EDGE here.',
        'function copy id': 'Copy Function ID',
        'no functions found': 'No functions found',
        'go to function source button label': 'Show function source',
        'delete function button label': 'Delete function',

        'trigger editor title': 'Configure Trigger',
        'new trigger label': 'Add Trigger',
        'trigger type timer': 'Timer',
        'trigger type webhook': 'Webhook',
        'trigger type websocket': 'Websocket',
        'trigger type subscription': 'Subscription',
        'trigger type email': 'Email',
        'trigger type queue': 'Queue',

        'trigger copy url': 'Copy URL',
        'trigger copy email': 'Copy Email',

        'trigger payload add': 'Add',
        'trigger payload remove': 'Remove',
        'trigger payload prop name placeholder': 'New payload property name',
      },
    },
  },
] as const satisfies Resource[];
