//
// Copyright 2025 DXOS.org
//

import { createContext } from '@dxos/react-hooks';

import { type SyntaxContextValue } from './Syntax';

// Kept out of `Syntax.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const SYNTAX_NAME = 'Syntax';

export const [SyntaxProvider, useSyntaxContext] = createContext<SyntaxContextValue>(SYNTAX_NAME);
