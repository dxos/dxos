//
// Copyright 2025 DXOS.org
//

import { type Scope, createContextScope } from '@radix-ui/react-context';

import { type SyntaxContextValue } from './Syntax.tsx';

// Kept out of `Syntax.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const SYNTAX_NAME = 'Syntax';

export type SyntaxScopedProps<P> = P & { __scopeSyntax?: Scope };

export const [createSyntaxContext, createSyntaxScope] = createContextScope(SYNTAX_NAME);
export const [SyntaxProvider, useSyntaxContext] = createSyntaxContext<SyntaxContextValue>(SYNTAX_NAME);
