//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NavigationOperation from '@dxos/app-toolkit/NavigationOperation';
import * as NotFound from '@dxos/app-toolkit/NotFound';
import { type AppSurface, useActiveSpace, useAppGraph } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import { useTranslation } from '@dxos/react-ui';
import { createMenuAction, useMenuContribution } from '@dxos/react-ui-menu';
import { PullRequest } from '@dxos/types';

import { meta } from '#meta';
import { GitHubOperation, Walkthrough } from '#types';

const WALKTHROUGH_ICON = 'ph--path--regular';

/** How long to wait for a just-created walkthrough to appear in the app graph before opening anyway. */
const GRAPH_NODE_TIMEOUT = '10 seconds';

export type PullRequestCardMenuProps = AppSurface.CardMenuData<PullRequest.PullRequest>;

/**
 * Adds "Open walkthrough" or "Generate walkthrough" to a pull request card's menu, whichever applies.
 *
 * A preview card holds a pull request minted in memory from its URL, so the walkthrough is looked up
 * through the stored copy with the same owner/repo/number — in the pull request's own space when it
 * has one, otherwise the space the user is working in.
 */
export const PullRequestCardMenu = ({ subject, menu }: PullRequestCardMenuProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const { graph } = useAppGraph();
  const activeSpace = useActiveSpace();
  const db = Obj.getDatabase(subject) ?? activeSpace?.db;
  const { owner, repo, number } = subject;

  const [stored] = useQuery(db, Filter.type(PullRequest.PullRequest, { owner, repo, number }));
  const walkthroughs = useQuery(
    db,
    stored ? Filter.type(Walkthrough.Walkthrough, { pullRequest: Ref.make(stored) }) : Filter.nothing(),
  );
  const walkthrough = useMemo(() => newest(walkthroughs), [walkthroughs]);

  const openWalkthrough = useCallback(
    async (target: Walkthrough.Walkthrough) => {
      const targetDb = Obj.getDatabase(target);
      if (!targetDb) {
        return;
      }
      const { data } = await invokePromise(NavigationOperation.ResolveNavigationTargets, {
        query: { uri: EID.make({ spaceId: targetDb.spaceId, entityId: target.id }) },
      });
      const path = data?.targets[0]?.path ?? GraphPath.getObjectPathFromObject(target);
      // A walkthrough generated moments ago has no graph node yet, and the deck cannot open a node it
      // cannot find; expanding only asks the connectors, so wait for the node to land.
      NotFound.expandPath(graph, path);
      await EffectEx.runPromise(AppGraph.waitFor(graph, path).pipe(Effect.timeout(GRAPH_NODE_TIMEOUT), Effect.ignore));
      await invokePromise(LayoutOperation.Open, { subject: [path], disposition: 'add' });
    },
    [invokePromise, graph],
  );

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
    const generated = data?.walkthrough.target;
    if (error || !generated) {
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
      onAction: () => void openWalkthrough(generated),
    });
  }, [db, stored, subject, invokePromise, openWalkthrough]);

  const items = useMemo(() => {
    if (!db) {
      return [];
    }
    return [
      walkthrough
        ? createMenuAction('open-walkthrough', () => void openWalkthrough(walkthrough), {
            label: t('open-walkthrough.label'),
            icon: WALKTHROUGH_ICON,
          })
        : createMenuAction('generate-walkthrough', () => void generateWalkthrough(), {
            label: t('generate-walkthrough.label'),
            icon: WALKTHROUGH_ICON,
          }),
    ];
  }, [db, walkthrough, openWalkthrough, generateWalkthrough, t]);

  useMenuContribution(menu, { id: `${meta.profile.key}.walkthrough`, mode: 'additive', items });

  return null;
};

/** The walkthrough generated last; several exist when the pull request was regenerated. */
const newest = (walkthroughs: Walkthrough.Walkthrough[]): Walkthrough.Walkthrough | undefined =>
  walkthroughs.reduce<Walkthrough.Walkthrough | undefined>(
    (latest, candidate) => (!latest || (candidate.generatedAt ?? '') > (latest.generatedAt ?? '') ? candidate : latest),
    undefined,
  );

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
