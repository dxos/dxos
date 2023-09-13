//
// Copyright 2023 DXOS.org
//

import { QRCodeSVG } from 'qrcode.react';
import React, { FC, useEffect } from 'react';
import urlJoin from 'url-join';

import { Space, useSpaceInvitation } from '@dxos/react-client/echo';
import { Invitation } from '@dxos/react-client/invitations';

// TODO(burdon): Factor out.
const createInvitationUrl = (invitationCode: string) => {
  const { origin, pathname } = window.location;
  return urlJoin(origin, pathname, `/?spaceInvitationCode=${invitationCode}`);
};

/**
 * Experiment for direct invitations.
 * @deprecated
 */
export const InvitationQRCode: FC<{ space?: Space }> = ({ space }) => {
  const { connect, ...params } = useSpaceInvitation(space?.key);
  useEffect(() => {
    if (space) {
      // TODO(burdon): Disconnect on exit?
      connect(
        space.share({
          type: Invitation.Type.MULTIUSE,
          authMethod: Invitation.AuthMethod.NONE,
        }),
      );
    }
  }, [space]);

  if (!params.invitationCode) {
    return null;
  }

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
