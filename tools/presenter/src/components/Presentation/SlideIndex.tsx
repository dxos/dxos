//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { usePresentation } from '../../hooks';
import { PresentationProps } from './types';

/**
 * Index page.
 */
export const SlideIndex: FC<PresentationProps> = ({ title, slides }) => {
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
        case 'ArrowDown': {
          navigate(presentation.slidePath());
          break;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // TODO(burdon): Factor out.
  const getTitle = (i: number) => {
    const { title } = JSON.parse((slides[i] as any)?.type().props['data-frontmatter'] ?? '{}');
    return title;
  };

  return (
    <div className='p-3'>
      {title && <h1>{title}</h1>}
      <ol className='p-1'>
        {slides.map((slide, i) => (
          <li key={i}>
            <Link to={`/slide/${i}`}>{getTitle(i) ?? '_'}</Link>
          </li>
        ))}
      </ol>
    </div>
  );
};
