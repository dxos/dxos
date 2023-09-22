export type SignalFactory = () => { notifyRead(): void; notifyWrite(): void };
export let createSignal: SignalFactory | undefined;
export const registerSignalFactory = (factory: SignalFactory) => {
  createSignal = factory;
};