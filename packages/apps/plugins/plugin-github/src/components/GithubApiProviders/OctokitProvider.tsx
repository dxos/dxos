//
// Copyright 2023 DXOS.org
//

import { Octokit } from 'octokit';
import React, { Context, createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { useKeyStore } from '@dxos/react-client/halo';

export type OctokitContextValue = {
  pat: string;
  setPat: (nextPat: string) => Promise<void>;
  patError: 'failed' | null;
  octokit: Octokit | null;
};

export const OctokitContext: Context<OctokitContextValue> = createContext<OctokitContextValue>({
  pat: '',
  setPat: async () => {},
  patError: null,
  octokit: null,
});

// TODO(burdon): github.com/settings/pat
const GhPatKey = 'com.github.pat';

export const useOctokitContext = () => useContext(OctokitContext);

export const OctokitProvider = ({ children }: PropsWithChildren<{}>) => {
  const [keyMap, setKey] = useKeyStore([GhPatKey]);
  const pat = keyMap.get(GhPatKey) ?? '';

  const [octokit, setOctokit] = useState<Octokit | null>(null);
  const [patError, setPatError] = useState<OctokitContextValue['patError']>(null);

  const setPat = async (nextPat: string) => {
    setKey(GhPatKey, nextPat);
    if (nextPat) {
      const nextOctokit = new Octokit({ auth: nextPat });
      return nextOctokit.rest.users.getAuthenticated().then(
        () => {
          setPatError(null);
          setOctokit(nextOctokit);
        },
        (err) => {
          log.warn('Failed to authenticate Octokit from PAT', err);
          setPatError('failed');
          setOctokit(null);
        },
      );
    } else {
      setOctokit(null);
    }
  };

  useEffect(() => {
    if (pat && !octokit) {
      void setPat(pat);
    }
  }, [pat, octokit]);

  return <OctokitContext.Provider value={{ pat, setPat, patError, octokit }}>{children}</OctokitContext.Provider>;
};
