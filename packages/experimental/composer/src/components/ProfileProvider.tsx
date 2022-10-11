
//
// Copyright 2022 DXOS.org
//

import React, {
  createContext,
  PropsWithChildren,
  useEffect,
  useMemo,
  useContext
} from 'react';

import { useClient, useProfile as useNaturalProfile } from '@dxos/react-client';
import { Loading } from '@dxos/react-ui';

export type Profile = ReturnType<typeof useNaturalProfile>

export interface ProfileContextValue {
  profile?: Profile
}

export const ProfileContext = createContext<ProfileContextValue>({});

export const ProfileProvider = (props: PropsWithChildren<{}>) => {
  const client = useClient();
  const profile = useNaturalProfile();

  const profileContextValue = useMemo(() => ({ profile }), [profile]);

  useEffect(() => {
    if (client && !profile) {
      void client.halo.createProfile();
    }
  }, [client, profile]);

  return (
    <ProfileContext.Provider value={profileContextValue}>
      {(client && profile) ? props.children : <Loading />}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
