//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Factor out to @dxos/ui

export type Rect = {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
};

export const flattenRect = (rect: Rect, left: boolean): Rect => {
  const x = left ? rect.left : rect.right;
  return { left: x, right: x, top: rect.top, bottom: rect.bottom };
};

let scratchRange: Range | null;

export const textRange = (node: Text, from: number, to = from): Range => {
  const range = scratchRange || (scratchRange = document.createRange());
  range.setEnd(node, to);
  range.setStart(node, from);
  return range;
};

export const clientRectsFor = (dom: Node): DOMRectList => {
  if (dom.nodeType === 3) {
    return textRange(dom as Text, 0, dom.nodeValue!.length).getClientRects();
  } else if (dom.nodeType === 1) {
    return (dom as HTMLElement).getClientRects();
  } else {
    return [] as any as DOMRectList;
  }
};
