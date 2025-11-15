//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = 'react-ui-form';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'fields label': 'Fields',
        'hidden fields label': 'Hidden Fields',
        'empty readonly ref field label': '(none)',

        // TODO(burdon): Standardize field/property.
        'add property button label': 'Add property',
        'field property label': 'Property',
        'field property placeholder': 'Property name',
        'field format label': 'Type',
        'field path label': 'Field path',
        'add field': 'Add field',
        'delete field': 'Delete field',
        'field limit reached': 'Maximum number of fields reached',
        'boolean input true value': 'Yes',
        'boolean input false value': 'No',
        'show field label': 'Show field',
        'hide field label': 'Hide field',
        'delete field label': 'Delete field',
        'ref field combobox input placeholder': 'Search…',
        'ref field placeholder_one': 'Select…',
        'ref field placeholder_other': 'Select items…',

        // TODO(burdon): Factor out?
        'cancel button label': 'Cancel',
        'save button label': 'Save',

        // FormatEnum
        'format boolean': 'Boolean',
        'format currency': 'Currency',
        'format date': 'Date',
        'format date-time': 'DateTime',
        'format did': 'DID',
        'format duration': 'Duration',
        'format dxn': 'DXN',
        'format email': 'Email',
        'format formula': 'Formula',
        'format hostname': 'Hostname',
        'format integer': 'Integer',
        'format json': 'JSON',
        'format lnglat': 'Geopoint',
        'format markdown': 'Markdown',
        'format percent': 'Percent',
        'format ref': 'Reference',
        'format regex': 'RegExp',
        'format string': 'String',
        'format single-select': 'Select',
        'format multi-select': 'Multi-select',
        'format text': 'Long text',
        'format time': 'Time',
        'format timestamp': 'Timestamp',
        'format user': 'User',
        'format number': 'Number',
        'format uri': 'URI',
        'format url': 'URL',
        'format uuid': 'UUID',

        // GeoPointInput.
        'latitude label': 'Latitude',
        'longitude label': 'Longitude',

        // SelectOptionsInput.
        'select option label': 'Label',
        'select option label placeholder': 'Option label',
        'select option color': 'Color',
        'select option delete': 'Delete',
        'select option add': 'Add option',

        // System schema message.
        'system schema title': 'System type',
        'system schema description':
          'This is a system type and cannot be modified, though the view can still be configured.',
      },
    },
  },
] as const satisfies Resource[];
