//
// Copyright 2025 DXOS.org
//

import { type Observability } from '@dxos/observability';

export type ObservabilityPluginOptions = {
  namespace: string;
  observability: () => Promise<Observability.Observability>;
  /**
   * Optional callback invoked by the help/feedback UI to download captured logs.
   * When omitted the "Download logs" action is hidden.
   */
  downloadLogs?: () => void | Promise<void>;
};
