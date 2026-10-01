//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { useTranslation } from '@dxos/react-ui';
import { createMenuAction, useMenuContribution } from '@dxos/react-ui-menu';
import { PullRequest } from '@dxos/types';

import { meta } from '#meta';
import { GitHubOperation, Walkthrough } from '#types';

import { useOpenObject } from '../../hooks/index.ts';
import { newestWalkthrough } from '../../walkthrough/index.ts';

const WALKTHROUGH_ICON = 'ph--path--regular';

export type PullRequestCardMenuProps = AppSurface.CardMenuData<PullRequest.PullRequest>;

/**
 * Adds "Open walkthrough" or "Generate walkthrough" to a pull request card's menu, whichever applies.
 *
 * Either way what opens is the pull request: the walkthrough is what its article renders, so a
 * generation that is still running does not leave the reader with nothing to open. A preview card
 * holds a pull request minted in memory from its URL, so the stored copy with the same
 * owner/repo/number is what the menu acts on — in the pull request's own space when it has one,
 * otherwise the space the user is working in.
 */
export const PullRequestCardMenu = ({ subject, menu }: PullRequestCardMenuProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const openObject = useOpenObject();
  const activeSpace = useActiveSpace();
  const db = Obj.getDatabase(subject) ?? activeSpace?.db;
  const { owner, repo, number } = subject;

  const [stored] = useQuery(db, Filter.type(PullRequest.PullRequest, { owner, repo, number }));
  const walkthroughs = useQuery(
    db,
    stored ? Filter.type(Walkthrough.Walkthrough, { pullRequest: Ref.make(stored) }) : Filter.nothing(),
  );
  const walkthrough = useMemo(() => newestWalkthrough(walkthroughs), [walkthroughs]);

  const generateWalkthrough = useCallback(async () => {
    if (!db) {
      return;
    }
    const pullRequest = stored ?? db.add(PullRequest.make(toStoredFields(subject)));
    const reference = PullRequest.reference(pullRequest);
    const toastId = `${meta.profile.key}.walkthrough.${pullRequest.id}`;
    const { data, error } = await invokePromise(
      GitHubOperation.GenerateWalkthrough,
      { pullRequest: Ref.make(pullRequest) },
      { spaceId: db.spaceId },
    );
    if (error || !data?.walkthrough.target) {
      log.warn('walkthrough generation failed', { reference, error });
      await invokePromise(LayoutOperation.AddToast, {
        id: toastId,
        icon: 'ph--warning--regular',
        title: ['walkthrough-failed.title', { ns: meta.profile.key }],
        description: reference,
      });
      return;
    }
    await invokePromise(LayoutOperation.AddToast, {
      id: toastId,
      icon: WALKTHROUGH_ICON,
      title: ['walkthrough-ready.title', { ns: meta.profile.key }],
      description: reference,
      actionLabel: ['open-walkthrough.label', { ns: meta.profile.key }],
      actionAlt: ['open-walkthrough.label', { ns: meta.profile.key }],
      onAction: () => void openObject(pullRequest),
    });
  }, [db, stored, subject, invokePromise, openObject]);

  const items = useMemo(() => {
    if (!db) {
      return [];
    }
    return [
      walkthrough && stored
        ? createMenuAction('open-walkthrough', () => void openObject(stored), {
            label: t('open-walkthrough.label'),
            icon: WALKTHROUGH_ICON,
          })
        : createMenuAction('generate-walkthrough', () => void generateWalkthrough(), {
            label: t('generate-walkthrough.label'),
            icon: WALKTHROUGH_ICON,
          }),
    ];
  }, [db, stored, walkthrough, openObject, generateWalkthrough, t]);

  useMenuContribution(menu, { id: `${meta.profile.key}.walkthrough`, mode: 'additive', items });

  return null;
};

/** The fields of an in-memory pull request, copied into a new object the space can store. */
const toStoredFields = ({
  owner,
  repo,
  number,
  title,
  url,
  state,
  author,
  description,
  baseBranch,
  headBranch,
  additions,
  deletions,
}: PullRequest.PullRequest): Obj.MakeProps<typeof PullRequest.PullRequest> => ({
  owner,
  repo,
  number,
  title,
  url,
  state,
  author,
  description,
  baseBranch,
  headBranch,
  additions,
  deletions,
});
