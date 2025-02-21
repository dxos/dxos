//
// Copyright 2022 DXOS.org
//

export type SegmentTelemetryOptions = {
  apiKey?: string;
  batchSize?: number;
  enable?: boolean;
  getTags: () => { [key: string]: string };
};

type CommonOptions = {
  installationId?: string;
  did?: string;
  properties?: object;
  timestamp?: Date;
};

export type PageOptions = CommonOptions & {
  installationId?: string;
  name?: string;
  category?: string;
};

export type EventOptions = CommonOptions & {
  name: string;
};
