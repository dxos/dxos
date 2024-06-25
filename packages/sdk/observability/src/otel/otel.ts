//
// Copyright 2024 DXOS.org
//

export type OtelOptions = {
  endpoint: string;
  authorizationHeader: string;
  serviceName: string; // For the Otel API, the name of the entity for which signals (metrics or trace) are collected.
  serviceVersion: string; // For the Otel API, The name of the entity for which signals (metrics or trace) are collected.
  getTags: () => { [key: string]: string };
};
