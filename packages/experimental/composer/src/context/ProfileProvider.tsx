//
// Copyright 2022 DXOS.org
//

import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

import type { Profile } from '@dxos/client';
import { useClient } from '@dxos/react-client';

import { ProviderFallback } from '../components';

export interface ProfileContextValue {
  profile?: Profile
}

export const ProfileContext = createContext<ProfileContextValue>({});

export const ProfileProvider = (props: PropsWithChildren<{}>) => {
  const client = useClient();
  const [profile, setProfile] = useState(() => client.halo.profile);

  useEffect(
    () => client.halo.subscribeToProfile(() => setProfile(client.halo.profile)),
    [client]
  );

  const profileContextValue = useMemo(() => ({ profile }), [profile]);

  useEffect(() => {
    if (client && !profile) {
      void client.halo.createProfile();
    }
  }, [client, profile]);

  return (
    <ProfileContext.Provider value={profileContextValue}>
      {profile ? props.children : <ProviderFallback message='Setting profile…' />}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
