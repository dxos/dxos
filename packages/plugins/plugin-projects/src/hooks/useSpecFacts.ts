//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';

import { ProjectCapabilities } from '#types';

/** The fact styles of the packages whose dialects the spec uses. */
export const useSpecFacts = (dialects: readonly string[]): ProjectCapabilities.SpecFacts => {
  const packages = Hooks.useCapabilities(ProjectCapabilities.SpecPackage);
  return useMemo(
    () =>
      Object.assign(
        {},
        ...packages
          .filter((pkg) => pkg.facts && pkg.dialects.every((dialect) => dialects.includes(dialect)))
          .map(({ facts }) => facts),
      ),
    [packages, dialects],
  );
};
