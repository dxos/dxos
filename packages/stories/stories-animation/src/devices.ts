//
// Copyright 2026 DXOS.org
//

/** Device bodies as HTML: white layered slabs that read as 2.5D under the scene's CSS 3D camera. */
const LID_ANGLE = 110;
const shadowLy = (r: string): string =>
  `<div class="ly" style="border-radius:${r};transform:translateZ(-30px) translate(10px,8px);background:#000;opacity:.07"></div>`;
const ly = (r: string, z: number, bg: string): string =>
  `<div class="ly" style="border-radius:${r};transform:translateZ(${z}px);background:${bg}"></div>`;
const face = (r: string, pad: string, inner: string): string =>
  `<div class="ly" style="border-radius:${r};background:#fbfbf9;box-shadow:inset 0 0 0 1.5px #fff;padding:${pad}">${inner}</div>`;
export const DEVICE: Record<'phone' | 'laptop', () => string> = {
  phone: () =>
    `<div class="obj" style="left:-90px;top:-185px;width:180px;height:370px">${shadowLy('30px')}${ly('30px', -12, '#cfd0cc')}${ly('30px', -9, '#d9dad6')}${ly('30px', -6, '#e3e4e0')}${ly('30px', -3, '#ecedea')}${face('30px', '9px', '<div class="scr" style="border-radius:22px"><div style="position:absolute;top:9px;left:67px;width:46px;height:12px;border-radius:6px;background:#c9d0cc"></div><div style="display:flex;align-items:center;gap:8px;padding:30px 12px 8px;border-bottom:1px solid #d5ddd9"><div style="width:22px;height:22px;border-radius:11px;background:#d4a59a"></div><span style="font-size:12px;color:#3f4a45;font-weight:500">Alex</span></div><div class="feed"></div></div>')}</div>`,
  laptop:
    () => `<div class="obj" style="left:-180px;top:-118px;width:360px;height:236px">${shadowLy('14px')}${ly('14px', -8, '#cfd0cc')}${ly('14px', -6, '#d9dad6')}${ly('14px', -4, '#e3e4e0')}${ly('14px', -2, '#ecedea')}
    <div class="ly" style="border-radius:14px;background:#f1f2ef;box-shadow:inset 0 0 0 1.5px #fff"><div class="kb">${'<div></div>'.repeat(70)}</div><div style="position:absolute;left:120px;width:120px;top:146px;height:76px;border-radius:8px;background:#e8e9e5"></div></div>
    <div class="obj" style="left:4px;top:-226px;width:352px;height:226px;transform-origin:50% 100%;transform:translateZ(2px) rotateX(${LID_ANGLE - 180}deg)">${ly('14px 14px 4px 4px', -4, '#dcddd9')}${ly('14px 14px 4px 4px', -2, '#e6e7e3')}${face('14px 14px 4px 4px', '10px 10px 14px', '<div class="scr" style="border-radius:6px"><div class="tbar"><span>Chat</span><span>Synced</span></div><div class="feed"></div></div>')}</div></div>`,
};
/** Far out, every node is a plain circle sized to its footprint. */
export const SCHEMATIC = (radius: number): string =>
  `<div class="dot" style="left:${-radius}px;top:${-radius}px;width:${2 * radius}px;height:${2 * radius}px"></div>`;
