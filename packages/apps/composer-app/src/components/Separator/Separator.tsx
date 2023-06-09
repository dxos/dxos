//
// Copyright 2023 DXOS.org
//

import React from 'react';

export const Separator = ({ flush }: { flush?: boolean }) => (
  <div role='separator' className={'bs-px mli-2.5 bg-neutral-500/20' + (flush ? '' : ' mlb-1')} />
);
