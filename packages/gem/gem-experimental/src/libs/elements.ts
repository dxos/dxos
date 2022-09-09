//
// Copyright 2019 DXOS.org
//

export const drawSquare = (iso, angle, x, y, z) => {
  if ((angle %= Math.PI / 2) < 0) {
    angle += Math.PI / 2;
  }

  iso.save();
  iso.translate3d(x, y, z);
  iso.rotateZ(angle - Math.PI / 4);

  iso.context.beginPath();
  iso.lineTo(-0.5, -0.5, +0.5);
  iso.lineTo(-0.5, +0.5, -0.5);
  iso.lineTo(-0.5, -0.5, -0.5);
  iso.lineTo(+0.5, -0.5, -0.5);
  iso.closePath();
  iso.context.fill();
  iso.context.lineWidth = 0.5;
  iso.context.stroke();

  iso.restore();
};

export const drawCube = (iso, angle, x, y, z, h = 1) => {
  if ((angle %= Math.PI / 2) < 0) {
    angle += Math.PI / 2;
  }

  iso.save();
  iso.translate3d(x, y, z);
  iso.rotateZ(angle - Math.PI / 4);

  // Outside
  iso.context.beginPath();
  iso.moveTo(+0.5, -0.5, +0.5 + h - 1);
  iso.lineTo(+0.5, +0.5, +0.5 + h - 1);
  iso.lineTo(-0.5, +0.5, +0.5 + h - 1);
  iso.lineTo(-0.5, +0.5, -0.5);
  iso.lineTo(-0.5, -0.5, -0.5);
  iso.lineTo(+0.5, -0.5, -0.5);
  iso.closePath();
  iso.context.fill();
  iso.context.lineWidth = 1.5;
  iso.context.stroke();

  // Inside
  iso.context.beginPath();
  iso.moveTo(-0.5, -0.5, +0.5 + h - 1);
  iso.lineTo(+0.5, -0.5, +0.5 + h - 1);
  iso.moveTo(-0.5, -0.5, +0.5 + h - 1);
  iso.lineTo(-0.5, +0.5, +0.5 + h - 1);
  iso.moveTo(-0.5, -0.5, +0.5 + h - 1);
  iso.lineTo(-0.5, -0.5, -0.5);
  iso.context.lineWidth = 0.75;
  iso.context.stroke();

  iso.restore();
};
