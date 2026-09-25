//
// Copyright 2026 DXOS.org
//

import {
  type FC,
  type ReactNode,
  createElement,
  createContext as createReactContext,
  useContext,
  useMemo,
} from 'react';

/**
 * A typed context whose provider takes the context fields as props.
 * `useContext` throws a message naming the consumer and root when no provider is mounted and no default was given.
 */
export const createContext = <ContextValueType extends object | null>(
  rootComponentName: string,
  defaultContext?: ContextValueType,
): readonly [FC<ContextValueType & { children?: ReactNode }>, (consumerName: string) => ContextValueType] => {
  const Context = createReactContext<ContextValueType | undefined>(defaultContext);

  const Provider: FC<ContextValueType & { children?: ReactNode }> = (props) => {
    const { children, ...context } = props;
    // Memoised on the field values so a re-rendering root does not re-render every consumer.
    // The rest object is the context minus `children`, which TypeScript cannot relate back to the generic.
    const value = useMemo(() => context as ContextValueType, Object.values(context));
    return createElement(Context.Provider, { value }, children);
  };

  Provider.displayName = `${rootComponentName}Provider`;

  const useTypedContext = (consumerName: string): ContextValueType => {
    const context = useContext(Context);
    if (context) {
      return context;
    }
    if (defaultContext !== undefined) {
      return defaultContext;
    }
    throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
  };

  return [Provider, useTypedContext] as const;
};
