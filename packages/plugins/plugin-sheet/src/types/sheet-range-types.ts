//
// Copyright 2024 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui';

import { type Sheet } from '../types';

export const alignKey = 'alignment';
export type AlignKey = typeof alignKey;
export type AlignValue = 'start' | 'center' | 'end';

export const commentKey = 'comment';
export type CommentKey = typeof commentKey;
export type CommentValue = string;

export const styleKey = 'style';
export type StyleKey = typeof styleKey;
export type StyleValue = 'highlight' | 'softwrap';

// TODO(burdon): Reconcile with plugin-table.
export const cellClassNameForRange = ({ key, value }: Sheet.Sheet['ranges'][number]): ClassNameValue => {
  switch (key) {
    case alignKey:
      switch (value) {
        case 'start':
          return 'text-start';
        case 'center':
          return 'text-center';
        case 'end':
          return 'text-end';
        default:
          return undefined;
      }

    case commentKey:
      return 'bg-gridComment';

    case styleKey:
      switch (value) {
        case 'highlight':
          return '!bg-gridHighlight';
        case 'softwrap':
          return '!whitespace-normal';
        default:
          return undefined;
      }

    default:
      return undefined;
  }
};
