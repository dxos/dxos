//
// Copyright 2023 DXOS.org
//

import React, { FC, PropsWithChildren, createContext, useContext } from 'react';

import { Action, DispatchFunction, createActionReducer } from './Action';
import { Plugin } from './Plugin';

export type PluginContextValue = {
  plugins: Plugin[];
  dispatch: DispatchFunction<Action>;
};

const defaultContext: PluginContextValue = { plugins: [], dispatch: createDispatch([]) };

const PluginContext = createContext<PluginContextValue>(defaultContext);

export const usePluginContext = () => useContext(PluginContext);
const compose = (contexts: FC<PropsWithChildren>[]) => {
  return contexts.reduce((Acc, Next) => ({ children }) => (
    <Next>
      <Acc>{children}</Acc>
    </Next>
  ));
};

const composeContext = (plugins: Plugin[]) => {
  return (props: PropsWithChildren) => <>{props.children}</>;
};
export const PluginContextProvider = (props: PropsWithChildren<PluginContextValue>) => {
  const { plugins } = props;
  const ComposedContext = composeContext(plugins);
  return (
    <PluginContext.Provider value={{ plugins }}>
      <ComposedContext>{props.children}</ComposedContext>
    </PluginContext.Provider>
  );
};

export type Direction = 'inline' | 'inline-reverse' | 'block' | 'block-reverse';

export type SurfaceProps = {
  name?: string;
  data?: any;
  component?: string | string[];
  surfaces?: Record<string, Partial<SurfaceProps>>;
  limit?: number | undefined;
  direction?: Direction;
};

type SurfaceContextValue = SurfaceProps & { parent: SurfaceContextValue | undefined };

const SurfaceContext = createContext<SurfaceContextValue>({ parent: undefined });

export const useSurfaceContext = () => useContext(SurfaceContext);

export const Surface = (props: SurfaceProps) => {
  const { limit } = props;
  const { plugins } = usePluginContext();
  const parent = useSurfaceContext();
  const components = [null];
  return <SurfaceContext.Provider value={{ ...props, parent }}>{components}</SurfaceContext.Provider>;
};

type Store<T, A> = {
  state: T;
  dispatch: DispatchFunction<A>;
};

const createDispatch =
  // eslint-disable-next-line
    <TAction = Action>(plugins: Plugin[]) =>
    (...actions: TAction[]) => {
      plugins?.forEach((plugin) => {
        if (plugin.provides.actions) {
          const reducer = createActionReducer(plugin.provides.actions);
          const outputState = reducer(actions, {});
        }
      });
    };

const createStore = <T, A>(initialValue: T) => createContext({ state: initialValue });
