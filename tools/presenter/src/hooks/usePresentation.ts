//
// Copyright 2022 DXOS.org
//

import { createContext, useContext } from 'react';

class Presentation {
  // TODO(burdon): Generalize meta.
  private _title?: string;
  private _currentSlide = 0;

  get title() {
    return this._title;
  }

  set title(title: string | undefined) {
    this._title = title;
  }

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
