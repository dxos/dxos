//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { AUTOMATION_PLUGIN } from './meta';

export const translations: Resource[] = [
  {
    'en-US': {
      [AUTOMATION_PLUGIN]: {
        'plugin name': 'Automation',
        'automation panel label': 'Automations',
        'script automation label': 'Automation',
        'automation verbose label': 'Manage automations',
        'automation description': 'You can manage all the triggers which automate your space here.',

        'functions panel label': 'Functions',
        'functions verbose label': 'Manage deployed functions',
        'functions description': 'You can manage all the functions deployed from your space on EDGE here.',
        'function copy id': 'Copy Function ID',
        'no functions found': 'No functions found',
        'go to function source button label': 'Show function source',

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

export default translations;
