//
// Copyright 2019 DxOS.org
//

// TODO(burdon): Data-driven modules.

const test = () => {

  // TODO(burdon): Constrain network inside radius.
  const graph = new Graph().init({ /* Graph data. */ });

  const cloud = Image.from(/* Spline data. */).append();

  // TODO(burdon): Intercept

  // Render network at center of cloud.
  cloud.data([1])
    .append(graph)
    .attr('x', () => 0)
    .attr('y', () => 0);

  const diagram = new Diagram();

  diagram.data([1])
    .append(cloud)
    .attr('x', () => 0)
    .attr('y', () => 0);
};
