//
// Copyright 2023 DXOS.org
//

import { Octokit } from 'octokit';
import React, { type Context, createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react';

import { log } from '@dxos/log';

export type OctokitContextValue = {
  pat?: string;
  setPat: (pat?: string) => void;
  patError: 'failed' | null; // TODO(burdon): Remove/generalize?
  octokit: Octokit | null;
};

export const OctokitContext: Context<OctokitContextValue> = createContext<OctokitContextValue>({
  setPat: () => {},
  patError: null,
  octokit: null,
});

export const useOctokitContext = () => useContext(OctokitContext);

export const OctokitProvider = ({
  pat,
  onPatChanged,
  children,
}: PropsWithChildren<{ pat?: string; onPatChanged?: (pat: string | undefined) => void }>) => {
  const [octokit, setOctokit] = useState<Octokit | null>(null);
  const [patError, setPatError] = useState<OctokitContextValue['patError']>(null);

  useEffect(() => {
    if (pat && !octokit) {
      void setPat(pat);
    }
  }, [pat, octokit]);

  const setPat = async (pat?: string) => {
    onPatChanged?.(pat);
    if (pat) {
      const octokit = new Octokit({ auth: pat });
      return octokit.rest.users.getAuthenticated().then(
        () => {
          setPatError(null);
          setOctokit(octokit);
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
