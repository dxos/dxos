//
// Copyright 2026 DXOS.org
//

import React, { ComponentPropsWithoutRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Icon, IconButton, type ThemedClassName, Splitter, Toolbar, Panel } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { mx } from '@dxos/ui-theme';

import { MixerEngine } from '../../generator';
import { Sequence } from '../../types';

import { Sequencer } from '../Sequencer';

//
// Mixer
//

export type MixerProps = ThemedClassName<{
  engine: MixerEngine;
}>;

/** Multi-layer audio mixer with sequencer layers. */
export const Mixer = ({ classNames, engine }: MixerProps) => {
  const [playing, setPlaying] = useState(false);
  const [layers, setLayers] = useState<Sequence.Sequence[]>([Sequence.makeSampleSequence('rain')]);
  const [selected, setSelected] = useState<string | undefined>();

  // Keep last selected layer visible during close animation.
  const selectedLayer = useMemo(() => layers.find((layer) => layer.id === selected), [layers, selected]);
  const lastSelectedLayer = useRef<Sequence.Sequence | undefined>(undefined);
  if (selectedLayer) {
    lastSelectedLayer.current = selectedLayer;
  }
  const displayedLayer = selectedLayer ?? lastSelectedLayer.current;

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      void engine.stop();
    };
  }, [engine]);

  const handlePlay = useCallback(async () => {
    if (playing) {
      await engine.stop();
      setPlaying(false);
    } else {
      await engine.play(layers);
      setPlaying(true);
    }
  }, [playing, layers, engine]);

  const handleStop = useCallback(async () => {
    await engine.stop();
    setPlaying(false);
  }, [engine]);

  const handleAdd = useCallback(() => {
    const sequence = Sequence.makeSequence();
    setLayers((prev) => [...prev, sequence]);
    setSelected(sequence.id);
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelected((prev) => (prev === id ? undefined : id));
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      setLayers((prev) => prev.filter((layer) => layer.id !== id));
      if (selected === id) {
        setSelected(undefined);
      }
      if (playing) {
        void engine.removeLayer(id);
      }
    },
    [selected, playing, engine],
  );

  const handleChange = useCallback(
    (updated: Sequence.Sequence) => {
      setLayers((prev) => prev.map((layer) => (layer.id === updated.id ? updated : layer)));
      if (playing) {
        void engine.updateLayer(updated);
      }
    },
    [playing, engine],
  );

  const handleMove = useCallback((fromIndex: number, toIndex: number) => {
    setLayers((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

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
              <Toolbar.IconButton
                icon={playing ? 'ph--stop--regular' : 'ph--play--regular'}
                iconOnly
                label={playing ? 'Stop' : 'Play'}
                onClick={handlePlay}
              />
            </Toolbar.Root>
          </Panel.Toolbar>
          <Panel.Content asChild>
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
                    onLayerUpdate={handleChange}
                    onLayerDelete={handleDelete}
                  />
                ))
              }
            </List.Root>
          </Panel.Content>
        </Panel.Root>
      </Splitter.Panel>

      <Splitter.Panel asChild position='lower'>
        {displayedLayer && <Sequencer sequence={displayedLayer} onUpdate={handleChange} />}
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
  return (
    <List.Item
      item={item}
      selected={selected}
      classNames='grid grid-cols-[min-content_min-content_1fr_min-content_min-content] items-center'
      onClick={() => onLayerSelect(item.id)}
    >
      <List.ItemDragHandle />
      <Icon classNames='mr-2' size={4} icon={sourceIcon[item.source.type] ?? 'ph--question--regular'} />
      <List.ItemTitle>{item.name ?? Sequence.getSourceLabel(item.source)}</List.ItemTitle>
      <IconButton
        icon={item.muted ? 'ph--speaker-slash--regular' : 'ph--speaker-high--regular'}
        iconOnly
        label={item.muted ? 'Unmute' : 'Mute'}
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
