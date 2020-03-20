//
// Copyright 2018 DxOS
//

/**
 * Layout utils.
 */
export class GraphLayout {

  // https://github.com/d3/d3-3.x-api-reference/blob/master/Layouts.md

  /**
   * @param nodes
   * @param size
   */
  static circle = (nodes, size) => {
    let rad = Math.min(size.width, size.height) * .45;
    let center = { x: size.width / 2, y: size.height / 2 };

    let theta = 0;
    nodes.forEach(node => {
      node.fx = center.x + Math.cos(theta) * rad;
      node.fy = center.y + Math.sin(theta) * rad;

      theta += (Math.PI * 2) / nodes.length;
    });
  };
}
