//
// Copyright 2025 DXOS.org
//

import React from 'react';

export type PromptProps = { text?: string };

export const Prompt = ({ text }: PromptProps) => {
  return <div className='bg-red-500'>{text}</div>;
};
