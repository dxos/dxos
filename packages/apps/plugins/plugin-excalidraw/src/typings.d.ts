//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Check/fix excalidraw exports.
declare module '@excalidraw/excalidraw/types' {
  type ExcalidrawElement = {
    id: string;
    version: number;
    type: string;
  };

  type ExcalidrawProps = {
    // https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/initialdata
    initialData?: {
      readonly elements: ExcalidrawElement[];
    };

    // https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/#onchange
    onChange: (excalidrawElements: readonly any[], appState: any, files: any) => void;

    // https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/#onpointerupdate
    onPointerUpdate: (payload: {
      pointer: { x: number; y: number; tool: any };
      button: 'up' | 'down';
      pointersMap: any;
    }) => void;
  };
}
