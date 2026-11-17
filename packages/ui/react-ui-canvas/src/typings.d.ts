//
// Copyright 2026 DXOS.org
//

declare module '*.wasm?url' {
  const url: string;
  export default url;
}

// The package ships no types: these are the parts of Clipper the canvas calls, as the library's own documentation
// gives them.
declare module 'js-clipper' {
  namespace ClipperLib {
    type IntPoint = { X: number; Y: number };
    type Path = IntPoint[];
    class Clipper {
      AddPaths(paths: Path[], polyType: number, closed: boolean): boolean;
      Execute(clipType: number, solution: Path[], subjectFillType: number, clipFillType: number): boolean;
    }
    const ClipType: { ctIntersection: number; ctUnion: number; ctDifference: number; ctXor: number };
    const PolyType: { ptSubject: number; ptClip: number };
    const PolyFillType: { pftEvenOdd: number; pftNonZero: number; pftPositive: number; pftNegative: number };
  }
  export default ClipperLib;
}
