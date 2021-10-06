//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { ProfileDialog } from '../src';

const handleClose = () => {
  return null;
};

export default {
  title: 'ProfileDialog'
};

export const Primary = () => {
  return (
    <ProfileDialog open={true} onCreate={handleClose} onCancel={handleClose} />
  );
};
