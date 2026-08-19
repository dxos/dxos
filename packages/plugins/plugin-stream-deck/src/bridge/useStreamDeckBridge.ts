//
// Copyright 2026 DXOS.org
//

import { useEffect, useRef, useState } from 'react';

import type * as Protocol from '#protocol';

import { type BridgeState, StreamDeckBridge } from './StreamDeckBridge';

export type UseStreamDeckBridgeOptions = {
  /** Frame to keep the device showing; republished whenever it changes. */
  frame: Protocol.Frame;
  onInput?: (input: Protocol.Input) => void;
  enabled?: boolean;
};

export type UseStreamDeckBridgeResult = {
  state: BridgeState;
  device?: Protocol.DeviceProfile;
};

/**
 * Keeps the device showing the current frame for as long as the caller is mounted.
 *
 * Phase 2 drives the bridge from the dashboard surface, so the device mirrors the panel while it is
 * open. A headless driver — so the keys stay live with no surface rendered — is the next step.
 */
export const useStreamDeckBridge = ({
  frame,
  onInput,
  enabled = true,
}: UseStreamDeckBridgeOptions): UseStreamDeckBridgeResult => {
  const [state, setState] = useState<BridgeState>('idle');
  const [device, setDevice] = useState<Protocol.DeviceProfile>();
  const bridge = useRef<StreamDeckBridge | undefined>(undefined);
  // Held in a ref so a new callback identity does not tear down the connection.
  const inputRef = useRef(onInput);
  inputRef.current = onInput;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const instance = new StreamDeckBridge({
      onInput: (input) => inputRef.current?.(input),
      onHello: setDevice,
      onStateChange: setState,
    });
    bridge.current = instance;
    instance.open();
    return () => {
      instance.close();
      bridge.current = undefined;
      setDevice(undefined);
    };
  }, [enabled]);

  useEffect(() => {
    bridge.current?.publish(frame);
    // Republished on reconnect too: `state` changing to `connected` means the device lost its pixels.
  }, [frame, state]);

  return { state, device };
};
