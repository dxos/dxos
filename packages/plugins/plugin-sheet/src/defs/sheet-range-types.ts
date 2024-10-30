//
// Copyright 2024 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui';

import { type SheetType } from '../types';

export const alignKey = 'align';
export type AlignKey = typeof alignKey;
export type AlignValue = 'start' | 'center' | 'end' | 'unset';

export const commentKey = 'comment';
export type CommentKey = typeof commentKey;
export type CommentValue = string;

export const styleKey = 'style';
export type StyleKey = typeof styleKey;
export type StyleValue = 'highlight' | 'unset';

// TODO(burdon): Reconcile with plugin-table.
export const cellClassNameForRange = ({ key, value }: SheetType['ranges'][number]): ClassNameValue => {
  switch (key) {
    case 'align':
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
    case 'comment':
      return 'bg-gridComment';
    case 'style':
      switch (value) {
        case 'highlight':
          return 'bg-gridHighlight';
        default:
          return undefined;
      }
    default:
      return undefined;
  }
};
