import { createContext, useContext } from 'react';
import type { StateMachine } from './state-machine';

export type ComputeContextType = {
  stateMachine?: StateMachine;
};

export const ComputeContext = createContext<ComputeContextType>({});

export const useComputeContext = () => {
  const context = useContext(ComputeContext);
  return context;
};
