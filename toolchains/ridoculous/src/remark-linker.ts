//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { visit } from 'unist-util-visit';

// TODO(burdon): Link line number in Github?
// https://github.com/dxos/protocols/blob/main/packages/common/protocols/src/proto/dxos/client.proto#L28

/**
 * Validate links.
 */
export function remarkLinker () {
  const { config } = this.data();
  assert(config);

  return (tree: any) => {
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
}
