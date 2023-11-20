//
// Copyright 2023 DXOS.org
//

import { Octokit, type RestEndpointMethodTypes } from '@octokit/rest';

import { type Schema, TypedObject } from '@dxos/echo-schema';
import { type FunctionSubscriptionEvent, type FunctionHandler } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

type GithubContributors = RestEndpointMethodTypes['repos']['listContributors']['response']['data'];
type GithubUser = RestEndpointMethodTypes['users']['getByUsername']['response']['data'];

export const handler: FunctionHandler<FunctionSubscriptionEvent> = async ({ event, context }) => {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  for (const objectId of event.objects) {
    const project = context.client.spaces.query({ id: objectId }).objects[0];

    if (project && project.repo && project.repo.includes('github.com') && project.__meta.keys.length === 0) {
      const [owner, repo] = new URL(project.repo).pathname.split('/').slice(1, 3);
      const response = await octokit.repos.listContributors({ owner, repo });
      const contributors: GithubContributors = response.data;
      log.info('Contributors', { repo: project.repo, amount: contributors.length });

      const space = context.client.spaces.get(PublicKey.from(event.space));
      invariant(space, 'Missing space.');
      await space.waitUntilReady();

      const personSchema = space.db.query({ typename: 'example.com/schema/person' }).objects[0] as Schema;

      await Promise.all(
        contributors.map(async (contributor) => {
          if (!contributor.login) {
            log.warn('Missing contributor login.');
            return;
          }
          const response = await octokit.users.getByUsername({ username: contributor.login });
          const user: GithubUser = response.data;
          if (!user.name) {
            log.warn('Missing user name.');
            return;
          }
          const existing = space.db.query({ name: user.name }).objects;
          if (existing.length !== 0) {
            log.info('User already exists', { name: user.name });
          }
          space.db.add(
            new TypedObject(
              {
                name: user.name,
                email: user.email,
                org: user.company,
              },
              { schema: personSchema },
            ),
          );
        }),
      );
      await space.db.flush();
      project.__meta.keys.push({ source: 'github' });
    }
  }

  context.status(200).succeed({});
};
