//
// Copyright 2020 DXOS.org
// https://jeromeetienne.github.io/threex.terrain/threex.terrain.js
//

import * as THREE from 'three';
import { SimplexNoise } from './SimplexNoise';

export const THREEx = {};

THREEx.Terrain = {};

/**
 * allocate the heightmap
 *
 * @param  {Number} width the width of the heightmap
 * @param  {Number} depth the depth of the heightmap
 * @return {Array} the allocated heightmap
 */
THREEx.Terrain.allocateHeightMap = function (width, depth) {
  let ArrayClass = THREEx.Terrain.allocateHeightMap.ArrayClass;
  let heightMap = new Array(width);
  for (let x = 0; x < width; x++) {
    heightMap[x] = new ArrayClass(depth);
  }
  return heightMap;
};
THREEx.Terrain.allocateHeightMap.ArrayClass = window.Float64Array || window.Array;

/**
 * generate a heightmap using a simplex noise
 * @todo make it it tunable... how ?
 *
 * @param  {Array} heightMap the heightmap to store the data
 */
THREEx.Terrain.simplexHeightMap = function (heightMap) {
  // get heightMap dimensions
  let width = heightMap.length;
  let depth = heightMap[0].length;

  let simplex = new SimplexNoise();
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      // compute the height
      let height = 0;
      let level = 8;
      height += (simplex.noise(x / level, z / level) / 2 + 0.5) * 0.125;
      level *= 3;
      height += (simplex.noise(x / level, z / level) / 2 + 0.5) * 0.25;
      level *= 2;
      height += (simplex.noise(x / level, z / level) / 2 + 0.5) * 0.5;
      level *= 2;
      // height += (simplex.noise(x / level, z / level) / 2 + 0.5) * 1;
      height /= 1 + 0.5 + 0.25 + 0.125;
      // put the height in the heightMap
      heightMap[x][z] = height;
    }
  }
};

/**
 * build a canvas 2d from a heightmap
 * @param  {Array} heightMap heightmap
 * @param  {HTMLCanvasElement|undefined} canvas  the destination canvas.
 * @return {HTMLCanvasElement}           the canvas
 */
THREEx.Terrain.heightMapToCanvas = function (heightMap, canvas) {
  // get heightMap dimensions
  let width = heightMap.length;
  let depth = heightMap[0].length;
  // create canvas
  canvas = canvas || document.createElement('canvas');
  canvas.width = width;
  canvas.height = depth;
  let context = canvas.getContext('2d');
  // loop on each pixel of the canvas
  for (let x = 0; x < canvas.width; x++) {
    for (let y = 0; y < canvas.height; y++) {
      let height = heightMap[x][y];
      let color = THREEx.Terrain.heightToColor(height);
      context.fillStyle = color.getStyle();
      context.fillRect(x, y, 1, 1);
    }
  }
  // return the just built canvas
  return canvas;
};

/**
 * Build a THREE.PlaneGeometry based on a heightMap
 *
 * @param  {Array} heightMap the heightmap
 * @return {THREE.Geometry}  the just built geometry
 */
THREEx.Terrain.heightMapToPlaneGeometry = function (heightMap) {
  // get heightMap dimensions
  let width = heightMap.length;
  let depth = heightMap[0].length;
  // build geometry
  let geometry = new THREEx.Terrain.PlaneGeometry(1, 1, width - 1, depth - 1);
  // loop on each vertex of the geometry
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      // get the height from heightMap
      let height = heightMap[x][z];
      // set the vertex.z to a normalized height
      let vertex = geometry.vertices[x + z * width];
      vertex.z = (height - 0.5) * 2;
    }
  }
  // notify the geometry need to update vertices
  geometry.verticesNeedUpdate = true;
  // notify the geometry need to update normals
  geometry.computeFaceNormals();
  geometry.computeVertexNormals();
  geometry.normalsNeedUpdate = true;
  // return the just built geometry
  return geometry;
};

