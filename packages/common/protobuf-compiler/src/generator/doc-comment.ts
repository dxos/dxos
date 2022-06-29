//
// Copyright 2021 DXOS.org
//

import ts from 'typescript';

export const attachDocComment = <T extends ts.Node>(node: T, comment: string): T => ts.addSyntheticLeadingComment(
  node,
  ts.SyntaxKind.MultiLineCommentTrivia,
    `*\n${comment.split('\n').map(line => ` * ${line}`).join('\n')}\n `,
    true
);
