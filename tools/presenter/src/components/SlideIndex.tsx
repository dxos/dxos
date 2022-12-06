//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { usePresentation } from '../hooks';
import { DeckProps } from './Deck';

/**
 * Index page.
 */
export const SlideIndex: FC<DeckProps> = ({ title, slides }) => {
  const navigate = useNavigate();
  const presentation = usePresentation();

  // TODO(burdon): Key handler to enter/exit presentation; up/down to access index.
  // TODO(burdon): Scrolling.
  // TODO(burdon): Get frontmatter from each slide via plugin?
  // const s = Symbol.for('react.module.reference');
  // const t = slides[1] as any;
  // console.log(t);

  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      switch (ev.key) {
        // TODO(burdon): Get last slide from context.
        case 'ArrowDown': {
          navigate(presentation.path());
          break;
        }
        default: {
          // console.log(ev.key);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  return (
    <div className='p-3'>
      {title && <h1>{title}</h1>}
      <ul className='p-1'>
        {slides.map((slide, i) => (
          <li key={i}>
            <Link to={`/slide/${i}`}>Slide {i}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
