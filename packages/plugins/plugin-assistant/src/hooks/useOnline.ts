//
// Copyright 2025 DXOS.org
//

import { type Dispatch, type SetStateAction, useState } from 'react';

export const useOnline = (): [boolean, Dispatch<SetStateAction<boolean>>] => {
  const [online, setOnline] = useState(true);
  return [online, setOnline];
};
