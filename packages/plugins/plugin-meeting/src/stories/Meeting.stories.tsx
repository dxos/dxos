//
// Copyright 2026 DXOS.org
//

/**
 * Live meeting stories against the preview EDGE, with the meeting plugin and everything it builds on loaded, and the
 * client's EDGE features set as Composer sets them.
 *
 * Each tab boots its own identity and its own space, and its calls appear once the identity is bound to a
 * `test+*@dxos.org` account, since calls-service serves account holders only.
 *
 * - `Call`: the call alone in the shared room `ROOM_ID`, so a window per participant makes a multi-party call — the
 *   lobby, then the participant grid with its hover toolbar (mic, camera, screenshare, raised hand, leave).
 * - `CallTranscription`: the shared-room call beside this tab's own meeting; Start transcription makes that meeting the
 *   call's and shares the flag. The meeting stays per tab, and since the call's meeting is call-wide, the transcript
 *   lands in the meeting of the tab that last started transcription.
 * - `SharedMeeting` (shown as Meeting): the meeting as Composer shows it, one article whose Call tab joins the meeting's own room. A fresh load
 *   makes a new space; its invite link opens the story as a guest that joins that space, so every tab shows the same
 *   meeting, its call and its transcript.
 *
 * Needs a network, a microphone and an EDGE serving `/calls/realtimekit/*`.
 */

import { useAtomValue } from '@effect/atom-react/Hooks';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Feed, Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import * as CallsCapabilities from '@dxos/plugin-calls/CallsCapabilities';
import * as CallsPlugin from '@dxos/plugin-calls/CallsPlugin';
import { ClientPlugin, type TestAccountState, initializeIdentity, useTestAccount } from '@dxos/plugin-client/testing';
import * as InboxPlugin from '@dxos/plugin-inbox/InboxPlugin';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import * as TranscriptionPlugin from '@dxos/plugin-transcription/TranscriptionPlugin';
import { EdgeReplicationSetting } from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import { Config } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import {
  type Invitation,
  Invitation_AuthMethod,
  Invitation_State,
  InvitationEncoder,
} from '@dxos/react-client/invitations';
import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { Text } from '@dxos/schema';
import { Transcript } from '@dxos/types';

import * as MeetingPlugin from '#meta';
import { Meeting, MeetingActivity, MeetingOperation } from '#types';

const EDGE_URL = 'https://preview.dxos.network/';
const HUB_URL = new URL('hub/', EDGE_URL).href;

/** The swarm topic and the RealtimeKit meeting title, so every tab running these stories lands in one call. */
const ROOM_ID = 'storybook:plugin-meeting:standup';

/** The meeting's own space: an identity's default space is locked to its owner, so it cannot be shared. */
const MEETING_SPACE_NAME = 'Standup';

type StoryArgs = {
  /** A `Meeting` invite code: the tab joins the inviter's space instead of using a meeting of its own. */
  invitation?: string;
};

const CallView = () => {
  const account = useTestAccount(HUB_URL);
  if (account !== 'bound') {
    return <Loading data={{ account: describeAccount(account) }} />;
  }

  return (
    <Layout.Flex column grow>
      <Surface.Surface
        type={AppSurface.Article}
        data={{ subject: { roomId: ROOM_ID }, attendableId: ROOM_ID }}
        limit={1}
      />
    </Layout.Flex>
  );
};

const CallTranscriptionView = () => {
  const space = useMeetingSpace();
  const [meeting] = useQuery(space?.db, Filter.type(Meeting.Meeting));
  const callManager = Hooks.useCapabilities(CallsCapabilities.Manager)[0];
  if (!meeting || !callManager) {
    return <Loading data={{ meeting: !!meeting, callManager: !!callManager }} />;
  }

  return (
    <Layout.Flex column grow>
      <Toolbar.Root>
        <TranscriptionToggle meeting={meeting} />
      </Toolbar.Root>
      <Layout.Grid cols={2} gap='sm' grow>
        <CallView />
        <Surface.Surface
          type={AppSurface.Article}
          data={{ subject: meeting, attendableId: Obj.getURI(meeting) }}
          limit={1}
        />
      </Layout.Grid>
    </Layout.Flex>
  );
};

