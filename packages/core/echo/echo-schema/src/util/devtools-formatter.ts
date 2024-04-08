//
// Copyright 2023 DXOS.org
//

import { type JsonML } from '@dxos/debug';

import { base, data } from '../object';

// TODO(dmaretskyi): Fix those to work with the new reactive API.

const idStyle = { style: 'color: #777' };
const listStyle = {
  style: 'list-style-type: none; padding: 0; margin: 0 0 0 12px; font-style: normal; position: relative',
};
const liStyle = { style: 'min-height: 16px;' };
const nestedObjectContainerStyle = { style: 'margin: -2px 0 0; display: inline-flex' };
const keyStyle = { style: 'color: #881391' };
const defaultValueKeyStyle = { style: 'color: #777' };
const alteredValueKeyStyle = { style: 'color: #881391; font-weight: bolder' };
const nullStyle = { style: 'color: #777' };

const defaultKeys = ['id', '__typename', '__schema', 'meta'];

export const getHeader = (obj: any /*TypedObject*/, config?: any): JsonML => {
  return [
    'span',
    {
      style: (config?.nested ? 'padding: 2px 0 0;' : '') + '\n height: 18px;',
    },
    `${obj[Symbol.toStringTag]}`,
    ['span', idStyle, `#${obj.id}`],
  ];
};

const formatValue = (object: any, config?: any): JsonML => {
  if (typeof object === 'undefined') {
    return ['span', nullStyle, 'undefined'];
  } else if (object === 'null') {
    return ['span', nullStyle, 'null'];
  } else {
    return ['span', nestedObjectContainerStyle, ['object', { object, config }]];
  }
};

export const getBody = (obj: any /*TypedObject*/): JsonML => {
  let objData = obj[data];
  objData = {
    id: obj.id,
    __typename: obj.__typename,
    __schema: obj.__schema,
    ...objData,
    meta: objData['@meta'],
    '[[Model]]': objData['@model'],
    '[[Base]]': obj[base],
  };
  delete objData['@id'];
  delete objData['@type'];
  delete objData['@model'];
  delete objData['@meta'];

  return [
    'ol',
    listStyle,
    ...Object.keys(objData).map(
      (key): JsonML => [
        'li',
        liStyle,
        [
          'span',
          defaultKeys.includes(key) ? keyStyle : key.startsWith('[[') ? defaultValueKeyStyle : alteredValueKeyStyle,
          key,
        ],
        ['span', {}, ': '],
        formatValue(objData[key], { nested: true }),
      ],
    ),
  ];
};
