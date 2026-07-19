//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { log } from '@dxos/log';
import { type SpaceCapabilities } from '@dxos/plugin-space';
import { Branch, Version } from '@dxos/versioning';

import { VersionBanner } from '#components';
import { type UseVersioningResult } from '#hooks';

export type VersionBannersProps = {
  versioning: UseVersioningResult;
};

/**
 * The version-review banner row shown above the editor while off "main @ now" — a slim strip for the
 * active checkpoint / branch / fork (at most one is selected at a time). Owns the selection handlers
 * (restore, branch-from, merge, compare, close) so the container only wires the versioning state.
 */
export const VersionBanners = ({ versioning }: VersionBannersProps) => {
  const { document, activeVersion, activeBranch, activeFork, checkpointText, compare, setSelection, setCompare } =
    versioning;

  // Leaving a checkpoint view returns to the tip it belongs to: the branch the checkpoint was
  // taken on (so the reviewer lands back on the editable branch tip), else main's present.
  const branchOfActiveVersion = useCallback(() => {
    const branchKey = activeVersion?.branch;
    return branchKey
      ? document?.history?.branches.find((branch) => branch.key === branchKey && branch.status === 'active')
      : undefined;
  }, [document, activeVersion]);
  const tipSelection = useCallback((): SpaceCapabilities.VersionSelection => {
    const branch = branchOfActiveVersion();
    return branch ? { kind: 'branch', branchId: branch.id } : { kind: 'current' };
  }, [branchOfActiveVersion]);

  const handleRestore = useCallback(() => {
    if (document && activeVersion) {
      // A branch checkpoint restores onto the branch document (checkpointText is the branch-bound
      // Text); a base checkpoint onto the root.
      Version.restore(document, activeVersion, checkpointText);
      setSelection(tipSelection());
    }
  }, [document, activeVersion, checkpointText, setSelection, tipSelection]);

  const handleBranchFrom = useCallback(
    (name: string) => {
      const target = activeVersion?.target.target;
      if (document && activeVersion && target) {
        Branch.create(document, {
          name: name.trim(),
          parent: target,
          heads: activeVersion.heads,
        })
          .then((branch) => setSelection({ kind: 'branch', branchId: branch.id }))
          .catch((error) => log.catch(error));
      }
    },
    [document, activeVersion, setSelection],
  );

  const handleMerge = useCallback(() => {
    if (document && activeBranch) {
      Branch.merge(document, activeBranch)
        .then(() => setSelection({ kind: 'current' }))
        .catch((error) => log.catch(error));
    }
  }, [document, activeBranch, setSelection]);

  const handleCompare = useCallback(() => setCompare(!compare), [setCompare, compare]);

  const handleCloseBanner = useCallback(() => {
    // Closing a branch-checkpoint banner returns to the branch tip, not main.
    setSelection(tipSelection());
    setCompare(false);
  }, [setSelection, setCompare, tipSelection]);

  return (
    <>
      {activeVersion && (
        <VersionBanner
          mode='checkpoint'
          name={Version.label(activeVersion)}
          detail={activeVersion.name ? new Date(activeVersion.createdAt).toLocaleString() : undefined}
          onRestore={handleRestore}
          // Branching from a BRANCH revision would fork a sub-branch, which is unsupported
          // (flat core registry) — offer it only for main revisions. See DESIGN.md.
          onBranchFrom={activeVersion.branch ? undefined : handleBranchFrom}
          onClose={handleCloseBanner}
        />
      )}
      {activeBranch && (
        <VersionBanner
          mode='branch'
          name={Branch.label(activeBranch)}
          detail={new Date(activeBranch.createdAt).toLocaleString()}
          onMerge={handleMerge}
          onCompare={handleCompare}
          onClose={handleCloseBanner}
        />
      )}
      {activeFork && (
        <VersionBanner
          mode='fork'
          name={Branch.label(activeFork)}
          detail={new Date(activeFork.createdAt).toLocaleString()}
          // Leaving the fork point returns to the branch tip if it is still editable, else main.
          onClose={() =>
            setSelection(
              activeFork.status === 'active' ? { kind: 'branch', branchId: activeFork.id } : { kind: 'current' },
            )
          }
        />
      )}
    </>
  );
};
