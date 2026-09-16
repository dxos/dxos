//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useObject, useResolveRef } from '@dxos/echo-react';

import { FramePreview } from '#components';
import { type Frame } from '#types';

import { useMediaArtifactCoverSource } from '../../hooks/index.ts';

export type FrameThumbnailProps = {
  frame: Frame.Frame;
  index: number;
};

/** A frame's preview with its artifact's cover resolved — the binding `FramePreview` leaves out. */
export const FrameThumbnail = ({ frame, index }: FrameThumbnailProps) => {
  // The snapshot re-renders this on frame changes; the ref is read live so the cover resolves.
  const [snapshot] = useObject(frame);
  const artifact = useResolveRef(snapshot ? frame.artifact : undefined);
  const [artifactSnapshot] = useObject(artifact);
  const { src, contentType } = useMediaArtifactCoverSource(artifactSnapshot);
  return <FramePreview index={index} name={snapshot?.name} src={src} contentType={contentType} />;
};

FrameThumbnail.displayName = 'FrameThumbnail';
