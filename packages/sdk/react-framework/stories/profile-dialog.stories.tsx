//
// Copyright 2021 DXOS.org
//

import React from 'react';

import ProfileDialog from '../src/components/ProfileDialog';

const handleClose = () => {
  return null;
};

export const ProfileDialogStory = () => {
  return (
    <ProfileDialog open={true} onClose={handleClose} />
  );
};

export default {
  title: 'React Framework/ProfileDialog Component',
  component: ProfileDialogStory
};
