//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { Button, Card, Icon, Toolbar } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Organization, Person } from '@dxos/types';

import { CrmPlugin } from '#plugin';
import { CrmOperation } from '#types';

/**
 * Drives {@link CrmOperation.EnrichImages} against seeded objects that deliberately start with no
 * `image`, so the enrichment is observable: each card shows its current image URL, or "none".
 *
 * The operation reaches a REAL image service (EDGE's `/image` prefix by default; override with
 * `DX_CRM_IMAGE_SERVICE_URL`), so a run here makes live requests and can legitimately fail — the story
 * reports whatever comes back rather than pretending it succeeded.
 */
const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const people = useQuery(space?.db, Filter.type(Person.Person));
  const organizations = useQuery(space?.db, Filter.type(Organization.Organization));
  const invoker = useOperationInvoker();
  const [status, setStatus] = useState<string>('Not run.');

  const handleEnrich = useCallback(() => {
    if (!space) {
      return;
    }
    setStatus('Running…');
    void invoker
      .invokePromise(CrmOperation.EnrichImages, { limit: 8 }, { spaceId: space.db.spaceId })
      .then((result) => {
        // Surface the operation's own error channel: a reachable-but-unhappy service returns a result
        // with `error` set rather than rejecting.
        setStatus(result.error ? `Failed: ${String(result.error)}` : `Done: ${JSON.stringify(result.data)}`);
      })
      .catch((err) => setStatus(`Threw: ${String(err)}`));
  }, [invoker, space]);

  if (!space || (people.length === 0 && organizations.length === 0)) {
    return <Loading />;
  }

  return (
    <div className='flex flex-col gap-2 p-2'>
      <Toolbar.Root>
        <Button onClick={handleEnrich} data-testid='crm.story.enrich'>
          Enrich images
        </Button>
        <span className='text-sm text-description' data-testid='crm.story.status'>
          {status}
        </span>
      </Toolbar.Root>

      {[...people, ...organizations].map((subject) => (
        <Card.Root key={subject.id} fullWidth>
          <Card.Header>
            <Card.Block>
              <Icon icon={Obj.instanceOf(Person.Person, subject) ? 'ph--user--regular' : 'ph--buildings--regular'} />
            </Card.Block>
            <Card.Title>{Obj.getLabel(subject, { fallback: 'typename' })}</Card.Title>
          </Card.Header>
          <Card.Body>
            <Card.Row>
              <Card.Text classNames='text-sm text-description' data-testid={`crm.story.image.${subject.id}`}>
                {(subject as { image?: string }).image ?? 'image: none'}
              </Card.Text>
            </Card.Row>
          </Card.Body>
        </Card.Root>
      ))}
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-crm/operations/EnrichImages',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        StorybookPlugin.make({}),
        // Without the plugin the operation has no registered handler, so the button would fail on
        // click — the story exists to drive the real operation, not a stub.
        CrmPlugin(),
        ClientPlugin.make({
          types: [Organization.Organization, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());

              // Seeded with an email/website but NO image: those are exactly the fields the enrichment
              // derives a candidate URL from (Gravatar for a person, the domain for an organization).
              space.db.add(
                Obj.make(Person.Person, {
                  fullName: 'Ada Lovelace',
                  emails: [{ value: 'ada@example.com' }],
                }),
              );
              space.db.add(
                Obj.make(Organization.Organization, {
                  name: 'Example Corp',
                  website: 'https://example.com',
                }),
              );
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
