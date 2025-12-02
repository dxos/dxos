//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

//
// Context
//

type ${name}ContextValue = {};

const [${name}ContextProvider, use${name}Context] = createContext<${name}ContextValue>('${name}');

//
// Root
//

type ${name}RootProps = PropsWithChildren<{}>;

const ${name}Root = ({ children }: ${name}RootProps) => {
  return <${name}ContextProvider>{children}</${name}ContextProvider>;
};

${name}Root.displayName = '${name}.Root';

//
// Content
//

type ${name}ContentProps = ThemedClassName<{}>;

const ${name}Content = ({ classNames }: ${name}ContentProps) => {
  const context = use${name}Context(${name}Content.displayName);
  return <div className={mx(classNames)}>{JSON.stringify(context)}</div>;
};

${name}Content.displayName = '${name}.Content';

//
// ${name}
//

export const ${name} = {
  Root: ${name}Root,
  Content: ${name}Content,
};

export type { ${name}RootProps, ${name}ContentProps };
