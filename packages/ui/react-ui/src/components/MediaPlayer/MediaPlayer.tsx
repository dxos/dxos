//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/ui-theme';

import { type ThemedClassName } from '../../util';

export type MediaKind = 'video' | 'audio';

export type MediaPlayerProps = ThemedClassName<{
  src: string;
  /** Override auto-detection. When omitted, `detectMediaKind(src)` is used and falls back to 'video'. */
  kind?: MediaKind;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  /** Accessible label for the `<video>` / `<audio>` element. */
  alt?: string;
  /** Defaults to 'anonymous' for cross-origin sources (e.g. signed S3 URLs). */
  crossOrigin?: 'anonymous' | 'use-credentials' | '';
}>;

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogv', '.mov', '.m4v'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];

/**
 * Best-effort detection of `video` vs `audio` from a media URL.
 * Inspects the pathname's extension (ignoring query/hash). Returns `undefined`
 * when the URL doesn't look like a recognised media file — callers should
 * default to 'video' or render a fallback (e.g. iframe / img).
 */
export const detectMediaKind = (src: string): MediaKind | undefined => {
  // Strip query and hash, then take the last path segment's extension.
  const pathname = src.split(/[?#]/, 1)[0]!;
  const lower = pathname.toLowerCase();
  if (VIDEO_EXTENSIONS.some((extension) => lower.endsWith(extension))) {
    return 'video';
  }
  if (AUDIO_EXTENSIONS.some((extension) => lower.endsWith(extension))) {
    return 'audio';
  }
  return undefined;
};

/**
 * Renders a generated or remotely-hosted media artefact as a native
 * `<video>` or `<audio>` element. `kind` defaults to the auto-detected
 * kind from the URL extension (and falls back to 'video' for ambiguous URLs).
 */
export const MediaPlayer = ({
  src,
  kind,
  classNames,
  controls = true,
  autoPlay = false,
  loop = false,
  muted = false,
  alt,
  crossOrigin = 'anonymous',
}: MediaPlayerProps) => {
  const resolved = kind ?? detectMediaKind(src) ?? 'video';
  const className = mx('w-full', classNames);
  if (resolved === 'audio') {
    return (
      <audio
        className={className}
        src={src}
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        crossOrigin={crossOrigin}
        aria-label={alt}
      />
    );
  }
  return (
    <video
      className={className}
      src={src}
      controls={controls}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      crossOrigin={crossOrigin}
      aria-label={alt}
    />
  );
};
