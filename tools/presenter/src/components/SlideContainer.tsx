//
// Copyright 2022 DXOS.org
//

import React, { FC, ReactNode, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { DeckProps } from './Deck';

export const Pager: FC<{ slide: number; length: number }> = ({ slide, length }) => {
  return (
    <div className='absolute bottom-1 right-1 font-mono text-3xl'>
      {slide + 1}/{length}
    </div>
  );
};

// TODO(burdon): Key handler to enter/exit presentation; up/down to access index.
// TODO(burdon): Scrolling.
// TODO(burdon): Get frontmatter from each slide via plugin?
export const Index: FC<DeckProps> = ({ title, slides }) => {
  // const s = Symbol.for('react.module.reference');
  // const t = slides[1] as any;
  // console.log(t);

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

/**
 * Contains slide.
 */
export const SlideContainer: FC<{ slides: ReactNode[] }> = ({ slides }) => {
  const navigate = useNavigate();
  const { slide } = useParams();
  const slideNum = useMemo(() => (slide === undefined ? 0 : parseInt(slide)), [slide]);

  const handleNav = (slide: number) => {
    slide >= 0 && slide < slides.length && navigate(`/slide/${slide}`);
  };

  useEffect(() => {
    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
    const handler = (ev: KeyboardEvent) => {
      switch (ev.key) {
        case 'ArrowLeft': {
          handleNav(slideNum - 1);
          break;
        }
        case 'ArrowRight': {
          handleNav(slideNum + 1);
          break;
        }
        case 'Escape': {
          navigate('/index');
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

  /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
  /* @ts-ignore */
  const Slide: FC<{ num: number }> = ({ num }) => slides[num]!;

  // TODO(burdon): Could be better?
  const style: any = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    display: 'flex',
    flex: 1
  };

  // NOTE: Render everything up-front to keep state.
  return (
    <>
      {slides.map((_, num) => (
        <div key={num} style={{ ...style, display: slideNum === num ? 'flex' : 'none' }}>
          <Slide num={num} />
        </div>
      ))}

      {/* TODO(burdon): Show/hide based on front-matter. */}
      <Pager slide={slideNum} length={slides.length} />
    </>
  );
};
