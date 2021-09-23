//
// Copyright 2020 DXOS.org
//

import { useState, useCallback, useEffect } from 'react';

import { Party } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { useProfile, useSelection } from '@dxos/react-client';

const ACTIVE_USERS_TYPE = 'ACTIVE_USERS_TYPE';

export const useSelectParty = () => {
  const profile = useProfile();
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [oldParty, setOldParty] = useState<Party | null>(null);
  const [activeUser, setActiveUser] = useState<any>(null);

  const user = useSelection(selectedParty?.database.select(s => s
    .filter({ type: ACTIVE_USERS_TYPE })
    .filter(item => item.model.getProperty('publicKey') === profile?.publicKey?.toString() && !item.model.getProperty('deleted'))
    .items)
  , [selectedParty, profile]);

  const userList = useSelection(selectedParty?.database.select(s => s
    .filter({ type: ACTIVE_USERS_TYPE })
    .filter(item => !item.model.getProperty('deleted'))
    .items)
  , [selectedParty]);

  const createPartyActiveUserModel = useCallback(async (party: Party) => {
    await party.database.createItem({
      type: ACTIVE_USERS_TYPE,
      model: ObjectModel,
      props: {
        username: profile?.username,
        publicKey: profile?.publicKey?.toString(),
        active: true,
        deleted: false
      }
    });
  }, [profile, user]);

  useEffect(() => {
    const createModel = async () => {
      if (selectedParty && (!user || user.length === 0)) {
        await createPartyActiveUserModel(selectedParty);
      }
    };
    void createModel();
  }, [user]);

  useEffect(() => {
    const deleteDupliactedUsers = async () => {
      const promise = user?.map(async (item: any, index: number) => {
        if (user[index + 1]) {
          await user[index + 1].model.setProperty('deleted', true);
        }
      });
      if (promise) {
        await Promise.all(promise);
      }
    };
    if (user && user?.length > 1) {
      void deleteDupliactedUsers();
    }
  }, [user]);

  const updateActiveStatus = async () => {
    if (user?.length === 1) {
      const currentUser = user[0];
      if (selectedParty?.key !== oldParty?.key) {
        await currentUser.model.setProperty('active', true);

        if (activeUser) {
          await activeUser.model.setProperty('active', false);
        }
        setActiveUser(currentUser);
        setOldParty(selectedParty);
      }
    }
  };

  useEffect(() => {
    void updateActiveStatus();
  }, [user]);

  //TODO(dtoloto): disable user status when they close browser tab

  return {
    setSelectedParty,
    selectedParty,
    userList
  };
};
