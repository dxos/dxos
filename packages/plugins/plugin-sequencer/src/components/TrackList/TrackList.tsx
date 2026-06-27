//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Button, Icon } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
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
 *
 * Each row has multiple interactive controls (select / mute / remove), so this is a plain
 * `role=list` rather than a `listbox`: nesting buttons inside a `role=option` is invalid
 * WAI-ARIA. The track name is a focusable button that selects (keyboard-activatable); the
 * active track is conveyed via `aria-current` + `dx-current` row styling (the "you-are-here"
 * grammar), mirroring `OrderedListItem`.
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
  return (
    <Listbox.Root>
      <div className={mx('flex flex-col gap-1 p-2 overflow-y-auto', classNames)}>
        <Listbox.Content aria-label='Tracks' classNames='gap-1'>
          {tracks.map((track) => {
            const selected = track.id === selectedTrackId;
            return (
              <Listbox.Item
                key={track.id}
                id={track.id}
                aria-current={selected || undefined}
                classNames='gap-2 px-2 py-1 rounded-sm text-sm dx-current'
              >
                <span
                  className='inline-block w-3 h-3 rounded-sm shrink-0 border border-black/20'
                  style={{ backgroundColor: hueToHex(hueFor(track)) }}
                  aria-hidden
                />
                <button
                  type='button'
                  className='flex-1 min-w-0 truncate text-start rounded-sm dx-focus-ring'
                  onClick={() => onSelect?.(track.id)}
                  aria-current={selected || undefined}
                >
                  {track.name}
                </button>
                <button
                  type='button'
                  className={mx(
                    'p-1 rounded text-xs dx-focus-ring',
                    track.muted ? 'text-amber-500' : 'text-neutral-500 hover:text-neutral-300',
                  )}
                  onClick={() => onMute?.(track.id, !track.muted)}
                  aria-label={track.muted ? 'Unmute' : 'Mute'}
                >
                  <Icon icon={track.muted ? 'ph--speaker-x--regular' : 'ph--speaker-high--regular'} size={4} />
                </button>
                {onRemove && (
                  <button
                    type='button'
                    className='p-1 rounded text-xs text-neutral-500 dx-focus-ring'
                    onClick={() => onRemove(track.id)}
                    aria-label='Remove track'
                  >
                    <Icon icon='ph--trash--regular' size={4} />
                  </button>
                )}
              </Listbox.Item>
            );
          })}
        </Listbox.Content>
        {onAdd && (
          <Button onClick={onAdd} classNames='mt-1 justify-start gap-2'>
            <Icon icon='ph--plus--regular' size={4} />
            Add track
          </Button>
        )}
      </div>
    </Listbox.Root>
  );
};