/** The meeting article offers this toggle only in the meeting's own room, which `ROOM_ID` is not. */
const TranscriptionToggle = ({ meeting }: { meeting: Meeting.Meeting }) => {
  const callManager = Hooks.useCapability(CallsCapabilities.Manager);
  const { invokePromise } = Hooks.useOperationInvoker();
  const joined = useAtomValue(callManager.joinedAtom);
  const enabled = MeetingActivity.isTranscriptionEnabled(
    useAtomValue(callManager.activityAtom(MeetingActivity.TRANSCRIPTION_KEY)),
  );

  const handleToggle = useCallback(async () => {
    if (!enabled) {
      // The transcript sink writes to the call's active meeting, and joining a room does not choose one.
      await invokePromise(MeetingOperation.SetActive, { object: meeting });
    }
    await invokePromise(MeetingOperation.SetTranscription, { enabled: !enabled });
  }, [enabled, invokePromise, meeting]);

  return (
    <Button.Root
      icon={enabled ? 'ph--subtitles-slash--regular' : 'ph--subtitles--regular'}
      label={enabled ? 'Stop transcription' : 'Start transcription'}
      disabled={!joined}
      onClick={handleToggle}
    />
  );
};

/**
 * The ready space holding the meeting: the one an invite code names, else the one this tab made. A joined space is
 * listed before it is ready, and reading its database then throws, so only ready spaces are considered.
 */
const useMeetingSpace = (invitation?: string): Space | undefined => {
  const spaces = useSpaces();
  const invitedSpaceId = useMemo(() => {
    const id = invitation && decodeInvitation(invitation)?.spaceId;
    return SpaceId.isValid(id) ? id : undefined;
  }, [invitation]);
  return invitation
    ? spaces.find((space) => space.id === invitedSpaceId)
    : spaces.find((space) => space.properties.name === MEETING_SPACE_NAME);
};

const MeetingView = ({ invitation }: StoryArgs) => {
  const account = useTestAccount(HUB_URL);
  const space = useMeetingSpace(invitation);
  const [meeting] = useQuery(space?.db, Filter.type(Meeting.Meeting));
  if (account !== 'bound' || !space || !meeting) {
    return <Loading data={{ account: describeAccount(account), space: !!space, meeting: !!meeting }} />;
  }

  return (
    <Layout.Flex column grow>
      <Toolbar.Root>
        <InviteActions space={space} />
      </Toolbar.Root>
      <Surface.Surface
        type={AppSurface.Article}
        data={{ subject: meeting, attendableId: Obj.getURI(meeting) }}
        limit={1}
      />
    </Layout.Flex>
  );
};

/** The Storybook manager's URL when the story runs inside it; a cross-origin host throws on reading it. */
const storyUrl = (): string => {
  try {
    return (window.top ?? window).location.href;
  } catch {
    return window.location.href;
  }
};

/** This story's URL with `invitation` set. */
const inviteUrl = (code: string): string => {
  const url = new URL(storyUrl());
  url.searchParams.set('args', `invitation:${code}`);
  return url.href;
};

/**
 * A standing multi-use invitation to the meeting's space, with no auth step, so anyone opening the link joins.
 * Composer invites through the space's members dialog, which this story does not load.
 */
