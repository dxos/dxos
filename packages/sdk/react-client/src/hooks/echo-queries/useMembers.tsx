//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { Party, PartyMember } from '@dxos/client';

export const useMembers = (party: Party | undefined) => {
  const [members, setMembers] = useState<PartyMember[]>([]);

  useEffect(() => {
    if (!party) {
      return;
    }

    const result = party.queryMembers();
    setMembers(result.value);

    return result.subscribe(() => {
      // TODO(wittjosiah): Remove interval.
      const update = setInterval(() => {
        const newMembers = party.queryMembers().value;
        const isNameFilled = newMembers.every((m) => m.displayName);
        setMembers(newMembers);
        if (isNameFilled) {
          clearInterval(update);
        }
      }, 1000);
    });
  }, [party?.key.toString()]);

  return members;
};
