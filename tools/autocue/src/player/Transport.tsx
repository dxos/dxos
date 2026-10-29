//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { type Chapter } from './types.ts';
import { type Playback, RATES, formatClock } from './usePlayback.ts';

export type Download = { label: string; href: string; icon: string };

export type TransportProps = {
  playback: Playback;
  chapters: Chapter[];
  downloads: Download[];
  onFullscreen: () => void;
};

/** Play, stop and step between chapters, then speed, volume, fullscreen and the downloads. */
export const Transport = ({ playback, chapters, downloads, onFullscreen }: TransportProps) => {
  const chapter = chapters[playback.chapter];
  return (
    <Toolbar.Root aria-label='Playback' classNames='flex-wrap'>
      <Button.Root
        variant='ghost'
        icon='ph--skip-back--regular'
        label='Previous chapter (←)'
        iconOnly
        onClick={() => playback.stepChapter(-1)}
      />
      <Button.Root
        variant='primary'
        icon={playback.playing ? 'ph--pause--fill' : 'ph--play--fill'}
        label={playback.playing ? 'Pause (Space)' : 'Play (Space)'}
        iconOnly
        onClick={playback.toggle}
      />
      <Button.Root variant='ghost' icon='ph--stop--fill' label='Stop (S)' iconOnly onClick={playback.stop} />
      <Button.Root
        variant='ghost'
        icon='ph--skip-forward--regular'
        label='Next chapter (→)'
        iconOnly
        onClick={() => playback.stepChapter(1)}
      />
      <span className='shrink-0 px-1 font-mono text-sm tabular-nums whitespace-nowrap'>
        <span className='text-fg'>{formatClock(playback.time)}</span>
        <span className='text-fg-muted'> / {formatClock(playback.duration)}</span>
      </span>
      <Toolbar.Text classNames='min-w-0 flex-1 truncate font-medium'>
        {chapter ? `${playback.chapter + 1}. ${chapter.title}` : ''}
      </Toolbar.Text>
      <Toolbar.ToggleGroup
        type='single'
        value={String(playback.rate)}
        onValueChange={(value) => value && playback.setRate(Number(value))}
        aria-label='Speed'
      >
        {RATES.map((rate) => (
          <ToggleGroup.Item key={rate} value={String(rate)} classNames='font-mono text-xs px-1.5'>
            {`${rate}×`}
          </ToggleGroup.Item>
        ))}
      </Toolbar.ToggleGroup>
      <Toolbar.Separator />
      <Button.Root
        variant='ghost'
        icon={playback.muted || playback.volume === 0 ? 'ph--speaker-x--regular' : 'ph--speaker-high--regular'}
        label={playback.muted ? 'Unmute (M)' : 'Mute (M)'}
        iconOnly
        onClick={playback.toggleMute}
      />
      <Input.Slider
        classNames='w-24'
        min={0}
        max={1}
        step={0.05}
        value={[playback.muted ? 0 : playback.volume]}
        onValueChange={([value]) => playback.setVolume(value)}
        aria-label='Volume'
      />
      <Button.Root
        variant='ghost'
        icon='ph--corners-out--regular'
        label='Fullscreen (F)'
        iconOnly
        onClick={onFullscreen}
      />
      {downloads.length > 0 && <Toolbar.Separator />}
      {downloads.map((download) => (
        <Toolbar.Link
          key={download.href}
          href={download.href}
          rel='noopener'
          download
          classNames='inline-flex items-center gap-1 whitespace-nowrap'
        >
          <Icon.Icon icon={download.icon} />
          {download.label}
        </Toolbar.Link>
      ))}
    </Toolbar.Root>
  );
};
