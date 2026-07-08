//
// Copyright 2026 DXOS.org
//

import { type DocumentId, Repo, initSubduction } from '@automerge/automerge-repo';
import { beforeAll, describe, test } from 'vitest';

// Throwaway probe (DX_PROBE-gated): confirm in isolation that `repo.handles[id]` — the single-item
// lookup echo-host uses (getHeads, _afterSave, getHandleState) — is O(number of handles), because the
// `handles` getter rebuilds a fresh object over all handles on every access. Also times the proposed
// O(1) `repo.getHandle(id)` once the fork patch adds it.
//   DX_PROBE=1 npx vitest run src/automerge/repo-handles-scaling.test.ts
describe.runIf(process.env.DX_PROBE)('automerge-repo handle-lookup scaling', () => {
  beforeAll(async () => {
    await initSubduction();
  });

  test('per-lookup cost vs number of handles', { timeout: 120_000 }, () => {
    const repo = new Repo({ network: [] });
    const ids: DocumentId[] = [];
    const rows: any[] = [];
    const TOTAL = 3000;
    const STEP = 300;
    const LOOKUPS = 2000;

    for (let n = 0; n < TOTAL; n++) {
      ids.push(repo.create({ i: n }).documentId);

      if ((n + 1) % STEP === 0) {
        const target = ids[ids.length - 1];

        // Current pattern: `repo.handles[id]` — invokes the O(N) getter each time.
        let viaHandlesUs = 0;
        {
          let acc = 0;
          const t0 = performance.now();
          for (let k = 0; k < LOOKUPS; k++) {
            acc += repo.handles[target] ? 1 : 0;
          }
          viaHandlesUs = ((performance.now() - t0) / LOOKUPS) * 1000;
          if (acc < 0) {
            throw new Error('unreachable');
          }
        }

        // Proposed O(1) accessor (present only after the fork patch).
        let viaGetHandleUs: number | string = 'n/a';
        const getHandle = (repo as any).getHandle?.bind(repo);
        if (getHandle) {
          let acc = 0;
          const t0 = performance.now();
          for (let k = 0; k < LOOKUPS; k++) {
            acc += getHandle(target) ? 1 : 0;
          }
          viaGetHandleUs = round(((performance.now() - t0) / LOOKUPS) * 1000);
          if (acc < 0) {
            throw new Error('unreachable');
          }
        }

        rows.push({ handles: n + 1, perLookupUs_handles: round(viaHandlesUs), perLookupUs_getHandle: viaGetHandleUs });
      }
    }

    // eslint-disable-next-line no-console
    console.log('\n=== automerge-repo per-lookup cost (µs) vs handle count ===');
    // eslint-disable-next-line no-console
    console.table(rows);
  });
});

const round = (value: number): number => Math.round(value * 1000) / 1000;
