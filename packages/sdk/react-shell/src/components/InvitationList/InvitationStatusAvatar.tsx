//
// Copyright 2023 DXOS.org
//

import React, { ComponentPropsWithoutRef } from 'react';

import { getSize, mx } from '@dxos/aurora-theme';
import { Size } from '@dxos/aurora-types';
import { Invitation } from '@dxos/react-client/invitations';

import { inactiveStrokeColor, activeStrokeColor, resolvedStrokeColor } from '../../styles';
import { invitationStatusValue } from '../../util';
import { InvitationEmoji } from '../InvitationEmoji';

export interface InvitationStatusAvatarSlots {
  svg?: ComponentPropsWithoutRef<'svg'>;
}

export interface InvitationStatusAvatarProps {
  size?: Size;
  status: Invitation.State;
  haltedAt?: Invitation.State;
  slots?: InvitationStatusAvatarSlots;
  invitationId?: string;
}

const svgSize = 32;
const strokeWidth = 5;
const radius = (svgSize - strokeWidth) / 2;
const circumference = Math.PI * 2 * radius;
const gap = circumference / 12;
const nSegments = 3;
const segment = circumference / nSegments;
const baseOffset = (2 * circumference) / 3 - (segment - gap) / 2;

const circleProps: ComponentPropsWithoutRef<'circle'> = {
  fill: 'none',
  strokeLinecap: 'round',
  cx: svgSize / 2,
  cy: svgSize / 2,
  r: radius,
  strokeWidth,
  strokeDasharray: `${segment - gap} ${2 * segment + gap}`,
};

export const InvitationStatusAvatar = ({
  size = 10,
  status,
  haltedAt,
  slots = {},
  invitationId,
}: InvitationStatusAvatarProps) => {
  const resolvedColor = resolvedStrokeColor(status);
  const halted =
    status === Invitation.State.CANCELLED || status === Invitation.State.TIMEOUT || status === Invitation.State.ERROR;
  const cursor = invitationStatusValue.get(halted ? haltedAt! : status)!;
  return (
    <div className='inline-block relative'>
      <InvitationEmoji {...{ invitationId }} size='sm' className='absolute inset-0 text-base' />
      <svg {...slots.svg} viewBox={`0 0 ${svgSize} ${svgSize}`} className={mx(getSize(size), slots.svg?.className)}>
        {[...Array(nSegments)].map((_, index) => (
          <circle
            key={index}
            {...circleProps}
            strokeDashoffset={index * segment + baseOffset}
            className={
              index === 0
                ? cursor === 1
                  ? halted
                    ? resolvedColor
                    : activeStrokeColor
                  : cursor > 1
                  ? resolvedColor
                  : inactiveStrokeColor
                : index === 1
                ? cursor === 3
                  ? halted
                    ? resolvedColor
                    : activeStrokeColor
                  : cursor > 3
                  ? resolvedColor
                  : inactiveStrokeColor
                : cursor > 3
                ? resolvedColor
                : inactiveStrokeColor
            }
          />
        ))}
      </svg>
    </div>
  );
};
