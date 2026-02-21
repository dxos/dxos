//
// Copyright 2024 DXOS.org
//

import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api';
import { type Resource } from '@opentelemetry/resources';

export type OtelOptions = {
  endpoint: string;
  headers: Record<string, string>;
  resource: Resource;
  getTags: () => { [key: string]: string };
  consoleDiagLogLevel?: string;
};

export const setDiagLogger = (level?: string) => {
  const logLevel = DiagLogLevel[level as keyof typeof DiagLogLevel];
  if (logLevel) {
    diag.setLogger(new DiagConsoleLogger(), logLevel);
  }
};