THREEx.Terrain.heightMapToHeight = function (heightMap, x, z) {
  // get heightMap dimensions
  let width = heightMap.length;
  let depth = heightMap[0].length;
  // sanity check - boundaries
  console.assert(x >= 0 && x < width);
  console.assert(z >= 0 && z < depth);

  // get the delta within a single segment
  let deltaX = x - Math.floor(x);
  let deltaZ = z - Math.floor(z);

  // get the height of each corner of the segment
  let heightNW = heightMap[Math.floor(x)][Math.floor(z)];
  let heightNE = heightMap[Math.ceil(x)][Math.floor(z)];
  let heightSW = heightMap[Math.floor(x)][Math.ceil(z)];
  let heightSE = heightMap[Math.ceil(x)][Math.ceil(z)];

  // test in which triangle the point is. north-east or south-west
  let inTriangleNE = deltaX > deltaZ ? true : false;
  if (inTriangleNE) {
    let height = heightNE
      + (heightNW - heightNE) * (1 - deltaX)
      + (heightSE - heightNE) * deltaZ;
  } else {
    let height = heightSW
      + (heightSE - heightSW) * deltaX
      + (heightNW - heightSW) * (1 - deltaZ);
  }
  // return the height
  return height;
};

THREEx.Terrain.planeToHeightMapCoords = function (heightMap, planeMesh, x, z) {

  // TODO assert no rotation in planeMesh
  // - how can i check that ? with euler ?

  let position = new THREE.Vector3(x, 0, z);

  // set position relative to planeMesh position
  position.sub(planeMesh.position);

  // heightMap origin is at its top-left, while planeMesh origin is at its center
  position.x += planeMesh.geometry.width / 2 * planeMesh.scale.x;
  position.z += planeMesh.geometry.height / 2 * planeMesh.scale.y;

  // normalize it from [0,1] for the heightmap
  position.x /= planeMesh.geometry.width * planeMesh.scale.x;
  position.z /= planeMesh.geometry.height * planeMesh.scale.y;

  // get heightMap dimensions
  let width = heightMap.length;
  let depth = heightMap[0].length;

  // convert it in heightMap coordinate
  position.x *= (width - 1);
  position.z *= (depth - 1);

  position.y = THREEx.Terrain.heightMapToHeight(heightMap, position.x, position.z);
  position.y = (position.y - 0.5) * 2;
  position.y *= planeMesh.scale.z;

  return position.y;
};

THREEx.Terrain.planeToHeightMapCoords0 = function (position, heightMap, planeMesh) {

  // TODO assert no rotation in planeMesh
  // - how can i check that ? with euler ?

  // set position relative to planeMesh position
  position.sub(planeMesh.position);

  // heightMap origin is at its top-left, while planeMesh origin is at its center
  position.x += planeMesh.geometry.width / 2;
  position.z += planeMesh.geometry.height / 2;

  // normalize it from [0,1] for the heightmap
  position.x /= planeMesh.geometry.width;
  position.z /= planeMesh.geometry.height;

  // get heightMap dimensions
  let width = heightMap.length;
  let depth = heightMap[0].length;

  // convert it in heightMap coordinate
  position.x *= (width - 1);
  position.z *= (depth - 1);

  let height = THREEx.Terrain.heightMapToHeight(heightMap, position.x, position.z);
  position.y = (height - 0.5) * 2;

  return position;
};

/**
 * Set the vertex color for a THREE.Geometry based on a heightMap
 *
 * @param  {Array} heightMap the heightmap
 * @param  {THREE.Geometry} geometry  the geometry to set
 */
THREEx.Terrain.heightMapToVertexColor = function (heightMap, geometry) {
  // get heightMap dimensions
  let width = heightMap.length;
  let depth = heightMap[0].length;
  // loop on each vertex of the geometry
  let color = new THREE.Color();
  for (let i = 0; i < geometry.faces.length; i++) {
    let face = geometry.faces[i];
    if (face instanceof THREE.Face4) {
      console.assert(face instanceof THREE.Face4);
      face.vertexColors.push(vertexIdxToColor(face.a).clone());
      face.vertexColors.push(vertexIdxToColor(face.b).clone());
      face.vertexColors.push(vertexIdxToColor(face.c).clone());
      face.vertexColors.push(vertexIdxToColor(face.d).clone());
    } else if (face instanceof THREE.Face3) {
      console.assert(face instanceof THREE.Face3);
      face.vertexColors.push(vertexIdxToColor(face.a).clone());
      face.vertexColors.push(vertexIdxToColor(face.b).clone());
      face.vertexColors.push(vertexIdxToColor(face.c).clone());
    } else console.assert(false);
  }
  geometry.colorsNeedUpdate = true;
  return;

  function vertexIdxToColor (vertexIdx) {
    let x = Math.floor(vertexIdx % width);
    let z = Math.floor(vertexIdx / width);
    let height = heightMap[x][z];
    return THREEx.Terrain.heightToColor(height);
  }
};

