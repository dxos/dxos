//
// Copyright 2020 DXOS.org
//

import React from 'react';
import ProfileDialog from '../src/components/ProfileDialog';

export const ProfileDialogStory = () => {
  const handleRegistration = ({ username }) => alert(`Registered ${username}`);

  return (
    <ProfileDialog open={true} onClose={handleRegistration} />
  );
};
