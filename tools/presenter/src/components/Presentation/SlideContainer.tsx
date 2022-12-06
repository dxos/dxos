//
// Copyright 2022 DXOS.org
//

import React, { FC, ReactNode, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { usePresentation } from '../../hooks';

// TODO(burdon): Factor out.
export const Pager: FC<{ slide: number; length: number }> = ({ slide, length }) => {
  return (
    <div className='absolute bottom-1 right-1 font-mono text-3xl'>
      {slide + 1}/{length}
    </div>
  );
};

/**
 * Contains deck of slides.
 */
export const SlideContainer: FC<{ slides: ReactNode[] }> = ({ slides }) => {
  const presentation = usePresentation();
  const navigate = useNavigate();
  const { slide } = useParams();
  const slideNum = useMemo(() => {
    const num = slide === undefined ? 0 : parseInt(slide);
    presentation.setSlide(num);
    return num;
  }, [slide]);

  const handleNav = (slide: number) => {
    slide >= 0 && slide < slides.length && navigate(presentation.slidePath(slide));
  };

  useEffect(() => {
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
        case 'ArrowUp': {
          navigate(presentation.indexPath());
          break;
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
