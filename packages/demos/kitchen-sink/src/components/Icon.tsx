//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import {
  CheckBoxOutlineBlank as DefaultIcon,
  Business as OrgIcon,
  PersonOutline as PersonIcon,
  WorkOutline as ProjectIcon,
} from '@mui/icons-material';

import { TestType } from '../testing';

const icons: { [i: string]: FC } = {
  [TestType.Org]: OrgIcon,
  [TestType.Person]: PersonIcon,
  [TestType.Project]: ProjectIcon
}

interface IconProps {
  type?: string
}

export const Icon = ({ type }: IconProps) => {
  const Icon = (type && icons[type]) || DefaultIcon;
  return <Icon />;
};
