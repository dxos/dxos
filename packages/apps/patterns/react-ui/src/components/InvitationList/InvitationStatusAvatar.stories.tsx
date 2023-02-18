//
// Copyright 2023 DXOS.org
//
import { StoryFn } from '@storybook/react';
import React from 'react';

import { Invitation } from '@dxos/client';
import { mx, ThemeContext } from '@dxos/react-components';

import { defaultSurface } from '../../styles';
import { InvitationStatusAvatar } from './InvitationStatusAvatar';

const haltedAts = [null, Invitation.State.CONNECTED, Invitation.State.AUTHENTICATING, Invitation.State.SUCCESS];

const statuses = [
  Invitation.State.INIT,
  Invitation.State.CONNECTING,
  Invitation.State.CONNECTED,
  Invitation.State.AUTHENTICATING,
  Invitation.State.SUCCESS,
  Invitation.State.CANCELLED,
  Invitation.State.TIMEOUT,
  Invitation.State.ERROR
];

export default {
  component: InvitationStatusAvatar
};

export const Default = {
  decorators: [
    (Story: StoryFn) => {
      return (
        <ThemeContext.Provider value={{ themeVariant: 'os' }}>
          <div
            className={mx(defaultSurface, 'max-is-md mli-auto rounded-md p-2 backdrop-blur-md flex flex-wrap gap-4')}
          >
            {haltedAts.map((haltedAt) => (
              <>
                {statuses.map((status) => {
                  return (
                    <Story key={`${status}__${haltedAt}`} args={{ status, ...(haltedAt !== null && { haltedAt }) }} />
                  );
                })}
              </>
            ))}
          </div>
        </ThemeContext.Provider>
      );
    }
  ]
};
