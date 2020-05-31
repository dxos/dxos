//
// Copyright 2020 DxOS
//

// https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
export const createPath = (points) => 'M ' + points.map(({ x, y }) => `${x} ${y}`).join(' L ');
