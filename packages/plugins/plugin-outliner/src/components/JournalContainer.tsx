//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type JournalType } from '../types';

export type JournalContainerProps = {
  role: string;
  journal: JournalType;
};

export const JournalContainer = ({ role, journal }: JournalContainerProps) => {
  return <div>JournalContainer</div>;
};
