//
// Copyright 2023 DXOS.org
//

import { Octokit } from 'octokit';
import React, { Context, createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

import { useSettings } from '@braneframe/plugin-settings';
import { log } from '@dxos/log';

export type OctokitContextValue = {
  pat: string;
  setPat: (nextPat: string) => Promise<void>;
  patError: 'failed' | null;
  octokit: Octokit | null;
};

export const OctokitContext: Context<OctokitContextValue> = createContext<OctokitContextValue>({
  pat: '', // TODO(burdon): Access settings directly.
  setPat: async () => {},
  patError: null,
  octokit: null,
});

// TODO(burdon): github.com/settings/pat
const GITHUB_PAT = 'com.github.pat';

export const useOctokitContext = () => useContext(OctokitContext);

export const OctokitProvider = ({ children }: PropsWithChildren<{}>) => {
  const settings = useSettings();
  const [octokit, setOctokit] = useState<Octokit | null>(null);
  const [patError, setPatError] = useState<OctokitContextValue['patError']>(null);

  const setPat = async (nextPat: string) => {
    settings.setKey(GITHUB_PAT, nextPat);
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

  const pat = settings.getKey(GITHUB_PAT);
  useEffect(() => {
    if (pat && !octokit) {
      void setPat(pat);
    }
  }, [pat, octokit]);

  return <OctokitContext.Provider value={{ pat, setPat, patError, octokit }}>{children}</OctokitContext.Provider>;
};
