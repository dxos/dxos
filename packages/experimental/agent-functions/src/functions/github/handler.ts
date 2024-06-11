//
// Copyright 2023 DXOS.org
//

import { Octokit, type RestEndpointMethodTypes } from '@octokit/rest';

import { TestSchemaType } from '@dxos/echo-generator';
import { create, type EchoReactiveObject, type ForeignKey, getMeta } from '@dxos/echo-schema';
import { subscriptionHandler } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

type GithubContributors = RestEndpointMethodTypes['repos']['listContributors']['response']['data'];

export const handler = subscriptionHandler(async ({ event }) => {
  const { space, objects } = event.data;
  invariant(space);

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  for (const project of objects ?? []) {
    if (!project.repo || !project.repo.includes('github.com') || getMeta(project).keys.length !== 0) {
      return;
    }

    const [owner, repo] = new URL(project.repo).pathname.split('/').slice(1, 3);

    //
    // Get/create organization for a project.
    //
    {
      const { data: repoData } = await octokit.repos.get({ owner, repo });

      // Try to query organization.
      if (!project.org && repoData.organization?.id) {
        const foreignKey: ForeignKey = { source: 'github.com', id: String(repoData.organization.id) };
        project.org = (
          await space.db.query((object: EchoReactiveObject<any>) =>
            getMeta(object).keys.some((key) => key.source === foreignKey.source && key.id === foreignKey.id),
          )
        ).objects[0];
      }

      // Create organization if failed to query.
      if (!project.org && repoData.organization) {
        const orgSchema = space.db.schemaRegistry.getSchemaByTypename(TestSchemaType.organization);
        invariant(orgSchema, 'Missing organization schema.');
        project.org = create(orgSchema, { name: repoData.organization?.login });
        getMeta(project.org).keys.push({ source: 'github.com', id: String(repoData.organization?.id) });
      }
    }

    const contactSchema = space.db.schemaRegistry.getSchemaByTypename(TestSchemaType.contact);
    invariant(contactSchema);

    //
    // Add contributors as contacts to database.
    //
    const response = await octokit.repos.listContributors({ owner, repo });
    const contributors: GithubContributors = response.data;
    log('contributors', { repo: project.repo, amount: contributors.length });

    await Promise.all(
      contributors.map(async (contributor) => {
        if (!contributor.login) {
          log.warn('missing user login.');
          return;
        }

        const { data: user } = await octokit.users.getByUsername({ username: contributor.login });
        if (!user.name) {
          log.warn('missing user name.');
          return;
        }

        const foreignKey: ForeignKey = { source: 'github.com', id: String(user.id) };
        const { objects: existing } = await space.db
          .query((object: EchoReactiveObject<any>) =>
            getMeta(object).keys.some((key) => key.source === foreignKey.source && key.id === foreignKey.id),
          )
          .run();
        if (existing.length !== 0) {
          return;
        }

        const contact = create(
          contactSchema,
          {
            name: user.name,
            email: user.email,
            opg: project.org,
          },
          {
            keys: [foreignKey],
          },
        );

        space.db.add(contact);
      }),
    );

    getMeta(project).keys.push({ source: 'github.com', id: 'test' });

    // TODO(burdon): Make automatic.
    await space.db.flush();
  }
});
