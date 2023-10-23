//
// Copyright 2023 DXOS.org
//

import { Octokit } from 'octokit';
import React, { type Context, createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { usePlugin } from '@dxos/app-framework';

import { type GithubPluginProvides } from '../../GithubPlugin';
import { GITHUB_PLUGIN } from '../../props';

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
  const githubPlugin = usePlugin<GithubPluginProvides>(GITHUB_PLUGIN);
  if (!githubPlugin) {
    return null;
  }

  const settings = githubPlugin.provides.settings;
  const pat = settings.pat;
  useEffect(() => {
    if (pat && !octokit) {
      void setPat(pat);
    }
  }, [pat, octokit]);

  const setPat = async (nextPat: string) => {
    settings.pat = nextPat;
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
