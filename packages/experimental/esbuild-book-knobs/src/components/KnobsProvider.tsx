//
// Copyright 2022 DXOS.org
//

import React, { ReactNode, useState } from 'react';

import { KnobContext, KnobDef } from '../hooks';

/**
 * Root container for knobs.
 * NOTE: Hooks must be called by child components.
 */
export const KnobsProvider = ({ children }: { children: ReactNode }) => {
  const [knobs, setKnobs] = useState<KnobDef[]>([]);

  const addKnob = (type: string, options: any) => {
    setKnobs(knobs => [...knobs, [type, options]]);
  };

  return (
    <KnobContext.Provider value={[knobs, addKnob]}>
      {children}
    </KnobContext.Provider>
  );
};
