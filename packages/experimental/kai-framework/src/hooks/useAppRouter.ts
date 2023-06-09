//
// Copyright 2023 DXOS.org
//

import { useParams } from 'react-router-dom';

import { Invitation, InvitationEncoder, Space } from '@dxos/client';
import { useFrameRegistry, FrameDef } from '@dxos/kai-frames';
import { PublicKey } from '@dxos/keys';
import { useSpaces } from '@dxos/react-client';

// TODO(burdon): Create defs/helpers for other routes.
export enum Section {
  DMG = 'metagraph',
  FRAME = 'frame',
  BOTS = 'bots',
}

const truncateKey = (key: PublicKey) => key.toHex().slice(0, 8);

export const findSpace = (spaces: Space[], spaceKey: string): Space | undefined =>
  spaces.find((space) => truncateKey(space.key) === spaceKey);

const encodeFrame = (frame: string) => frame.replaceAll('.', '_');
export const decodeFrame = (frame: string) => frame.replaceAll('_', '.');

export const createPath = ({
  spaceKey,
  section,
  frame,
  objectId,
}: {
  spaceKey?: PublicKey;
  section?: string;
  frame?: string;
  objectId?: string;
}) => {
  if (!spaceKey) {
    return '/';
  }

  const parts = [truncateKey(spaceKey)];
  if (section) {
    parts.push(section);
  } else if (frame) {
    parts.push(Section.FRAME, encodeFrame(frame));
    if (objectId) {
      parts.push(objectId);
    }
  }

  return '/' + parts.join('/') + document.location.search;
};

export const createInvitationPath = (invitation: Invitation) =>
  `/?spaceInvitationCode=${InvitationEncoder.encode(invitation)}`;

export type AppRoute = {
  space?: Space;
  section?: string;
  frame?: FrameDef<any>;
  objectId?: string;
};

/**
 * App Route:
 * /truncateKey(spaceKey)/section[/encodeFrame(frameId)[/objectId]]
 */
export const useAppRouter = (): AppRoute => {
  const { spaceKey, section, frame, objectId } = useParams();
  const spaces = useSpaces({ all: true });
  const space = spaceKey ? findSpace(spaces, spaceKey) : undefined;

  const frameRegistry = useFrameRegistry();
  const frameId = frame && decodeFrame(frame);
  const frameDef = frameId ? frameRegistry.getFrameDef(frameId) : undefined;

  return { space, section, frame: frameDef, objectId };
};
