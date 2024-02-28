import { SignalBusContext } from '@braneframe/plugin-script';
import { useContext } from 'react';
import { raise } from '@dxos/debug';

export const SignalBus = () => {
  const { signalBus } = useContext(SignalBusContext) ?? raise(new Error('SignalBusContext not found'));
  return null;
};
