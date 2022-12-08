//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { usePresentation } from '../../hooks';
import { PresentationProps } from './types';

/**
 * Contains deck of slides.
 */
export const SlideContainer: FC<PresentationProps> = ({ title, slides }) => {
  const presentation = usePresentation();
  const navigate = useNavigate();
  const { slide } = useParams();
  const slideNum = useMemo(() => {
    const num = slide === undefined ? 0 : parseInt(slide);
    presentation.setSlide(num);
    return num;
  }, [slide]);

  useEffect(() => {
    presentation.title = title;
  }, [title]);

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

  // Frontmatter attr set by layout plugin.
  const meta = JSON.parse((slides[slideNum] as any)?.type().props['data-frontmatter'] ?? '{}');
  const { layout } = meta ?? {};

  // TODO(burdon): Set visibility:hidden (not display:none) to preserve render state.
  return (
    <>
      {slides.map((_, num) => (
        <div key={num} style={{ ...style, display: slideNum === num ? 'flex' : 'none' }}>
          <Slide num={num} />
        </div>
      ))}

      {/* Show/hide based on front-matter. */}
      {layout !== 'full' && (
        <>
          <div className='absolute bottom-1 left-1 text-3xl'>{title}</div>
          <div className='absolute bottom-1 right-1 font-mono text-3xl'>
            {slideNum + 1}/{slides.length}
          </div>
        </>
      )}
    </>
  );
};
