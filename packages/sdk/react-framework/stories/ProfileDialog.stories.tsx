//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { ProfileDialog } from '../src';

export default {
  title: 'react-framework/ProfileDialog'
};

export const Primary = () => {
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    return setOpen(false);
  };

  return (
    <ProfileDialog
      open={open}
      onCreate={handleClose}
      onCancel={handleClose}
    />
  );
};
