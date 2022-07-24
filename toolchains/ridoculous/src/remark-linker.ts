//
// Copyright 2022 DXOS.org
//

import { visit } from 'unist-util-visit';

interface Options {
  baseDir: string
}

// TODO(burdon): Fine line number in Github?
// https://github.com/dxos/protocols/blob/main/packages/common/protocols/src/proto/dxos/client.proto#L28

/**
 * Validate links.
 */
// TODO(burdon): Create test.
export const remarkLinker = ({ baseDir }: Options) => (tree: any) => {
  visit(tree, 'link', (node) => {
    // const { url } = node;
    visit(node, 'text', ({ value }) => {
      // TODO(burdon): Validate link
      // console.log(value, url);
    });
    visit(node, 'inlineCode', ({ value }) => {
      // TODO(burdon): Validate name (proto, class).
      // console.log(value, url);
    });
  });
};
