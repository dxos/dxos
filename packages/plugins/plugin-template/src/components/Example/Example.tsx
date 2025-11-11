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

type ExampleContextValue = {};

const [ExampleContextProvider, useExampleContext] = createContext<ExampleContextValue>('Example');

//
// Root
//

type ExampleRootProps = PropsWithChildren;

const ExampleRoot = ({ children }: ExampleRootProps) => {
  return <ExampleContextProvider>{children}</ExampleContextProvider>;
};

ExampleRoot.displayName = 'Example.Root';

//
// Content
//

type ExampleContentProps = ThemedClassName<{}>;

const ExampleContent = ({ classNames }: ExampleContentProps) => {
  const context = useExampleContext(ExampleContent.displayName);
  return <div className={mx(classNames)}>{JSON.stringify(context)}</div>;
};

ExampleContent.displayName = 'Example.Content';

//
// Example
//

export const Example = {
  Root: ExampleRoot,
  Content: ExampleContent,
};

export type { ExampleRootProps, ExampleContentProps };
