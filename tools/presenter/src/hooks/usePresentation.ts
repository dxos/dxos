//
// Copyright 2022 DXOS.org
//

import { createContext, useContext } from 'react';

class Presentation {
  private _currentSlide = 0;

  indexPath() {
    return '/index';
  }

  slidePath(num = this._currentSlide) {
    return `/slide/${num}`;
  }

  setSlide(slide: number) {
    this._currentSlide = slide;
  }
}

const PresentationContext = createContext<Presentation>(new Presentation());

export const usePresentation = () => {
  return useContext(PresentationContext);
};
