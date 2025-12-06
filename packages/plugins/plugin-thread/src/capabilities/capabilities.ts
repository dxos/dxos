//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type DeepReadonly } from '@dxos/util';

import { type CallManager, type CallState, type MediaState } from '../calls';
import { meta } from '../meta';
import { type Channel, type ThreadState, type ViewState } from '../types';

export namespace ThreadCapabilities {
  export const CallManager = defineCapability<CallManager>(`${meta.id}/capability/call-manager`);

  // TODO(burdon): Better way to define specific extensions for meeting companions.
  // TODO(burdon): This brings in deps from ../calls; how should we manage/minimize explicit type exposure to other plugins?
  // TODO(wittjosiah): These callbacks could be intents once we support broadcast.
  export type CallProperties = {
    onJoin: (state: { channel?: Channel.Channel; roomId?: string }) => Promise<void>;
    onLeave: (roomId?: string) => Promise<void>;
    onCallStateUpdated: (callState: CallState) => Promise<void>;
    onMediaStateUpdated: ([mediaState, isSpeaking]: [MediaState, boolean]) => Promise<void>;
  };

  export const CallExtension = defineCapability<CallProperties>(`${meta.id}/capability/call-extension`);

  type GetViewState = (subjectId: string) => ViewState;
  export const State = defineCapability<{ state: DeepReadonly<ThreadState>; getViewState: GetViewState }>(
    `${meta.id}/capability/state`,
  );
  export const MutableState = defineCapability<{ state: ThreadState; getViewState: GetViewState }>(
    `${meta.id}/capability/state`,
  );
}
