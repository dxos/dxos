//
// Copyright 2026 DXOS.org
//

import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type ComposableProps, Icon, IconButton, type ThemedClassName, Splitter, Toolbar, Panel } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { composableProps, mx } from '@dxos/ui-theme';

import { MixerEngine } from '../../generator';
import { Sequence } from '../../types';

import { SequencePanel } from '../SequencePanel';

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
                  <List.Item key={layer.id} asChild item={layer} selected={layer.id === selected}>
                    <LayerListItem
                      sequence={layer}
                      onLayerSelect={handleSelect}
                      onLayerUpdate={handleChange}
                      onLayerDelete={handleDelete}
                    />
                  </List.Item>
                ))
              }
            </List.Root>
          </Panel.Content>
        </Panel.Root>
      </Splitter.Panel>

      <Splitter.Panel asChild position='lower'>
        {displayedLayer && <SequencePanel sequence={displayedLayer} onUpdate={handleChange} />}
      </Splitter.Panel>
    </Splitter.Root>
  );
};

//
// LayerListItem
//

type LayerListItemProps = ComposableProps<HTMLDivElement> & {
  sequence: Sequence.Sequence;
  onLayerSelect: (id: string) => void;
  onLayerUpdate: (sequence: Sequence.Sequence) => void;
  onLayerDelete: (id: string) => void;
};

const sourceIcon: Record<string, string> = {
  sample: 'ph--music-note--regular',
  generator: 'ph--wave-sine--regular',
};

/** Single layer row in the mixer list. */
const LayerListItem = forwardRef<HTMLDivElement, LayerListItemProps>(
  ({ sequence, onLayerSelect, onLayerUpdate, onLayerDelete, ...props }, ref) => {
    return (
      <div
        {...composableProps<HTMLDivElement>(props, {
          className: 'grid grid-cols-[min-content_min-content_1fr_min-content_min-content] items-center min-h-10',
          role: 'none',
        })}
        onClick={() => onLayerSelect(sequence.id)}
        ref={ref}
      >
        <List.ItemDragHandle />
        <Icon icon={sourceIcon[sequence.source.type] ?? 'ph--question--regular'} size={4} classNames='mx-1' />
        <List.ItemTitle>{sequence.name ?? Sequence.getSourceLabel(sequence.source)}</List.ItemTitle>
        <List.ItemIconButton
          icon={sequence.muted ? 'ph--speaker-slash--regular' : 'ph--speaker-high--regular'}
          iconOnly
          label={sequence.muted ? 'Unmute' : 'Mute'}
          onClick={(event) => {
            event.stopPropagation();
            onLayerUpdate({ ...sequence, muted: !sequence.muted });
          }}
        />
        <List.ItemDeleteButton
          onClick={(event: React.MouseEvent) => {
            event.stopPropagation();
            onLayerDelete(sequence.id);
          }}
        />
      </div>
    );
  },
);
