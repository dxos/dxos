//
// Copyright 2026 DXOS.org
//

import React, { type CSSProperties, useLayoutEffect, useRef, useState } from 'react';

import { type OverlayAnchor, type OverlayItem, type OverlayMessage } from '@dxos/animation';
import { mx } from '@dxos/ui-theme';

import { type AnimatorCapabilities } from '#types';

export type OverlayLayerProps = {
  frames: readonly AnimatorCapabilities.EffectFrame[];
  /** Where the stage drew its targets; items anchored to a target it has not reported are not drawn. */
  projection?: AnimatorCapabilities.StageProjection;
};

type Size = { width: number; height: number };

type Point = { x: number; y: number };

/** An anchor in pixels from the layer's top left; undefined when its target is not on screen. */
const resolve = (
  anchor: OverlayAnchor,
  size: Size,
  projection: AnimatorCapabilities.StageProjection | undefined,
): Point | undefined => {
  if ('frame' in anchor) {
    return { x: anchor.frame.x * size.width, y: anchor.frame.y * size.height };
  }
  const target = projection?.anchors[anchor.target];
  if (!target) {
    return undefined;
  }
  const angle = anchor.angle ?? 0;
  const reach = target.radius + (anchor.gap ?? 0);
  return { x: target.x + Math.cos(angle) * reach, y: target.y + Math.sin(angle) * reach };
};

/**
 * Draws the `overlay` effect frames above the stage (DESIGN.md §6): threads, cards, lines and text, each placed through
 * the stage's projection of the target it names, or at a point of the frame. Every opacity comes from the frame, so
 * the layer has no transitions of its own.
 */
export const OverlayLayer = ({ frames, projection }: OverlayLayerProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const items = frames.flatMap((frame) =>
    frame.renderer === 'overlay' ? frame.items.map((item) => ({ key: `${frame.instance}/${item.id}`, item })) : [],
  );
  const lines = items.flatMap(({ key, item }) => {
    if (item.kind !== 'line') {
      return [];
    }
    const from = resolve(item.from, size, projection);
    const to = resolve(item.to, size, projection);
    return from && to ? [{ key, item, from, to }] : [];
  });

  return (
    <div ref={ref} className='dx-cover pointer-events-none overflow-hidden' data-testid='animator.overlay'>
      {lines.length > 0 && (
        <svg className='dx-cover text-fg-muted' width='100%' height='100%'>
          {lines.map(({ key, item, from, to }) => (
            <line
              key={key}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={item.color ?? 'currentColor'}
              strokeOpacity={item.opacity}
              strokeWidth={1}
            />
          ))}
        </svg>
      )}
      {items.map(({ key, item }) => {
        if (item.kind === 'line') {
          return null;
        }
        const point = resolve(item.anchor, size, projection);
        return point ? <Item key={key} item={item} point={point} framed={'frame' in item.anchor} /> : null;
      })}
    </div>
  );
};

type ItemProps = { item: Exclude<OverlayItem, { kind: 'line' }>; point: Point; framed: boolean };

/** One positioned item: a target's anchor centres it vertically; a frame anchor holds its top. */
const Item = ({ item, point, framed }: ItemProps) => {
  const align = item.kind === 'text' ? undefined : (item.align ?? 'end');
  const x = align === 'start' ? '-100%' : align === 'end' ? '0' : '-50%';
  const y = framed && item.kind !== 'text' ? '0' : '-50%';
  const style: CSSProperties = {
    left: point.x,
    top: point.y,
    opacity: item.opacity,
    transform: `translate(${x}, ${y})`,
  };
  switch (item.kind) {
    case 'thread':
      return (
        <div
          className={mx('absolute flex flex-col gap-0.5', align === 'start' ? 'items-end' : 'items-start')}
          style={style}
          data-testid='animator.overlay.thread'
        >
          <Messages messages={item.messages} reverse={align === 'start'} />
        </div>
      );
    case 'card':
      return (
        <div
          className='absolute flex flex-col gap-1 w-56 p-2 rounded-md border border-separator bg-modal-surface text-sm'
          style={style}
          data-testid='animator.overlay.card'
        >
          {item.label && <div className='text-xs uppercase text-fg-muted'>{item.label}</div>}
          <div className='font-medium text-fg'>{item.title}</div>
          {item.rows && item.rows.length > 0 && (
            <dl className='grid grid-cols-[auto_1fr] gap-x-2 text-xs'>
              {item.rows.map(([term, value], index) => (
                <Row key={index} term={term} value={value} />
              ))}
            </dl>
          )}
          {item.messages && item.messages.length > 0 && <Messages messages={item.messages} />}
        </div>
      );
    case 'text':
      return (
        <div
          className='absolute whitespace-pre text-fg'
          style={{ ...style, color: item.color, fontSize: item.size }}
          data-testid='animator.overlay.text'
        >
          {item.text}
        </div>
      );
  }
};

const Row = ({ term, value }: { term: string; value: string }) => (
  <>
    <dt className='text-fg-muted'>{term}</dt>
    <dd className='text-fg'>{value}</dd>
  </>
);

const Messages = ({ messages, reverse }: { messages: readonly OverlayMessage[]; reverse?: boolean }) => (
  <>
    {messages.map((message, index) => (
      <div
        key={index}
        className={mx(
          'flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-modal-surface text-xs text-fg whitespace-nowrap',
          reverse && 'flex-row-reverse',
        )}
        style={{ opacity: message.opacity }}
      >
        {message.color && <span className='shrink-0 w-2 h-2 rounded-full' style={{ background: message.color }} />}
        <span>{message.who ? `${message.who}: ${message.text}` : message.text}</span>
      </div>
    ))}
  </>
);
