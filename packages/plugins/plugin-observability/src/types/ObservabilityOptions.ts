//
// Copyright 2025 DXOS.org
//

import type * as Observability from '@dxos/observability/Observability';

export type ObservabilityPluginOptions = {
  namespace: string;
  observability: () => Promise<Observability.Observability>;
  /**
   * Optional callback invoked by the help/feedback UI to download captured logs.
   * When omitted the "Download logs" action is hidden.
   */
  downloadLogs?: () => void | Promise<void>;
  /**
   * Optional callback that returns the captured logs as a blob, for flows that attach them to an object
   * rather than save them to disk. When omitted those flows send no logs.
   */
  exportLogs?: () => Promise<Blob>;
};
