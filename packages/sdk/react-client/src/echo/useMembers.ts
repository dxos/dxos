//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { SpaceMember, PublicKey } from '@dxos/client';

import { useSpace } from './useSpaces';

export const useMembers = (spaceKey: PublicKey | undefined): SpaceMember[] => {
  const space = useSpace(spaceKey);
  const [members, setMembers] = useState<SpaceMember[]>([]);

  useEffect(() => {
    if (!space) {
      return;
    }

    const result = space.queryMembers();
    setMembers(result.value);

    return result.subscribe(() => {
      setMembers(result.value);
    });
  }, [space?.key.toString()]);

  return members;
};
