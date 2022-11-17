//
// Copyright 2022 DXOS.org
//

import { Octokit } from '@octokit/rest';
import assert from 'assert';
import { createContext, useContext } from 'react';

export const OctokitContext = createContext<any | undefined>(undefined);

export const useOctokit = (): Octokit => {
  const octokit = useContext(OctokitContext);
  assert(octokit);
  return octokit;
};
