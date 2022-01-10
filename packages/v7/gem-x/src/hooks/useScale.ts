//
// Copyright 2022 DXOS.org
//

import { useMemo } from 'react';

import { Scale } from '../util';

export const useScale = ({ gridSize }: { gridSize?: number }) => useMemo(() => new Scale(gridSize), []);
