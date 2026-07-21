//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useMembers } from '@dxos/halo-react';
import { log } from '@dxos/log';
import { type SpaceCapabilities } from '@dxos/plugin-space';
import { getSpace } from '@dxos/react-client/echo';
import { Branch, Version } from '@dxos/versioning';

import { VersionBanner } from '#components';
import { type UseVersioningResult } from '#hooks';

export type VersionBannersProps = {
  versioning: UseVersioningResult;
};

/**
 * The version-review banner row shown above the editor while off "main @ now" — a slim strip for the
 * active checkpoint / branch / fork (at most one is selected at a time). Owns the selection handlers
 * (restore, branch-from, merge, view-select, close) so the container only wires the versioning state.
 */
export const VersionBanners = ({ versioning }: VersionBannersProps) => {
  const { document, activeVersion, activeBranch, activeFork, checkpointText, view, setSelection, setView } = versioning;

  // Resolve a branch's display label. Suggestion branches are named by author DID (`suggestion: <did>`);
  // show the author's display name if set (resolved against space members), otherwise the raw DID.
  const members = useMembers(getSpace(document)?.id);
  const label = useCallback(
    (branch: Branch.Branch) => {
      if (branch.kind === 'suggestion' && branch.creator) {
        const member = members.find((candidate) => candidate.did === branch.creator);
        return member?.displayName ?? branch.creator;
      }
      return Branch.label(branch);
    },
    [members],
  );

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

  const handleCloseBanner = useCallback(() => {
    // Closing a branch-checkpoint banner returns to the branch tip, not main.
    setSelection(tipSelection());
    setView('branch');
  }, [setSelection, setView, tipSelection]);

  return (
    <>
      {activeVersion && (
        <VersionBanner
          mode='checkpoint'
          name={Version.label(activeVersion)}
          timestamp={activeVersion.createdAt}
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
          name={label(activeBranch)}
          timestamp={activeBranch.createdAt}
          view={view}
          onViewChange={setView}
          onClose={handleCloseBanner}
        />
      )}
      {activeFork && (
        <VersionBanner
          mode='fork'
          name={label(activeFork)}
          timestamp={activeFork.createdAt}
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
