//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { type Octokit } from '@octokit/rest';
import { createContext, useContext } from 'react';

export const OctokitContext = createContext<any | undefined>(undefined);

export const useOctokit = (): Octokit => {
  const octokit = useContext(OctokitContext);
  assert(octokit);
  return octokit;
};
