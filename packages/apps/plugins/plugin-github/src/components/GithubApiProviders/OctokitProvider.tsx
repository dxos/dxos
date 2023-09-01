//
// Copyright 2023 DXOS.org
//

import { Octokit } from 'octokit';
import React, { Context, createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

import { LocalStorageStore } from '@dxos/local-storage';
import { log } from '@dxos/log';

export type OctokitContextValue = {
  pat: string;
  setPat: (nextPat: string) => Promise<void>;
  patError: 'failed' | null;
  octokit: Octokit | null;
};

export const OctokitContext: Context<OctokitContextValue> = createContext<OctokitContextValue>({
  pat: '', // TODO(burdon): Access settings directly?
  setPat: async () => {},
  patError: null,
  octokit: null,
});

export const useOctokitContext = () => useContext(OctokitContext);

export const OctokitProvider = ({ children }: PropsWithChildren<{}>) => {
  const [octokit, setOctokit] = useState<Octokit | null>(null);
  const [patError, setPatError] = useState<OctokitContextValue['patError']>(null);

  const settings = new LocalStorageStore<{ pat: string }>();
  useEffect(() => {
    settings.bind(settings.values.$pat!, 'braneframe.plugin-github.pat', LocalStorageStore.string);
    return () => settings.close();
  }, []);

  const pat = settings.values.pat;
  useEffect(() => {
    if (pat && !octokit) {
      void setPat(pat);
    }
  }, [pat, octokit]);

  const setPat = async (nextPat: string) => {
    settings.values.pat = nextPat;
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

  return <OctokitContext.Provider value={{ pat, setPat, patError, octokit }}>{children}</OctokitContext.Provider>;
};
