//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

import { IconButton, Popover } from '@dxos/react-ui';

import { type ArtifactKind, type ArtifactLink } from '../../pull-request-body.ts';

/** The leading icon for each kind of artifact. */
export const artifactIcon: Record<ArtifactKind, string> = {
  video: 'ph--film-strip--regular',
  image: 'ph--image--regular',
  file: 'ph--file--regular',
};

/** The image or video itself, or nothing for a file the browser cannot show inline. */
export const ArtifactMedia = ({ artifact, classNames }: { artifact: ArtifactLink; classNames?: string }) =>
  artifact.kind === 'video' ? (
    <video
      src={artifact.url}
      controls
      muted
      playsInline
      preload='metadata'
      className={['block w-full bg-black rounded-sm', classNames].filter(Boolean).join(' ')}
      data-testid='pull-request.artifact.video'
    />
  ) : artifact.kind === 'image' ? (
    <img
      src={artifact.url}
      alt={artifact.label ?? artifact.name}
      loading='lazy'
      className={['block w-full object-contain rounded-sm', classNames].filter(Boolean).join(' ')}
      data-testid='pull-request.artifact.image'
    />
  ) : null;

export type ArtifactPillProps = {
  artifact: ArtifactLink;
  /** The link's text; the file name when it was written bare. */
  children?: ReactNode;
};

/**
 * An artifact link as a pill that previews its image or video in place, so a reader sees the demo
 * without leaving the pull request. The outline matches the anchor chip a GitHub link becomes, so
 * the body's links read as one kind of thing.
 */
export const ArtifactPill = ({ artifact, children }: ArtifactPillProps) => {
  const label = typeof children === 'string' && children !== artifact.url ? children : artifact.name;
  if (artifact.kind === 'file') {
    return (
      <a href={artifact.url} target='_blank' rel='noopener noreferrer' className='dx-tag--anchor'>
        {label}
      </a>
    );
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <IconButton
          variant='tag'
          density='sm'
          classNames='bg-input-surface text-base-fg font-normal ring-inset ring ring-neutral-border hover:bg-hover-surface hover:ring-info-border align-baseline'
          icon={artifactIcon[artifact.kind]}
          iconClassNames={artifact.kind === 'video' ? 'text-violet-500' : 'text-sky-500'}
          label={label}
          noTooltip
          data-testid='pull-request.artifact.pill'
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content classNames='w-[min(40rem,90vw)]' onOpenAutoFocus={(event) => event.preventDefault()}>
          <Popover.Viewport classNames='p-1'>
            <ArtifactMedia artifact={artifact} />
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
