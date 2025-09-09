//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type XmlComponentProps } from '../extensions';

export type PromptProps = XmlComponentProps<{ children: string[] }>;

// TODO(burdon): Reconcile with ChatMessage.
export const Prompt = ({ children }: PromptProps) => {
  return (
    <div className='flex justify-end'>
      <div className='p-2 rounded-sm bg-green-500'>
        {children
          ?.filter((child) => typeof child === 'string')
          .map((child, i) => (
            <div key={i}>{child}</div>
          ))}
      </div>
    </div>
  );
};
