//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { DXN } from '@dxos/keys';
import { type Observability } from '@dxos/observability';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { ObservabilityCapabilities } from '@dxos/plugin-observability';
import { corePlugins } from '@dxos/plugin-testing';
import { Config } from '@dxos/react-client';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { FeedbackPanel } from './FeedbackPanel';

// Minimal Observability stub — just enough surface to satisfy FeedbackPanel's
// `isAvailable('feedback')` probe and a no-op `captureUserFeedback`. The full
// interface is large; the cast keeps the story fixture readable.
const makeObservability = ({ available = true }: { available?: boolean } = {}): Observability.Observability =>
  ({
    isAvailable: () => Effect.succeed(available),
    feedback: {
      captureUserFeedback: async (form: any) => {
        // eslint-disable-next-line no-console
        console.log('[story] captureUserFeedback', form);
        return 'story-event-uuid';
      },
    },
  }) as unknown as Observability.Observability;

/** Contributes a mock Observability capability to the story plugin manager. */
const StoryObservabilityPlugin = ({ available = true }: { available?: boolean } = {}) =>
  Plugin.define({ id: DXN.make('org.dxos.story.observability'), name: 'Story Observability' }).pipe(
    Plugin.addModule({
      id: 'observability',
      activatesOn: ActivationEvents.Startup,
      activate: () =>
        Effect.succeed(
          Capability.contributes(ObservabilityCapabilities.Observability, makeObservability({ available })),
        ),
    }),
    Plugin.make,
  );

/** Contributes a LogDownloader capability so the form renders the "Download logs" button. */
const StoryLogDownloaderPlugin = () =>
  Plugin.define({ id: DXN.make('org.dxos.story.logDownloader'), name: 'Story Log Downloader' }).pipe(
    Plugin.addModule({
      id: 'log-downloader',
      activatesOn: ActivationEvents.Startup,
      activate: () =>
        Effect.succeed(
          Capability.contributes(ObservabilityCapabilities.LogDownloader, () => {
            // eslint-disable-next-line no-console
            console.log('[story] download logs clicked');
          }),
        ),
    }),
    Plugin.make,
  );

const makeConfig = ({ version = '0.8.3-story' }: { version?: string } = {}) =>
  new Config({
    version: 1,
    runtime: {
      app: {
        build: { version, timestamp: '2026-05-19T20:34:24.000Z', commitHash: 'storyhash' },
        env: { DX_ENVIRONMENT: 'development' },
      },
    },
  });

const meta = {
  title: 'plugins/plugin-support/containers/FeedbackPanel',
  component: FeedbackPanel,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-(--dx-r1-size)' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof FeedbackPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Feedback is available; submission paths log to the console. */
export const Default: Story = {
  decorators: [
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          config: makeConfig(),
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
            }),
        }),
        StoryObservabilityPlugin()(),
      ],
    }),
  ],
};

/** Adds the "Download logs" affordance contributed by plugin-observability. */
export const WithDownloadLogs: Story = {
  decorators: [
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          config: makeConfig(),
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
            }),
        }),
        StoryObservabilityPlugin()(),
        StoryLogDownloaderPlugin()(),
      ],
    }),
  ],
};

/** Observability reports feedback unavailable — submit buttons disabled. */
export const FeedbackUnavailable: Story = {
  decorators: [
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          config: makeConfig(),
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
            }),
        }),
        StoryObservabilityPlugin({ available: false })(),
      ],
    }),
  ],
};
