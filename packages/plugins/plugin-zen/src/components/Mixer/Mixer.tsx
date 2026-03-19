//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { Icon, IconButton, type ThemedClassName, Splitter, Toolbar, Panel, useTranslation } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';

import { useCountdown } from '../../hooks';

import { MixerEngine } from '../../generator';
import { Dream, Sequence } from '../../types';
import { meta } from '../../meta';

import { Sound } from '../Sound';

//
// Mixer
//

export type MixerProps = ThemedClassName<{
  dream: Dream.Dream;
  engine: MixerEngine;
}>;

/** Multi-layer audio mixer with sequencer layers. */
export const Mixer = ({ classNames, dream, engine }: MixerProps) => {
  const [playing, setPlaying] = useState(false);
  const layers = dream.sequences ?? [];
  const [selected, setSelected] = useState<string | undefined>();
  const durationSeconds = dream.duration ?? 0;
  const timed = durationSeconds > 0;
  const { remaining, formattedTime, start: startCountdown, stop: stopCountdown } = useCountdown(durationSeconds);

  // Keep last selected layer visible during close animation.
  const selectedLayer = useMemo(() => layers.find((layer) => layer.id === selected), [layers, selected]);
  const lastSelectedLayer = useRef<Sequence.Sequence | undefined>(undefined);
  if (selectedLayer) {
    lastSelectedLayer.current = selectedLayer;
  }
  const displayedLayer = selectedLayer ?? lastSelectedLayer.current;

  const FADE_OUT_SECONDS = 10;
  const fadingRef = useRef(false);

  // Begin fade-out when approaching end; auto-stop at zero.
  useEffect(() => {
    if (!playing || !timed) {
      return;
    }
    if (remaining <= FADE_OUT_SECONDS && remaining > 0 && !fadingRef.current) {
      fadingRef.current = true;
      engine.fadeOut(remaining);
    }
    if (remaining === 0) {
      fadingRef.current = false;
      void engine.stop();
      setPlaying(false);
      stopCountdown();
    }
  }, [playing, timed, remaining, engine, stopCountdown]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      void engine.stop();
    };
  }, [engine]);

  const handlePlay = useCallback(async () => {
    if (playing) {
      fadingRef.current = false;
      await engine.stop();
      setPlaying(false);
      if (timed) {
        stopCountdown();
      }
    } else {
      fadingRef.current = false;
      await engine.play([...layers]);
      setPlaying(true);
      if (timed) {
        startCountdown();
      }
    }
  }, [playing, timed, layers, engine, startCountdown, stopCountdown]);

  const handleAdd = useCallback(() => {
    const sequence = Sequence.makeSequence();
    Obj.change(dream, (d) => {
      d.sequences = [...(d.sequences ?? []), sequence];
    });
    setSelected(sequence.id);
  }, [dream]);

  const handleSelect = useCallback((id: string) => {
    setSelected((prev) => (prev === id ? undefined : id));
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      Obj.change(dream, (dream) => {
        dream.sequences = (dream.sequences ?? []).filter((layer) => layer.id !== id);
      });
      if (selected === id) {
        setSelected(undefined);
      }
      if (playing) {
        void engine.removeLayer(id);
      }
    },
    [dream, selected, playing, engine],
  );

  const handleUpdate = useCallback(
    (updated: Sequence.Sequence) => {
      Obj.change(dream, (dream) => {
        dream.sequences = (dream.sequences ?? []).map((layer) => (layer.id === updated.id ? updated : layer));
      });
      if (playing) {
        void engine.updateLayer(updated);
      }
    },
    [engine, dream, playing],
  );

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      Obj.change(dream, (dream) => {
        const next = [...(dream.sequences ?? [])];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        dream.sequences = next;
      });
    },
    [dream],
  );

  const isSequence = useCallback((item: unknown): item is Sequence.Sequence => {
    return typeof item === 'object' && item !== null && 'id' in item && 'source' in item;
  }, []);

  return (
    <Splitter.Root mode={selectedLayer ? 'both' : 'upper'} classNames={classNames}>
      <Splitter.Panel asChild position='upper'>
        <Panel.Root>
          <Panel.Toolbar asChild>
            <Toolbar.Root>
              <Toolbar.IconButton icon='ph--plus--regular' iconOnly label='Add layer' onClick={handleAdd} />
              <Toolbar.Separator />
              {playing && timed && <span className='tabular-nums text-description p-1'>{formattedTime}</span>}
              <Toolbar.IconButton
                icon={playing ? 'ph--stop--regular' : 'ph--play--regular'}
                iconOnly
                label={playing ? 'Stop' : 'Play'}
                onClick={handlePlay}
              />
            </Toolbar.Root>
          </Panel.Toolbar>
          <Panel.Content>
            <List.Root<Sequence.Sequence>
              items={layers}
              getId={(item) => item.id}
              isItem={isSequence}
              onMove={handleMove}
            >
              {({ items }) =>
                items.map((layer) => (
                  <LayerListItem
                    key={layer.id}
                    item={layer}
                    selected={layer.id === selected}
                    onLayerSelect={handleSelect}
                    onLayerUpdate={handleUpdate}
                    onLayerDelete={handleDelete}
                  />
                ))
              }
            </List.Root>
          </Panel.Content>
        </Panel.Root>
      </Splitter.Panel>

      <Splitter.Panel asChild position='lower'>
        {displayedLayer && <Sound sequence={displayedLayer} onUpdate={handleUpdate} />}
      </Splitter.Panel>
    </Splitter.Root>
  );
};

//
// LayerListItem
//

const sourceIcon: Record<string, string> = {
  generator: 'ph--wave-sine--regular',
  sample: 'ph--waveform--regular',
};

type LayerListItemProps = {
  item: Sequence.Sequence;
  selected: boolean;
  onLayerSelect: (id: string) => void;
  onLayerUpdate: (sequence: Sequence.Sequence) => void;
  onLayerDelete: (id: string) => void;
};

/** Single layer row in the mixer list. */
const LayerListItem = ({ item, selected, onLayerSelect, onLayerUpdate, onLayerDelete }: LayerListItemProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <List.Item
      item={item}
      selected={selected}
      classNames='grid grid-cols-[min-content_min-content_1fr_min-content_min-content] gap-1 items-center'
      onClick={() => onLayerSelect(item.id)}
    >
      <List.ItemDragHandle />
      <Icon icon={sourceIcon[item.source.type] ?? 'ph--question--regular'} />
      <List.ItemTitle>{item.name ?? Sequence.getSourceLabel(item.source)}</List.ItemTitle>
      <IconButton
        variant='ghost'
        icon={item.muted ? 'ph--speaker-slash--regular' : 'ph--speaker-high--regular'}
        iconOnly
        label={t(item.muted ? 'unmute button label' : 'mute button label')}
        onClick={(event) => {
          event.stopPropagation();
          onLayerUpdate({ ...item, muted: !item.muted });
        }}
      />
      <List.ItemDeleteButton
        onClick={(event: React.MouseEvent) => {
          event.stopPropagation();
          onLayerDelete(item.id);
        }}
      />
    </List.Item>
  );
};
