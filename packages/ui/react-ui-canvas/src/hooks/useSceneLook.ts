//
// Copyright 2026 DXOS.org
//

import { createContext, useContext } from 'react';

import { DEFAULT_LOOK, type SceneLook } from '../model/style-set.ts';

/** The look every layer of a view draws with; nested layers inherit it, so a portal's child scene matches. */
export const SceneLookContext = createContext<SceneLook>(DEFAULT_LOOK);

/** The look of the enclosing view: the classic set on the plain background outside one. */
export const useSceneLook = (): SceneLook => useContext(SceneLookContext);
