//
// Copyright 2026 DXOS.org
//

/**
 * Gzip-compress data with the platform `CompressionStream` (browsers, workers, and Node 18+).
 */
export const gzip = (data: Blob | string): Promise<Blob> => {
  const blob = typeof data === 'string' ? new Blob([data]) : data;
  return new Response(blob.stream().pipeThrough(new CompressionStream('gzip')), {
    headers: { 'Content-Type': 'application/gzip' },
  }).blob();
};
