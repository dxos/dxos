//
// Copyright 2023 DXOS.org
//

import { Flame, Crown, ShieldStar, Plus, Asterisk, User } from 'phosphor-react';
import React, { ReactNode } from 'react';

const style = {
  white: { width: undefined, height: undefined, color: 'darkred' },
  black: { width: undefined, height: undefined, color: 'black' }
};

const Wrapper = ({ children }: { children: ReactNode }) => (
  <svg viewBox='-1, -1, 42, 42' className='logo'>
    <g transform='translate(5 5) scale(0.75 0.75)'>{children}</g>
  </svg>
);

/**
 * From lichess.
 * Select pieces from settings.
 * Inspect pieces; hover over background-image CSS (data URL); open image in new tab; inspect image and copy SVG HTML.
 */
const pieces: Record<string, (style: any) => ReactNode> = {
  p: (style) => (
    <Wrapper>
      <User {...style} />
    </Wrapper>
  ),
  r: (style) => (
    <Wrapper>
      <Plus {...style} />
    </Wrapper>
  ),
  n: (style) => (
    <Wrapper>
      <ShieldStar {...style} />
    </Wrapper>
  ),
  b: (style) => (
    <Wrapper>
      <Flame {...style} />
    </Wrapper>
  ),
  q: (style) => (
    <Wrapper>
      <Asterisk {...style} />
    </Wrapper>
  ),
  k: (style) => (
    <Wrapper>
      <Crown {...style} />
    </Wrapper>
  )
};

export const phosphorPieces: Record<string, ReactNode> = {
  wP: pieces.p(style.white),
  wR: pieces.r(style.white),
  wN: pieces.n(style.white),
  wB: pieces.b(style.white),
  wQ: pieces.q(style.white),
  wK: pieces.k(style.white),

  bP: pieces.p(style.black),
  bR: pieces.r(style.black),
  bN: pieces.n(style.black),
  bB: pieces.b(style.black),
  bQ: pieces.q(style.black),
  bK: pieces.k(style.black)
};
