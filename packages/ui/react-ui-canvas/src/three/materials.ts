//
// Copyright 2026 DXOS.org
//

//
// Materials for the two 3D themes, copied from plugin-spacetime (retired in stage 3): flat CAD shading, and the
// presentation look ported from the echo3d prototype — a lit, dithered PBR sphere, and on see-through shells a Fresnel rim and a faint geodesic
// lattice in the shell's own colour.
//

import {
  Color3,
  Constants,
  FresnelParameters,
  Material,
  PBRMaterial,
  type Scene,
  ShaderMaterial,
  StandardMaterial,
} from '@babylonjs/core';

/** The presentation background (echo3d's night blue). */
export const PRESENTATION_BACKGROUND = '#070b18';

/** How strongly a shell's rim glows at full opacity. */
export const RIM_STRENGTH = 0.9;

/** How dark a shell's lattice is against its colour. */
export const LATTICE_SHADE = 0.45;

/** The lattice's opacity on a shell at full opacity. */
export const LATTICE_OPACITY = 0.25;

const RIM_VERTEX = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
uniform mat4 world;
uniform mat4 worldViewProjection;
uniform vec3 cameraPosition;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vec4 worldPosition = world * vec4(position, 1.0);
  vNormal = normalize((world * vec4(normal, 0.0)).xyz);
  vView = normalize(cameraPosition - worldPosition.xyz);
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;

// A pixel of noise, so the rim's long, faint falloff dithers instead of banding.
const RIM_FRAGMENT = `
precision highp float;
uniform vec3 uColor;
uniform float uOpacity;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 3.0);
  float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.35), rim * uOpacity + noise / 255.0);
}
`;

/** A bright edge where the surface turns away from the viewer, so a faint shell reads as a glass ball. */
export const createRimMaterial = (scene: Scene, name: string): ShaderMaterial => {
  const material = new ShaderMaterial(
    name,
    scene,
    { vertexSource: RIM_VERTEX, fragmentSource: RIM_FRAGMENT },
    {
      attributes: ['position', 'normal'],
      uniforms: ['world', 'worldViewProjection', 'cameraPosition', 'uColor', 'uOpacity'],
      needAlphaBlending: true,
    },
  );
  material.backFaceCulling = false;
  material.disableDepthWrite = true;
  material.alphaMode = Constants.ALPHA_COMBINE;
  return material;
};

export const setRim = (material: ShaderMaterial, color: Color3, opacity: number): void => {
  material.setColor3('uColor', color);
  material.setFloat('uOpacity', opacity);
};

/**
 * A shaded surface: PBR for the presentation look (dithered by the scene's image processing), matte for Neu, flat for
 * CAD.
 */
export const createSurfaceMaterial = (scene: Scene, name: string, kind: 'standard' | 'pbr' | 'neu'): Material => {
  if (kind === 'pbr') {
    const material = new PBRMaterial(name, scene);
    material.metallic = 0;
    material.roughness = 0.6;
    material.transparencyMode = Material.MATERIAL_ALPHABLEND;
    return material;
  }
  const material = new StandardMaterial(name, scene);
  // Neu is matte: a sheen would read as plastic.
  material.specularColor = kind === 'neu' ? new Color3(0.02, 0.02, 0.02) : new Color3(0.1, 0.1, 0.1);
  if (kind === 'neu') {
    // The accent at a sphere's silhouette, where it has no edge to draw its hue on; the Fresnel colours scale the
    // emissive colour, so it is white.
    material.emissiveColor = Color3.White();
    material.emissiveFresnelParameters = new FresnelParameters({
      leftColor: Color3.Black(),
      rightColor: Color3.Black(),
      bias: NEU_RIM_BIAS,
      power: NEU_RIM_POWER,
    });
  }
  return material;
};

/**
 * How far Neu's hue rim reaches in from the silhouette: Babylon weighs it by one less (bias + facing) to the power, so a
 * bias and a power below one keep it to a band at the edge.
 */
export const NEU_RIM_BIAS = 0;
export const NEU_RIM_POWER = 0.2;

/** How strongly Neu's rim takes the hue, so it tints the body's edge rather than glowing. */
export const NEU_RIM_STRENGTH = 0.6;

/** Sets a Neu body's hue rim. */
export const setNeuAccent = (material: Material, accent: Color3): void => {
  if (material instanceof StandardMaterial && material.emissiveFresnelParameters) {
    material.emissiveFresnelParameters.leftColor = accent.scale(NEU_RIM_STRENGTH);
  }
};

export const setSurface = (material: Material, color: Color3, opacity: number): void => {
  if (material instanceof PBRMaterial) {
    material.albedoColor = color.toLinearSpace();
  } else if (material instanceof StandardMaterial) {
    material.diffuseColor = color;
  }
  material.alpha = opacity;
  // Opaque surfaces write depth so see-through shells layer correctly over them.
  material.transparencyMode = opacity < 1 ? Material.MATERIAL_ALPHABLEND : Material.MATERIAL_OPAQUE;
};

/** Wire edges of a geodesic sphere in a darkened colour: the lattice that makes a shell's curvature read. */
export const createLatticeMaterial = (scene: Scene, name: string): StandardMaterial => {
  const material = new StandardMaterial(name, scene);
  material.wireframe = true;
  material.disableLighting = true;
  material.disableDepthWrite = true;
  return material;
};

export const setLattice = (material: StandardMaterial, color: Color3, opacity: number): void => {
  material.emissiveColor = color.scale(LATTICE_SHADE);
  material.alpha = opacity;
};
