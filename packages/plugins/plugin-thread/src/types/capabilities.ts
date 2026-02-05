//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { type CallManager, type CallState, type MediaState } from '../calls';
import { meta } from '../meta';
import { type Channel, type ThreadSettingsProps, type ThreadState, type ViewStore } from '../types';

export namespace ThreadCapabilities {
  export const Settings = Capability.make<Atom.Writable<ThreadSettingsProps>>(`${meta.id}/capability/settings`);
  export const CallManager = Capability.make<CallManager>(`${meta.id}/capability/call-manager`);

  // TODO(burdon): Better way to define specific extensions for meeting companions.
  // TODO(burdon): This brings in deps from ../calls; how should we manage/minimize explicit type exposure to other plugins?
  // TODO(wittjosiah): These callbacks could be intents once we support broadcast.
  export type CallProperties = {
    onJoin: (state: { channel?: Channel.Channel; roomId?: string }) => Promise<void>;
    onLeave: (roomId?: string) => Promise<void>;
    onCallStateUpdated: (callState: CallState) => Promise<void>;
    onMediaStateUpdated: ([mediaState, isSpeaking]: [MediaState, boolean]) => Promise<void>;
  };

  export const CallExtension = Capability.make<CallProperties>(`${meta.id}/capability/call-extension`);

  /** Thread state (drafts, toolbar state, current selection). */
  export const State = Capability.make<Atom.Writable<ThreadState>>(`${meta.id}/capability/state`);

  /** Per-subject view state (e.g., showResolvedThreads). */
  export const ViewState = Capability.make<Atom.Writable<ViewStore>>(`${meta.id}/capability/view-state`);
}
