//
// Copyright 2023 DXOS.org
//

import React, { forwardRef, ForwardRefExoticComponent, RefAttributes, useCallback } from 'react';

import { File as FileType } from '@braneframe/types';
import { List } from '@dxos/aurora';
import { DelegatorProps } from '@dxos/aurora-grid';
import { textBlockWidth } from '@dxos/aurora-theme';

import { FileUpload } from './FileUpload';
import { defaultFileTypes } from '../hooks';
import { StackModel } from '../types';

export const StackSections: ForwardRefExoticComponent<DelegatorProps<StackModel> & RefAttributes<HTMLOListElement>> =
  forwardRef<HTMLOListElement, DelegatorProps<StackModel>>(({ children }) => {
    const onAdd = useCallback((args: any) => {
      console.log('[add]', args);
    }, []);
    return (
      <List variant='ordered' itemSizes='many' classNames={[textBlockWidth, 'pli-2']}>
        {children}
        <FileUpload
          classNames='p-2'
          fileTypes={[...defaultFileTypes.images, ...defaultFileTypes.media, ...defaultFileTypes.text]}
          onUpload={(file: FileType) => {
            onAdd({ id: file.id, object: file });
          }}
        />
      </List>
    );
  });
