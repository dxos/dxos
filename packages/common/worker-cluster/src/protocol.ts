/**
 * Sent from app to worker to initialize this worker.
 */
export interface InitMessage {
  _tag: 'init';

  /**
   * Instance id of this worker.
   */
  instanceId: number;

  /**
   * Total amount of worker instances started.
   */
  instanceCount: number;

  /**
   * UUID that identifies this page.
   */
  pageId: string;

  /**
   * Page holds a web-lock on this key; when the lock is released - we know that the page is closed.
   */
  livenessLockKey: string;

  /**
   * Port to connect to the page.
   *
   * Only present on main worker (instanceId = 0).
   */
  pagePort: MessagePort | null;

  /**
   * Ports to connect to auxiliary workers.
   *
   * instanceCount - 1 in total.
   * Only present on main worker (instanceId = 0).
   */
  auxiliaryPorts: MessagePort[] | null;

  /**
   * Port to connect to the main worker.
   *
   * Only present on auxiliary workers (instanceId > 0).
   */
  mainPort: MessagePort | null;
}
