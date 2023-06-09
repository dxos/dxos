//
// Copyright 2023 DXOS.org
//

export type PublishTestSpec = {
  // If changed, make sure to create corresponding CNAME with Cloudflare.
  appName: string;
  kubeEndpoint: string;
  // TODO(egorgripasov): Read from dx.yaml.
  outDir: string;
  // How long to wait before checking results.
  pubishDelayMs: number;
  // How many times to check results.
  checksCount: number;
  // How long to wait between checks.
  checksIntervalMs: number;
  // How many random files to generate.
  randomFilesCount: number;
};

export enum CacheStatus {
  // Served from CF cache.
  HIT = 'HIT',
  // Not found in CF, CF retrieved from origin server.
  // The next time this resource is accessed its status should be HIT.
  MISS = 'MISS',
  // CF has been instructed to not cache this asset.
  BYPASS = 'BYPASS',
  // This resource is not cached by CF as default behavior.
  DYNAMIC = 'DYNAMIC',
  // Not found in CF, CF retrieved from origin server.
  // The next time this resource is accessed its status should be HIT.
  EXPIRED = 'EXPIRED',
}

// TODO(egorgripasov): Make more meaningful?
export type FileEvaluationResult = {
  match: boolean;
  cacheStatus?: CacheStatus;
};

export type EvaluationResult = Record<string, FileEvaluationResult>;
