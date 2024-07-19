//
// Copyright 2024 DXOS.org
//

import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

export type OtelOptions = {
  endpoint: string;
  authorizationHeader: string;
  serviceName: string; // For the Otel API, the name of the entity for which signals (metrics or trace) are collected.
  serviceVersion: string; // For the Otel API, The name of the entity for which signals (metrics or trace) are collected.
  getTags: () => { [key: string]: string };
  consoleDiagLogLevel?: string;
};

export const setDiagLogger = (level?: string) => {
  const logLevel = DiagLogLevel[level as keyof typeof DiagLogLevel];
  if (logLevel) {
    diag.setLogger(new DiagConsoleLogger(), logLevel);
  }
};
