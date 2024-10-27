//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type SheetType } from '../../types';

export type RangeListProps = {
  sheet: SheetType;
};

export const RangeList = ({ sheet }: RangeListProps) => {
  const ranges = sheet.ranges;
  return <div className='p-2'>{JSON.stringify({ ranges })}</div>;
};
