//
// Copyright 2023 DXOS.org
//

import { type JsonML } from '@dxos/debug';

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

const defaultKeys = ['id', '@type', '@meta'];

export const getHeader = (tag: string, id: string, config?: any): JsonML => [
  'span',
  {
    style: (config?.nested ? 'padding: 2px 0 0;' : '') + '\n height: 18px;',
  },
  `${tag}`,
  ['span', idStyle, `#${id}`],
];

const formatValue = (object: any, config?: any): JsonML => {
  if (typeof object === 'undefined') {
    return ['span', nullStyle, 'undefined'];
  } else if (object === 'null') {
    return ['span', nullStyle, 'null'];
  } else {
    return ['span', nestedObjectContainerStyle, ['object', { object, config }]];
  }
};

export const getBody = (objData: any): JsonML => [
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
