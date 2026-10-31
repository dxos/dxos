//
// Copyright 2026 DXOS.org
//

//
// Callout (F-8.4), ported from echo3d's side panels: an object's card in the left or right margin, joined to the object
// by a line, with an optional thread of messages arriving under it one by one.
//

export const CALLOUT_SOURCE = `
import { defineEffect, ramp } from '@dxos/plugin-animator/effect';

const FADE = 0.4;

export default defineEffect({
  sample: (ctx) => {
    const params = ctx.params;
    const object = (ctx.bound.object ?? [])[0];
    if (!object) {
      return [];
    }
    const at = params.at ?? 0;
    const opacity = Math.min(ramp(ctx.t - at, FADE), ramp(ctx.duration - ctx.t, FADE)) * object.opacity;
    if (opacity <= 0) {
      return [];
    }
    const left = params.side === 'left';
    const y = params.y ?? 0.15;
    // The card's inner edge, which the line leaves from: a left card ends there, a right card starts there.
    const edge = left ? 0.3 : 0.7;
    const gap = params.gap ?? 1.1;
    const messages = (params.messages ?? []).map((message, index) => {
      const entry = typeof message === 'string' ? { text: message } : message;
      return { ...entry, opacity: ramp(ctx.t - at - FADE - index * gap, 0.3) };
    });
    return [
      {
        kind: 'line',
        id: 'line',
        from: { frame: { x: edge, y: y + 0.03 } },
        to: { target: object.id, angle: left ? Math.PI : 0, gap: 2 },
        opacity: opacity * 0.8,
      },
      {
        kind: 'card',
        id: 'card',
        anchor: { frame: { x: edge, y } },
        align: left ? 'start' : 'end',
        title: params.title ?? object.id,
        ...(params.label ? { label: params.label } : {}),
        ...(params.rows ? { rows: params.rows } : {}),
        messages,
        opacity,
      },
    ];
  },
});
`;

export const CALLOUT_PARAMS = {
  type: 'object',
  properties: {
    object: { 'type': 'string', 'x-binding': 'object', 'description': 'The object the card describes.' },
    side: { type: 'string', enum: ['left', 'right'], default: 'right' },
    title: { type: 'string' },
    label: { type: 'string', description: "A small heading above the title (the object's type)." },
    rows: { type: 'array', description: '[term, value] pairs.' },
    messages: { type: 'array', description: 'Messages under the card: strings or { who, color, text }.' },
    at: { type: 'number', default: 0, description: 'Seconds into the effect the card appears.' },
    gap: { type: 'number', default: 1.1, description: 'Seconds between messages.' },
    y: { type: 'number', default: 0.15, description: "The card's top, as a fraction of the frame's height." },
  },
};
