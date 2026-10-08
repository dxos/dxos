//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as SearchCapabilities from '@dxos/plugin-search/SearchCapabilities';

import { meta } from '#meta';
import { GitHubOperation } from '#types';

import { parsePullRequestReference } from '../github-link.ts';

/**
 * The row for text naming a pull request, labelled with the parts the text itself spells out — the
 * dialog asks on every keystroke, so GitHub is not consulted.
 */
export const matchPullRequestQuery: SearchCapabilities.QueryAction['match'] = (text) => {
  const reference = parsePullRequestReference(text);
  return (
    reference && {
      label: [
        'import-pull-request-query.label',
        { ns: meta.profile.key, reference: `${reference.owner}/${reference.repo}#${reference.number}` },
      ],
      icon: 'ph--git-pull-request--regular',
    }
  );
};

/**
 * Offers to import the pull request a pasted URL or `owner/repo#123` names, and answers with it once
 * stored; GitHub is asked only when the user picks the row.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const invoker = yield* Capabilities.OperationInvoker;
    const actions: SearchCapabilities.QueryAction[] = [
      {
        id: `${meta.profile.key}/query-action/import-pull-request`,
        match: matchPullRequestQuery,
        run: (text, { db }) =>
          invoker
            .invoke(GitHubOperation.ImportPullRequest, { reference: text }, { spaceId: db.spaceId })
            .pipe(Effect.map(({ pullRequest }) => pullRequest.target)),
      },
    ];
    return Capability.contribute(SearchCapabilities.QueryAction, actions);
  }),
);
