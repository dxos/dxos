//
// Copyright 2026 DXOS.org
//

export * from './spec';
export * from './api';
export { stack, action, debug, input, select } from './builders';
export { installDevtools, type ComposerDevtoolsApi } from './host';

import { stack, action, debug, input, select } from './builders';
import { installDevtools } from './host';

/**
 * Convenience namespace mirroring the documented API:
 *
 * ```ts
 * ComposerDevtools.showPanel({
 *   id, name,
 *   onMount() { ... },
 *   onUnmount() { ... },
 *   onRender() {
 *     return ComposerDevtools.stack({ direction: 'vertical' }, [
 *       ComposerDevtools.action({ name: 'foo' }, () => { ... }),
 *     ]);
 *   },
 * });
 * ```
 *
 * Calling any method on `ComposerDevtools` lazily installs the host.
 */
export const ComposerDevtools = {
  showPanel: (definition: Parameters<ReturnType<typeof installDevtools>['showPanel']>[0]) =>
    installDevtools().showPanel(definition),
  removePanel: (panelId: string) => installDevtools().removePanel(panelId),
  stack,
  action,
  debug,
  input,
  select,
};
