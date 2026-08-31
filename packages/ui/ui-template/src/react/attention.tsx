//
// Copyright 2026 DXOS.org
//

//
// SPIKE. A trivial attention aspect: the last container the user focused into stays attended
// (sticky — focus leaving does not clear it), and the attended container shows a primary ring.
// A deliberately minimal stand-in for `@dxos/react-ui-attention`.
//

import React, { type PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';

type AttentionContextValue = {
  attended: string | undefined;
  attend: (id: string) => void;
};

// Default is inert, so containers rendered outside a provider neither ring nor throw.
const AttentionContext = createContext<AttentionContextValue>({ attended: undefined, attend: () => {} });

export const useAttention = (): AttentionContextValue => useContext(AttentionContext);

export const AttentionProvider = ({ children }: PropsWithChildren) => {
  const [attended, setAttended] = useState<string>();
  const context = useMemo(() => ({ attended, attend: setAttended }), [attended]);
  return <AttentionContext.Provider value={context}>{children}</AttentionContext.Provider>;
};
