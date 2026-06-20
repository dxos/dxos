//
// Copyright 2024 DXOS.org
//

// Helpers shared between LiveTranscription / FileTranscription stories.
// Each "live" story differs only in its *audio source* (mic vs file); everything else —
// the local in-memory message buffer, the transcriber lifecycle, and the plugin-manager
// decorator stack — is identical and lives here.

import { type Decorator } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { scheduleTask } from '@dxos/async';
import { SpeakingMonitor } from '@dxos/av';
import { Context } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { IndexKind } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';
import { Message, Organization, Person } from '@dxos/types';
import { seedTestData } from '@dxos/types/testing';

import { useFeedModelAdapter, useTranscriber } from '#hooks';
import { TestItem } from '#testing';
import { type TranscriptionCapabilities } from '#types';

import { type Transcriber, type TranscriberProps } from '../transcriber';
import { TranscriptionPlugin } from '../TranscriptionPlugin';
import { renderByline } from '../util';

export const useIsSpeaking = (track?: MediaStreamTrack) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingMonitor = useMemo(() => {
    if (!track) {
      return;
    }

    return new SpeakingMonitor(track);
  }, [track]);

  useEffect(() => {
    if (!speakingMonitor) {
      return;
    }

    const ctx = new Context();
    scheduleTask(ctx, async () => {
      speakingMonitor.speakingChanged.on(ctx, () => setIsSpeaking(speakingMonitor.isSpeaking));
      await speakingMonitor.open();
      ctx.onDispose(() => speakingMonitor.close());
    });

    return () => {
      void ctx.dispose();
    };
  }, [speakingMonitor]);

  return isSpeaking;
};

//
// Message model.
//

/**
 * In-memory message buffer + model adapter for storybook use (production wires up a real
 * space-backed `Feed`). Returns the renderable `model` plus an `appendMessage` callback.
 */
export const useStoryMessageModel = () => {
  const [messages, setMessages] = useState<Message.Message[]>([]);
  const appendMessage = useCallback((message: Message.Message) => setMessages((prev) => [...prev, message]), []);
  const model = useFeedModelAdapter(renderByline([]), messages);
  return { model, appendMessage };
};

/**
 * Wraps blocks in a `Message.Message` with the given sender and appends it to the local buffer.
 * Provided as a convenience for stories that don't need entity-extraction or custom enrichment.
 */
export const useStoryAppendSegments = (
  appendMessage: (message: Message.Message) => void,
  sender: Message.Message['sender'] = {},
): TranscriberProps['onSegments'] =>
  useCallback<TranscriberProps['onSegments']>(
    async (blocks) => {
      appendMessage(
        Obj.make(Message.Message, {
          created: new Date().toISOString(),
          sender,
          blocks,
        }),
      );
    },
    [appendMessage, sender],
  );

//
// Transcriber lifecycle.
//

export type UseStoryTranscriberOptions = Pick<
  TranscriptionCapabilities.TranscriberProviderProps,
  'transcriberConfig' | 'recorderConfig' | 'onSegments'
> & {
  audioStreamTrack?: MediaStreamTrack;
  /** Whether the user has the toolbar toggle on. */
  running: boolean;
  /** Voice-activity flag — chunks recording only fires while `true`. */
  isSpeaking: boolean;
};

/**
 * Drives the transcriber's open/close + chunk-recording lifecycle off `running`,
 * the open flag, and an `isSpeaking` voice-activity gate. Returns the transcriber instance
 * (`undefined` until the capability resolves and an audio track is available).
 */
export const useStoryTranscriber = ({
  audioStreamTrack,
  running,
  isSpeaking,
  transcriberConfig,
  recorderConfig,
  onSegments,
}: UseStoryTranscriberOptions): Transcriber | undefined => {
  const transcriber = useTranscriber({
    audioStreamTrack,
    onSegments,
    transcriberConfig,
    recorderConfig,
  });

  // Open the transcriber when it becomes available; close on teardown.
  // `tokenRef` is a per-effect identity so a late `close()` completion from a stale
  // transcriber instance can't clobber `isOpen` after a newer instance has opened.
  const [isOpen, setIsOpen] = useState(false);
  const tokenRef = useRef<symbol | null>(null);
  useEffect(() => {
    if (!transcriber) {
      return;
    }
    const token = Symbol();
    tokenRef.current = token;
    void transcriber.open().then(
      () => tokenRef.current === token && setIsOpen(true),
      () => tokenRef.current === token && setIsOpen(false),
    );
    return () => {
      void transcriber.close().then(() => {
        if (tokenRef.current === token) {
          setIsOpen(false);
        }
      });
    };
  }, [transcriber]);

  // Start/stop chunk recording based on running + open + isSpeaking.
  useEffect(() => {
    if (!transcriber || !isOpen) {
      return;
    }
    if (running && isSpeaking) {
      transcriber.startChunksRecording();
    } else {
      transcriber.stopChunksRecording();
    }
  }, [transcriber, isOpen, running, isSpeaking]);

  return transcriber;
};

//
// Plugin manager decorator.
//

export type StoryDecoratorsOptions = {
  /**
   * Enable schema/graph/vector indexes after the client boots; needed for entity-extraction
   * queries over seeded `Person` / `Organization` objects.
   * @default false
   */
  enableVectorIndex?: boolean;
};

/**
 * Standard plugin-manager decorator for transcription stories: core plugins,
 * `ClientPlugin` with `Person`/`Organization`/`TestItem` schemas + seeded test data, plus
 * the `PreviewPlugin` and `TranscriptionPlugin`. Toggle `enableVectorIndex` for entity-extraction.
 */
export const createStoryDecorators = ({ enableVectorIndex = false }: StoryDecoratorsOptions = {}): Decorator[] => [
  withLayout({ layout: 'column' }),
  withPluginManager({
    plugins: [
      ...corePlugins(),
      StorybookPlugin({}),
      ClientPlugin({
        types: [TestItem, Person.Person, Organization.Organization],
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            const { personalSpace } = yield* initializeIdentity(client);
            if (enableVectorIndex) {
              yield* enableQueryIndexes(client.services.services);
            }
            yield* Effect.promise(() => seedTestData(personalSpace));
          }),
      }),
      PreviewPlugin(),
      TranscriptionPlugin(),
    ],
    fireEvents: [AppActivationEvents.SetupAppGraph],
  }),
];

// TODO(mykola): Make API easier to use.
// TODO(mykola): Delete after enabling vector indexing by default.
const enableQueryIndexes = (services: { QueryService?: any }) =>
  Effect.gen(function* () {
    yield* Effect.promise(() =>
      services.QueryService!.setConfig({
        enabled: true,
        indexes: [
          { kind: IndexKind.Kind.SCHEMA_MATCH },
          { kind: IndexKind.Kind.GRAPH },
          { kind: IndexKind.Kind.VECTOR },
          { kind: IndexKind.Kind.FULL_TEXT },
        ],
      }),
    );
    yield* Effect.promise(() => services.QueryService!.reindex());
  });
