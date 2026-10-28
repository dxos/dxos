//
// Copyright 2026 DXOS.org
//

import React, { type CSSProperties, useMemo } from 'react';

import type * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';

import {
  LABEL_SIZES,
  type ObjectState,
  type VisibleLabelStyle,
  labelFont,
  labelLayout,
  labelOpacity,
  labelPosition,
} from '../../animator/index.ts';

/** The look of each label style beyond its font (echo3d's label classes). */
const STYLE_CSS: Readonly<Record<VisibleLabelStyle, CSSProperties>> = {
  plain: { padding: '2px 8px', borderRadius: 10, background: 'rgba(10, 16, 36, 0.6)' },
  hero: { letterSpacing: '0.5px' },
  title: { letterSpacing: '1px', textShadow: '0 0 18px rgba(190, 160, 255, 0.9), 0 0 42px rgba(160, 124, 240, 0.6)' },
  inside: { textShadow: '0 2px 12px rgba(10, 16, 36, 0.8)' },
};

/** Measures text in a font with a 2D canvas, so a label's words are laid out where the browser draws them. */
const useMeasure = () =>
  useMemo(() => {
    const context = document.createElement('canvas').getContext('2d');
    return (font: string) =>
      (text: string): number => {
        if (!context) {
          return text.length * 0.6 * Number.parseFloat(font.split(' ')[1]);
        }
        context.font = font;
        return context.measureText(text).width;
      };
  }, []);

export type StageLabelsProps = {
  states: readonly ObjectState[];
  anchors: Readonly<Record<string, AnimatorCapabilities.ProjectedAnchor>>;
  /** Each object's radius at rest, which its label fades in against while it grows. */
  rests: ReadonlyMap<string, number>;
};

/** Labels beside the projected objects in each one's style, fading with it and morphing between texts (F-8.1, F-8.2). */
export const StageLabels = ({ states, anchors, rests }: StageLabelsProps) => {
  const measure = useMeasure();
  return (
    <div className='dx-cover pointer-events-none overflow-hidden' data-testid='spacetime.stage.labels'>
      {states.map((state) => {
        const anchor = anchors[state.id];
        const style = state.labelStyle;
        if (!anchor || style === 'hidden' || (state.label.length === 0 && state.labelFrom.length === 0)) {
          return null;
        }
        const opacity = labelOpacity(state, rests.get(state.id) ?? state.radius);
        if (opacity < 0.01) {
          return null;
        }
        const font = labelFont(style);
        const layout = labelLayout(state, measure(font));
        const position = labelPosition(style, anchor);
        return (
          <div
            key={state.id}
            data-testid={`spacetime.stage.label.${state.id}`}
            style={{
              position: 'absolute',
              left: position.x,
              top: position.y,
              transform: position.align === 'bottom' ? 'translate(-50%, -100%)' : 'translate(-50%, -50%)',
              opacity,
              font,
              color: '#e8ecff',
              whiteSpace: 'pre',
              ...STYLE_CSS[style],
            }}
          >
            <div style={{ position: 'relative', width: layout.width, height: LABEL_SIZES[style] * 1.25 }}>
              {layout.words.map((word, index) => (
                <span
                  key={index}
                  style={{
                    position: 'absolute',
                    left: layout.width / 2 + word.x,
                    opacity: word.opacity,
                    filter: word.opacity < 1 ? `blur(${(1 - word.opacity) * 6}px)` : undefined,
                  }}
                >
                  {word.text}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
