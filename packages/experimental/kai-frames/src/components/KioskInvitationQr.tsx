import React from 'react';
import { Invitation, Space } from "@dxos/client";
import { raise } from "@dxos/debug";
import { useSpaceInvitation } from "@dxos/react-client";
import { CompactQrCode, getSize } from "@dxos/react-components";
import { useEffect, useState } from "react";
import urlJoin from "url-join";
import { QRCodeSVG } from 'qrcode.react';

export type KioskInvitationQrProps = {
  space?: Space;
};

export const KioskInvitationQr = ({ space }: KioskInvitationQrProps) => {
  const { connect, ...params } = useSpaceInvitation(space?.key)

  useEffect(() => {
    if (space) {
      connect(space.createInvitation({
        type: Invitation.Type.MULTIUSE,
        authMethod: Invitation.AuthMethod.NONE,
      }))
    }
  }, [space])

  if (!params.invitationCode) {
    return null
  }

  console.log(createInvitationUrl(params.invitationCode))

  return (
    <QRCodeSVG
      value={createInvitationUrl(params.invitationCode)}
      includeMargin
      role='none'
      width={`100%`}
      height={`100%`}
    />
  )
}

const createInvitationUrl = (invitationCode: string) => {
  const { origin, pathname } = window.location;
  return urlJoin(origin, pathname, `/?spaceInvitationCode=${invitationCode}`);
};