//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Button, Icon } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import type { Track } from '#types';

import { hueFor, hueToHex } from '../../util/hue';

export type TrackListProps = {
  tracks: ReadonlyArray<Track.Track>;
  selectedTrackId?: string | null;
  onSelect?: (trackId: string) => void;
  onMute?: (trackId: string, muted: boolean) => void;
  onAdd?: () => void;
  onRemove?: (trackId: string) => void;
  classNames?: string;
};

/**
 * Vertical list of tracks with mute toggle, selection state, and add/remove actions.
 * Pure presentation; the container wires actions back to the Score schema.
 */
export const TrackList = ({
  tracks,
  selectedTrackId,
  onSelect,
  onMute,
  onAdd,
  onRemove,
  classNames,
}: TrackListProps) => {
  // TODO(burdon): Reuse list.
  return (
    <div
      className={mx('flex flex-col gap-1 p-2 overflow-y-auto', classNames)}
      role='listbox'
      aria-label='Tracks'
      aria-activedescendant={selectedTrackId ? `track-${selectedTrackId}` : undefined}
    >
      {tracks.map((track) => {
        const selected = track.id === selectedTrackId;
        return (
          <div
            key={track.id}
            id={`track-${track.id}`}
            role='option'
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className='flex items-center gap-2 px-2 py-1 rounded-sm cursor-pointer text-sm dx-selected dx-hover'
            onClick={() => onSelect?.(track.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect?.(track.id);
              }
            }}
            data-selected={selected}
          >
            <span
              className='inline-block w-3 h-3 rounded-sm shrink-0 border border-black/20'
              style={{ backgroundColor: hueToHex(hueFor(track)) }}
              aria-hidden
            />
            <span className='flex-1 truncate'>{track.name}</span>
            <button
              type='button'
              className={mx(
                'p-1 rounded text-xs',
                track.muted ? 'text-amber-500' : 'text-neutral-500 hover:text-neutral-300',
              )}
              onClick={(event) => {
                event.stopPropagation();
                onMute?.(track.id, !track.muted);
              }}
              aria-label={track.muted ? 'Unmute' : 'Mute'}
            >
              <Icon icon={track.muted ? 'ph--speaker-x--regular' : 'ph--speaker-high--regular'} size={4} />
            </button>
            {onRemove && (
              <button
                type='button'
                className='p-1 rounded text-xs text-neutral-500'
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(track.id);
                }}
                aria-label='Remove track'
              >
                <Icon icon='ph--trash--regular' size={4} />
              </button>
            )}
          </div>
        );
      })}
      {onAdd && (
        <Button onClick={onAdd} classNames='mt-1 justify-start gap-2'>
          <Icon icon='ph--plus--regular' size={4} />
          Add track
        </Button>
      )}
    </div>
  );
};
