//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useState } from 'react';

import { log } from '@dxos/log';
import { useConfig } from '@dxos/react-client';
import { Icon } from '@dxos/react-ui';
import { type ShapeComponentProps, type ShapeDef } from '@dxos/react-ui-canvas-editor';

import { createFunctionAnchors } from './common';
import { ComputeShape, type CreateShapeProps, createShape } from './defs';

export const GptRealtimeShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('gpt-realtime'),
  }),
);

export type GptRealtimeShape = Schema.Schema.Type<typeof GptRealtimeShape>;

export type CreateGptRealtimeProps = CreateShapeProps<GptRealtimeShape>;

export const createGptRealtime = (props: CreateGptRealtimeProps) =>
  createShape<GptRealtimeShape>({ type: 'gpt-realtime', size: { width: 256, height: 256 }, ...props });

export const GptRealtimeComponent = ({ shape }: ShapeComponentProps<GptRealtimeShape>) => {
  const [isLive, setIsLive] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const config = useConfig();

  const start = async () => {
    setIsLive(true);

    try {
      // Create WebRTC connection
      const peerConnection = new RTCPeerConnection();

      // Handle incoming audio
      peerConnection.ontrack = (event) => {
        const audioElement = document.createElement('audio');
        audioElement.srcObject = event.streams[0];
        audioElement.autoplay = true;
        audioElement.controls = false;
        audioElement.style.display = 'none';
        document.body.appendChild(audioElement);
        setIsReady(true);
      };

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Add microphone track to connection
      stream.getTracks().forEach((track) => peerConnection.addTransceiver(track, { direction: 'sendrecv' }));

      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Send offer to backend and get answer
      const AiServiceUrl = new URL(
        '/rtc-connect',
        config.values.runtime?.services?.ai?.server ?? DEFAULT_AI_SERVICE_URL,
      );
      const response = await fetch(AiServiceUrl, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          'Content-Type': 'application/sdp',
        },
      });

      const answer = await response.text();

      // Set remote description with answer
      await peerConnection.setRemoteDescription({
        sdp: answer,
        type: 'answer',
      });

      const dataChannel = peerConnection.createDataChannel('response');

      const configureData = () => {
        log.info('Configuring data channel');
        const event = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            // Provide the tools. Note they match the keys in the `fns` object above
            tools: [],
          },
        };
        dataChannel.send(JSON.stringify(event));
      };

      dataChannel.addEventListener('open', (ev) => {
        log.info('Opening data channel', { ev });
        configureData();
      });

      // {
      //     "type": "response.function_call_arguments.done",
      //     "event_id": "event_Ad2gt864G595umbCs2aF9",
      //     "response_id": "resp_Ad2griUWUjsyeLyAVtTtt",
      //     "item_id": "item_Ad2gsxA84w9GgEvFwW1Ex",
      //     "output_index": 1,
      //     "call_id": "call_PG12S5ER7l7HrvZz",
      //     "name": "get_weather",
      //     "arguments": "{\"location\":\"Portland, Oregon\"}"
      // }

      dataChannel.addEventListener('message', async (ev) => {
        const msg = JSON.parse(ev.data);
        // console.log('realtime gpt event', msg);
        // Handle function calls
        if (msg.type === 'response.function_call_arguments.done') {
          // const fn = fns[msg.name];
          // if (fn !== undefined) {
          //   console.log(`Calling local function ${msg.name} with ${msg.arguments}`);
          //   const args = JSON.parse(msg.arguments);
          //   const result = await fn(args);
          //   console.log('result', result);
          //   // Let OpenAI know that the function has been called and share it's output
          //   const event = {
          //     type: 'conversation.item.create',
          //     item: {
          //       type: 'function_call_output',
          //       call_id: msg.call_id, // call_id from the function_call message
          //       output: JSON.stringify(result), // result of the function
          //     },
          //   };
          //   dataChannel.send(JSON.stringify(event));
          // }
        }
      });
    } catch (error) {
      log.error('Error in realtime session:', { error });
      throw error;
    }
  };

  return (
    <div className='flex w-full justify-center items-center'>
      <Icon
        icon={isReady ? 'ph--waveform--regular' : isLive ? 'ph--pulse--regular' : 'ph--play--regular'}
        size={16}
        classNames={!isLive && 'cursor-pointer'}
        onClick={start}
      />
    </div>
  );
};

export const gptRealtimeShape: ShapeDef<GptRealtimeShape> = {
  type: 'gpt-realtime',
  name: 'GPT Realtime',
  icon: 'ph--pulse--regular',
  component: GptRealtimeComponent,
  createShape: createGptRealtime,
  // TODO(dmaretskyi): Can we fetch the schema dynamically?
  getAnchors: (shape) =>
    createFunctionAnchors(
      shape,
      Schema.Struct({
        audio: Schema.Any,
      }),
      Schema.Struct({}),
    ),
  resizable: true,
};

const DEFAULT_AI_SERVICE_URL = 'http://localhost:8788';
