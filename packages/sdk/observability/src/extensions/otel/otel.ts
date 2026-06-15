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

/**
 * Resolve a possibly-relative OTLP exporter URL to an absolute URL.
 * The OpenTelemetry browser HTTP exporter validates user-provided URLs with `new URL(url)`,
 * which throws on relative paths like `/api/otel/v1/logs`. In a browser context we resolve
 * against `window.location.origin`; outside the browser we return the input unchanged.
 */
export const resolveOtlpUrl = (url: string): string => {
  if (typeof window !== 'undefined' && url.startsWith('/')) {
    return new URL(url, window.location.origin).toString();
  }
  return url;
};
