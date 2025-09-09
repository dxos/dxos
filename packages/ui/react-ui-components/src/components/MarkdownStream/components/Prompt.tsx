//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type XmlComponentProps } from '../extensions';

export type PromptProps = XmlComponentProps<{ children: string[] }>;

// TODO(burdon): Reconcile with ChatMessage.
export const Prompt = ({ children }: PromptProps) => {
  const text = children?.[0];
  if (typeof text !== 'string') {
    return null;
  }

  return (
    <div className='flex justify-end'>
      {/* TODO(burdon): Use current user message style. */}
      <div className='p-2 rounded-sm bg-green-500'>{text}</div>
    </div>
  );
};