/**
 * give a color based on a given height
 *
 * @param {Number} height the height
 * @return {THREE.Color} the color for this height
 */
THREEx.Terrain.heightToColor = (function () {
  let color = new THREE.Color();
  return function (height) {
    // compute color based on height
    if (height < 0.5) {
      height = (height * 2) * 0.5 + 0.2;
      color.setRGB(0, 0, height);
    } else if (height < 0.7) {
      height = (height - 0.5) / 0.2;
      height = height * 0.5 + 0.2;
      color.setRGB(0, height, 0);
    } else {
      height = (height - 0.7) / 0.3;
      height = height * 0.5 + 0.5;
      color.setRGB(height, height, height);
    }
    // color.setRGB(1,1,1)
    return color;
  };
})();

//////////////////////////////////////////////////////////////////////////////////
//		comment								//
//////////////////////////////////////////////////////////////////////////////////

/**
 * plane geometry with THREE.Face3 from three.js r66
 *
 * @param {[type]} width          [description]
 * @param {[type]} height         [description]
 * @param {[type]} widthSegments  [description]
 * @param {[type]} heightSegments [description]
 */
THREEx.Terrain.PlaneGeometry = function (width, height, widthSegments, heightSegments) {

  THREE.Geometry.call(this);

  this.width = width;
  this.height = height;

  this.widthSegments = widthSegments || 1;
  this.heightSegments = heightSegments || 1;

  let ix, iz;
  let width_half = width / 2;
  let height_half = height / 2;

  let gridX = this.widthSegments;
  let gridZ = this.heightSegments;

  let gridX1 = gridX + 1;
  let gridZ1 = gridZ + 1;

  let segment_width = this.width / gridX;
  let segment_height = this.height / gridZ;

  let normal = new THREE.Vector3(0, 0, 1);

  for (iz = 0; iz < gridZ1; iz++) {
    for (ix = 0; ix < gridX1; ix++) {
      let x = ix * segment_width - width_half;
      let y = iz * segment_height - height_half;

      this.vertices.push(new THREE.Vector3(x, -y, 0));
    }
  }

  for (iz = 0; iz < gridZ; iz++) {
    for (ix = 0; ix < gridX; ix++) {
      let a = ix + gridX1 * iz;
      let b = ix + gridX1 * (iz + 1);
      let c = (ix + 1) + gridX1 * (iz + 1);
      let d = (ix + 1) + gridX1 * iz;

      let uva = new THREE.Vector2(ix / gridX, 1 - iz / gridZ);
      let uvb = new THREE.Vector2(ix / gridX, 1 - (iz + 1) / gridZ);
      let uvc = new THREE.Vector2((ix + 1) / gridX, 1 - (iz + 1) / gridZ);
      let uvd = new THREE.Vector2((ix + 1) / gridX, 1 - iz / gridZ);

      let face = new THREE.Face3(a, b, d);
      face.normal.copy(normal);
      face.vertexNormals.push(normal.clone(), normal.clone(), normal.clone());

      this.faces.push(face);
      this.faceVertexUvs[0].push([uva, uvb, uvd]);

      face = new THREE.Face3(b, c, d);
      face.normal.copy(normal);
      face.vertexNormals.push(normal.clone(), normal.clone(), normal.clone());

      this.faces.push(face);
      this.faceVertexUvs[0].push([uvb.clone(), uvc, uvd.clone()]);
    }
  }
};

THREEx.Terrain.PlaneGeometry.prototype = Object.create(THREE.Geometry.prototype);
