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
    <Listbox.Root value={selectedTrackId ?? undefined} onValueChange={(id) => onSelect?.(id)}>
      <div className={mx('flex flex-col gap-1 p-2 overflow-y-auto', classNames)}>
        <Listbox.Content aria-label='Tracks' classNames='gap-1'>
          {tracks.map((track) => (
            <Listbox.Item key={track.id} id={track.id} classNames='gap-2 px-2 py-1 rounded-sm text-sm'>
              <span
                className='inline-block w-3 h-3 rounded-sm shrink-0 border border-black/20'
                style={{ backgroundColor: hueToHex(hueFor(track)) }}
                aria-hidden
              />
              <Listbox.ItemLabel>{track.name}</Listbox.ItemLabel>
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
            </Listbox.Item>
          ))}
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
