//
// Copyright 2026 DXOS.org
//

// Import-free so the producer-side forwarder can share it without pulling in the OTel SDK.

/** How often metrics are collected and exported, on either side of the worker port. */
export const METRIC_EXPORT_INTERVAL = 60 * 1000;
