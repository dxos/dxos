//
// Copyright 2023 DXOS.org
//

import { QRCodeSVG } from 'qrcode.react';
import React, { useEffect } from 'react';
import urlJoin from 'url-join';

import { Invitation, Space } from '@dxos/client';
import { useSpaceInvitation } from '@dxos/react-client';

export type KioskInvitationQrProps = {
  space?: Space;
};

export const KioskInvitationQr = ({ space }: KioskInvitationQrProps) => {
  const { connect, ...params } = useSpaceInvitation(space?.key);

  useEffect(() => {
    if (space) {
      connect(
        space.createInvitation({
          type: Invitation.Type.MULTIUSE,
          authMethod: Invitation.AuthMethod.NONE
        })
      );
    }
  }, [space]);

  if (!params.invitationCode) {
    return null;
  }

  console.log(createInvitationUrl(params.invitationCode));

  return (
    <QRCodeSVG
      value={createInvitationUrl(params.invitationCode)}
      includeMargin
      role='none'
      width={'100%'}
      height={'100%'}
    />
  );
};

const createInvitationUrl = (invitationCode: string) => {
  const { origin, pathname } = window.location;
  return urlJoin(origin, pathname, `/?spaceInvitationCode=${invitationCode}`);
};