const InviteActions = ({ space }: { space: Space }) => {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const invitation = space.share({ multiUse: true, authMethod: Invitation_AuthMethod.NONE });
    const subscription = invitation.subscribe((state) => {
      if (state.state === Invitation_State.CONNECTING) {
        setUrl(inviteUrl(InvitationEncoder.encode(state)));
      }
    });
    return () => {
      subscription.unsubscribe();
      void invitation.cancel();
    };
  }, [space]);

  const handleCopy = useCallback(() => url && void navigator.clipboard.writeText(url), [url]);
  const handleOpen = useCallback(() => url && window.open(url, '_blank'), [url]);

  return (
    <>
      <Button.Root icon='ph--link--regular' label='Copy invite link' disabled={!url} onClick={handleCopy} />
      <Button.Root icon='ph--user-plus--regular' label='Open as guest' disabled={!url} onClick={handleOpen} />
    </>
  );
};

class JoinSpaceError extends Data.TaggedError('JoinSpaceError')<{ readonly cause: unknown }> {}

/** The invitation a code encodes, or nothing for a malformed code, so a typo in the arg leaves the story loading. */
const decodeInvitation = (code: string): Invitation | undefined => {
  try {
    return InvitationEncoder.decode(code);
  } catch (error) {
    log.catch(error);
    return undefined;
  }
};

/** What the Loading state shows for the account: pending, bound, or why binding failed. */
const describeAccount = (account: TestAccountState): string => (account instanceof Error ? account.message : account);

/** Joins the invitation's space, resolving once the guest is admitted. */
const joinSpace = (client: Client, invitation: Invitation) =>
  Effect.callback<void, JoinSpaceError>((resume) => {
    const observable = client.spaces.join(invitation);
    const subscription = observable.subscribe(
      (state) => {
        if (state.state === Invitation_State.SUCCESS) {
          resume(Effect.void);
        }
      },
      (error) => resume(Effect.fail(new JoinSpaceError({ cause: error }))),
    );
    return Effect.sync(() => subscription.unsubscribe());
  });

const meta = {
  title: 'plugins/plugin-meeting/stories/Meeting',
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager<StoryArgs>(({ args }) => ({
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          types: [Feed.Feed, Transcript.Transcript, Meeting.Meeting, Text.Text],
          // As Composer sets them: the call's swarm needs EDGE signaling, and an invited tab receives the space's
          // objects and the transcript feed through the replicators.
          config: new Config({
            runtime: {
              client: { edgeFeatures: { signaling: true, subductionReplicator: true, feedReplicator: true } },
              services: { edge: { url: EDGE_URL } },
            },
          }),
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              if (args.invitation) {
                // The inviter's space already holds the meeting; a failed join leaves the story loading, with the cause logged.
                const invitation = decodeInvitation(args.invitation);
                if (invitation) {
                  yield* joinSpace(client, invitation).pipe(
                    Effect.catch((error) => Effect.sync(() => log.catch(error))),
                  );
                }
                return;
              }

              const space = yield* Effect.promise(() => client.spaces.create({ name: MEETING_SPACE_NAME }));
              yield* Effect.promise(() => space.waitUntilReady());
              yield* Effect.promise(() => space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED));

              const transcriptFeed = space.db.add(Feed.make());
              space.db.add(
                Obj.make(Meeting.Meeting, {
                  name: 'Standup',
                  participants: [],
                  transcript: Ref.make(space.db.add(Transcript.make(Ref.make(transcriptFeed)))),
                  notes: Ref.make(space.db.add(Text.make({ content: '' }))),
                  summary: Ref.make(space.db.add(Text.make({ content: '' }))),
                }),
              );
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        StorybookPlugin.make({}),
        InboxPlugin.make(),
        CallsPlugin.make(),
        TranscriptionPlugin.make(),
        MeetingPlugin.make(),
        MarkdownPlugin.make(),
        PreviewPlugin.make(),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  // Live: each render binds a preview Hub account and makes a replicated space, which CI's smoke run must not do.
  tags: ['!test'],
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const Call: Story = {
  render: () => <CallView />,
};

export const CallTranscription: Story = {
  render: () => <CallTranscriptionView />,
};

export const SharedMeeting: Story = {
  name: 'Meeting',
  render: (args) => <MeetingView {...args} />,
  argTypes: { invitation: { control: 'text' } },
};
