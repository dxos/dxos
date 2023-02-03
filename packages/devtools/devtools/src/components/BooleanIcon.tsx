//
// Copyright 2021 DXOS.org
//

import { Check, Stop } from 'phosphor-react';
import React from 'react';

// TODO(burdon): Use theme.
export const BooleanIcon = ({ value }: { value: boolean | undefined }) => (value ? <Check /> : <Stop />);
