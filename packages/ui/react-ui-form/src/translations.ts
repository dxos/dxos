//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-form';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'fields.label': 'Fields',
        'hidden-fields.label': 'Hidden Fields',
        'empty-readonly-ref-field.label': '(none)',

        'add-property-button.label': 'Add property',
        'field-property.label': 'Property',
        'field-property.placeholder': 'Property name',
        'field-format.label': 'Type',
        'field-path.label': 'Field path',
        'add-field.button': 'Add field',
        'boolean-input-true.value': 'Yes',
        'boolean-input-false.value': 'No',
        'show-field.label': 'Show field',
        'hide-field.label': 'Hide field',
        'delete-field.label': 'Delete field',
        'ref-field-combobox-input.placeholder': 'Search…',
        'ref-field.placeholder_one': 'Select…',
        'ref-field.placeholder_other': 'Select items…',
        'create-option.label': 'Create',

        'example.placeholder': 'Example',
        'latitude.placeholder': 'Latitude (e.g., 40.7128)',
        'longitude.placeholder': 'Longitude (e.g., -74.0060)',

        'cancel-button.label': 'Cancel',
        'save-button.label': 'Save',

        // TypeFormat
        'format.boolean.label': 'Boolean',
        'format.currency.label': 'Currency',
        'format.date.label': 'Date',
        'format.date-time.label': 'DateTime',
        'format.did.label': 'DID',
        'format.duration.label': 'Duration',
        'format.dxn.label': 'DXN',
        'format.email.label': 'Email',
        'format.formula.label': 'Formula',
        'format.hostname.label': 'Hostname',
        'format.integer.label': 'Integer',
        'format.json.label': 'JSON',
        'format.lnglat.label': 'Geopoint',
        'format.markdown.label': 'Markdown',
        'format.percent.label': 'Percent',
        'format.ref.label': 'Reference',
        'format.regex.label': 'RegExp',
        'format.string.label': 'String',
        'format.single-select.label': 'Select',
        'format.multi-select.label': 'Multi-select',
        'format.text.label': 'Long text',
        'format.time.label': 'Time',
        'format.timestamp.label': 'Timestamp',
        'format.user.label': 'User',
        'format.number.label': 'Number',
        'format.uri.label': 'URI',
        'format.url.label': 'URL',
        'format.uuid.label': 'UUID',

        // GeoPointField.
        'latitude.label': 'Latitude',
        'longitude.label': 'Longitude',

        // SelectOptionsField.
        'select-option.label': 'Label',
        'select-option-label.placeholder': 'Option label',
        'select-option-delete.button': 'Delete',
        'select-option-add.button': 'Add option',

        // System schema message.
        'system-schema.title': 'System type',
        'system-schema.description': 'System type: cannot add or remove fields.',
        'remove.button': 'Remove',
        'ref-field.placeholder': '',
      },
    },
  },
] as const satisfies Resource[];
