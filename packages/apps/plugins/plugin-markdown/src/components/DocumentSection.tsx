//
// Copyright 2024 DXOS.org
//

// import React, { type FC } from 'react';

// import { type DocumentType } from '@braneframe/types';
// import { type Extension, Toolbar, type EditorViewMode } from '@dxos/react-ui-editor';
// import { sectionToolbarLayout } from '@dxos/react-ui-stack';
// import { focusRing, mx } from '@dxos/react-ui-theme';

// const DocumentSection: FC<{
//   document: DocumentType;
//   extensions: Extension[];
//   viewMode?: EditorViewMode;
//   toolbar?: boolean;
//   onCommentSelect?: (id: string) => void;
//   onViewModeChange?: (mode: EditorViewMode) => void;
// }> = ({ document, extensions, viewMode = 'preview', onCommentSelect, onViewModeChange }) => {
//   return (
//     <div role='none' className='flex flex-col'>
//       <div
//         {...focusAttributes}
//         ref={parentRef}
//         className={mx('flex flex-col flex-1 px-2 min-bs-[12rem] order-last', focusRing)}
//         data-testid='composer.markdownRoot'
//       />
//       {toolbar && (
//         <Toolbar.Root
//           state={formattingState && { ...formattingState, ...commentState }}
//           onAction={handleAction}
//           classNames={['z-[1] invisible group-focus-within/section:visible', sectionToolbarLayout]}
//         >
//           <Toolbar.View mode={viewMode} />
//           <Toolbar.Markdown />
//           <Toolbar.Separator />
//           <Toolbar.Actions />
//         </Toolbar.Root>
//       )}
//     </div>
//   );
// };

// export default DocumentSection;

// export type DocumentSection = typeof DocumentSection;
