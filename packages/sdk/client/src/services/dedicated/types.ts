export interface DedicatedWorkerInitMessage {
  type: 'init';
  systemPort: MessagePort;
  appPort: MessagePort;
  /**
   * Released if worker is terminated.
   */
  livenessLockKey: string;
}
