//
// Copyright 2023 DXOS.org
//

import { useParams } from 'react-router-dom';

import { Invitation, InvitationEncoder, Space } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { useSpaces } from '@dxos/react-client';

import { FrameDef, useFrames } from './useFrames';

// TODO(burdon): Create defs/helpers for other routes.
export enum Section {
  FRAME = 'frame',
  REGISTRY = 'registry',
  SETTINGS = 'settings'
}

const truncateKey = (key: PublicKey) => key.toHex().slice(0, 8);

export const findSpace = (spaces: Space[], spaceKey: string): Space | undefined =>
  spaces.find((space) => truncateKey(space.key) === spaceKey);

const encodeFrame = (frame: string) => frame.replaceAll('.', '_');
const decodeFrame = (frame: string) => frame.replaceAll('_', '.');

export const createPath = ({
  spaceKey,
  section,
  frame,
  objectId
}: {
  spaceKey: PublicKey;
  section?: string;
  frame?: string;
  objectId?: string;
}) => {
  const parts = [truncateKey(spaceKey)];
  if (section) {
    parts.push(section);
  } else if (frame) {
    parts.push(Section.FRAME, encodeFrame(frame));
    if (objectId) {
      parts.push(objectId);
    }
  }

  return [truncateKey(spaceKey), section].join('/');
};

export const createInvitationPath = (invitation: Invitation) =>
  `/?spaceInvitationCode=${InvitationEncoder.encode(invitation)}`;

export type AppRoute = {
  space?: Space;
  section?: string;
  frame?: FrameDef;
  objectId?: string;
};

/**
 * App Route:
 *  /truncateKey(spaceKey)/section[/encodeFrame(frameId)[/objectId]]
 */
// TODO(burdon): Better abstraction for app state hierarchy (and router paths).
export const useAppRouter = (): AppRoute => {
  const spaces = useSpaces();
  const { spaceKey, section, frame, objectId } = useParams();

  // TODO(burdon): Remove SpaceSelector.
  // const [space] = useCurrentSpace();
  const space = spaceKey ? findSpace(spaces, spaceKey) : undefined;

  // TODO(burdon): Active is unsound.
  const { frames, active: activeFrames } = useFrames();
  const frameId = frame ? decodeFrame(frame) : undefined;
  const frameDef = frameId && activeFrames.find((id) => id === frameId) ? frames.get(frameId) : undefined;

  return { space, section, frame: frameDef, objectId };
};
