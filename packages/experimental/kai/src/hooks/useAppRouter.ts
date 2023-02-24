//
// Copyright 2023 DXOS.org
//

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Invitation, InvitationEncoder, Space } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { useSpaces } from '@dxos/react-client';

import { defaultFrameId, FrameDef, useFrames } from './useFrames';

// TODO(burdon): Create defs/helpers for other routes.
export enum Section {
  FRAME = 'frame',
  REGISTRY = 'registry'
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
  objectId
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

  return '/' + parts.join('/');
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
// TODO(burdon): Should not create new space here -- instead on check for profile, initial space.
// TODO(burdon): Better abstraction for app state hierarchy (and router paths).
export const useAppRouter = (): AppRoute => {
  const navigate = useNavigate();
  const { spaceKey, section, frame, objectId } = useParams();
  const spaces = useSpaces();
  const space = spaceKey ? findSpace(spaces, spaceKey) : undefined;

  useEffect(() => {
    if (!space && spaces.length > 0) {
      navigate(createPath({ spaceKey: spaces[0].key, frame: frame ?? defaultFrameId }));
    }
  }, [space, spaces]);

  const { frames, active: activeFrames } = useFrames();
  const frameId = frame && decodeFrame(frame);
  const frameDef = frameId
    ? activeFrames.find((id) => id === frameId)
      ? frames.get(frameId)
      : frames.get(defaultFrameId)
    : undefined;

  return { space, section, frame: frameDef, objectId };
};
