//
// Copyright 2022 DXOS.org
//

import React from 'react';

export interface AuthChoicesProps {
  create?: boolean
  recover?: boolean
  inviteDevice?: boolean
}

export const AuthChoices = (props: AuthChoicesProps) => {
  return <div role='main'>Auth choices</div>;
};
