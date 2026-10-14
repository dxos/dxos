//
// Copyright 2026 DXOS.org
//

// Spend guard for review runs that bill an API in dollars. A run whose projected cost exceeds the
// threshold refuses to start unless `--approve-cost=<usd>` covers the projection, so an agent must
// put the number to the user and pass their answer through rather than spend on its own judgment.

/** Projected spend in USD above which a run needs the user's explicit approval. */
export const COST_APPROVAL_THRESHOLD_USD = 5;

export class CostApprovalError extends Error {
  constructor(readonly projectedUsd: number) {
    super(
      `projected cost $${projectedUsd.toFixed(2)} exceeds $${COST_APPROVAL_THRESHOLD_USD}: ask the user to approve this amount, ` +
        `then re-run with --approve-cost=${Math.ceil(projectedUsd)} (or narrow the run).`,
    );
    this.name = 'CostApprovalError';
  }
}

/** Parse `--approve-cost`; a missing or malformed value approves nothing. */
export const parseApprovedCost = (value: string | undefined): number => {
  const parsed = value === undefined ? Number.NaN : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

/** True when a run projected at `projectedUsd` may start under `approvedUsd`. */
export const isCostApproved = (projectedUsd: number, approvedUsd: number): boolean =>
  projectedUsd <= COST_APPROVAL_THRESHOLD_USD || projectedUsd <= approvedUsd;

/** Throw `CostApprovalError` unless the projection is under the threshold or covered by approval. */
export const assertCostApproved = (projectedUsd: number, approvedUsd: number): void => {
  if (!isCostApproved(projectedUsd, approvedUsd)) {
    throw new CostApprovalError(projectedUsd);
  }
};
