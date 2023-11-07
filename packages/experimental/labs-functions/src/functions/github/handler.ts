//
// Copyright 2023 DXOS.org
//

import { Octokit, type RestEndpointMethodTypes } from '@octokit/rest';

import { Reference } from '@dxos/document-model';
import { TypedObject } from '@dxos/echo-schema';
import { type FunctionSubscriptionEvent, type FunctionHandler } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

type GithubContributors = RestEndpointMethodTypes['repos']['listContributors']['response']['data'];
type GithubUser = RestEndpointMethodTypes['users']['getByUsername']['response']['data'];

export const handler: FunctionHandler<FunctionSubscriptionEvent> = async ({ event, context }) => {
  log.info('Event', event);
  const octokit = new Octokit();
  for (const objectId of event.objects) {
    const project = context.client.spaces.query({ id: objectId }).objects[0];
    if (project && project.repo) {
      log.info('Fetching contributors for', project.repo);
      const response = await octokit.repos.listContributors({ owner: 'dxos', repo: 'dxos' });
      const contributors: GithubContributors = response.data;
      log.info('Contributors', { length: contributors.length });
      const space = context.client.spaces.get(PublicKey.from(event.space));
      invariant(space, 'Missing space.');
      await space.waitUntilReady();
      await Promise.all(
        contributors.map(async (contributor) => {
          if (!contributor.login) {
            log.warn('Missing contributor login.');
            return;
          }
          const response = await octokit.users.getByUsername({ username: contributor.login });
          const user: GithubUser = response.data;
          space.db.add(
            new TypedObject(
              {
                name: user.name,
                email: user.email,
              },
              { type: Reference.fromLegacyTypename('dxos.org/schema/person') },
            ),
          );
        }),
      );
      await space.db.flush();
    }
  }

  context.status(200).succeed({});
};
