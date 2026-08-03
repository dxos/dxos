//
// Copyright 2025 DXOS.org
//

import { type Message } from '@dxos/types';

/**
 * Minimal identity shape for byline rendering. Satisfied by the `@dxos/halo`
 * `Space.Member` / `Identity.Info` (flat `did` / `displayName`).
 */
export type BylineIdentity = {
  did?: string;
  displayName?: string;
};

export const renderByline =
  (identities: readonly BylineIdentity[]) =>
  (message: Message.Message, index: number, debug = false): string[] => {
    if (message.sender.role === 'assistant') {
      // Start/stop block.
      return [message.blocks.find((block) => block._tag === 'transcript')?.text ?? '', ''];
    }

    // TODO(burdon): Use link/reference markup for users (with popover).
    // TODO(burdon): Color and avatar.
    const identity = identities.find((identity) => identity.did === message.sender.identityDid);
    const name =
      identity?.displayName ??
      message.sender.contact?.target?.fullName ??
      message.sender.name ??
      message.sender.email ??
      message.sender.identityDid;
    const blocks = message.blocks.filter((block) => block._tag === 'transcript');
    return [
      // TODO(thure): Use an XML tag with the bits needed here.
      `###### ${name}` + (debug ? ` [${index}]:${message.id}` : ''),
      blocks.map((block) => block.text.trim()).join(' '),
      '',
    ];
  };
