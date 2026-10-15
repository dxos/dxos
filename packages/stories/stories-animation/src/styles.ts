//
// Copyright 2026 DXOS.org
//

/** Scene styles, scoped under `.nf-root`; the scene is a fixed light look whatever the theme. */
export const STYLES = `
.nf-root .cam{position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d}
.nf-root .obj{position:absolute;transform-style:preserve-3d}
.nf-root .ly{position:absolute;inset:0}
.nf-root .fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.nf-root .cap{position:absolute;left:16px;top:14px;display:flex;gap:10px;align-items:baseline;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,.86);color:#26302c;max-width:calc(100% - 32px)}
.nf-root .cap .n{font-family:var(--mono);font-size:12px;color:#6b7672;font-variant-numeric:tabular-nums}
.nf-root .cap .t{font-size:15px;font-weight:500}
.nf-root .scr{position:relative;width:100%;height:100%;background:#e4eae7;overflow:hidden;display:flex;flex-direction:column;font-family:var(--body)}
.nf-root .feed{flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:5px;padding:8px 10px;overflow:hidden}
.nf-root .b{max-width:78%;padding:5px 9px;border-radius:12px;font-size:11px;line-height:1.35;animation:in .35s ease-out}
.nf-root .b.l{align-self:flex-start;background:#f7f5ef;color:#4a4740;border-bottom-left-radius:4px}
.nf-root .b.r{align-self:flex-end;background:#9fb4c7;color:#1f2f3d;border-bottom-right-radius:4px}
.nf-root .dots span{display:inline-block;width:5px;height:5px;margin:0 1px;border-radius:3px;background:#a7a296;animation:bl 1s infinite}
.nf-root .dots span:nth-child(2){animation-delay:.15s}.dots span:nth-child(3){animation-delay:.3s}
.nf-root .tbar{display:flex;justify-content:space-between;padding:6px 10px;font-size:11px;color:#6d7873;border-bottom:1px solid #e3e7e4;background:#f2f4f3}
.nf-root .tbar span:first-child{color:#3f4a45;font-weight:500}
.nf-root .kb{position:absolute;left:18px;right:18px;top:16px;height:118px;display:grid;grid-template-columns:repeat(14,1fr);gap:4px}
.nf-root .kb div{background:#fbfbf9;border-radius:3px}
.nf-root .disc{position:absolute;border-radius:50%;background:#cddff0;box-shadow:inset 0 0 0 var(--ring,6px) #8fb3d6;transform:translateZ(var(--dz,-32px)) scale(.001);transition:transform 1.2s cubic-bezier(.3,.7,.2,1)}
.nf-root .disc.on{transform:translateZ(var(--dz,-32px)) scale(1)}
.nf-root .disc.cloud{background:#f5dcd6;box-shadow:inset 0 0 0 var(--ring,6px) #d08b7e;transition-duration:2.2s}
.nf-root .disc.servers{background:#fbebe7;box-shadow:inset 0 0 0 var(--ring,6px) #e2aa9d;transition-delay:.6s}
.nf-root .disc.nested{background:#fef6f3;transition-delay:1s}
.nf-root .real,.nf-root .sch{position:absolute;left:0;top:0;width:0;height:0;transform-style:preserve-3d;transition:opacity .9s}
.nf-root .sch{opacity:0}
.nf-root .cam.schem .real{opacity:0}
.nf-root .cam.schem .sch{opacity:1}
.nf-root .sch div{position:absolute;border:var(--sw,1.5px) solid #5d7f92;background:#f8fafb}
.nf-root .sch div.in{background:transparent;border-color:#9fb4c7}
@keyframes in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes bl{0%,100%{opacity:.3}50%{opacity:1}}
.nf-root .disc{transition:none}
.nf-root .dev .sch{opacity:1;display:none}
.nf-root .dev.far .sch{display:block}
.nf-root .dev.far .real{display:none}
.nf-root .dot{position:absolute;border-radius:50%;background:#f8fafb;border:var(--sw,1.5px) solid #5d7f92}
.nf-root .srv .dot{background:#fffaf8;border-color:#a8766c}
.nf-root .srv .box{position:absolute;left:-80px;top:-80px;width:160px;height:160px;border-radius:22px;background:#fffaf8;border:var(--sw,1.5px) solid #a8766c;box-sizing:border-box;transform:translateZ(-30px)}
.nf-root .srv.far .box{display:none}
.nf-root .srv:not(.far) .dot{display:none}
.nf-root .doc{padding:10px 12px;font-size:11px;line-height:1.5;color:#3f4a45;background:#fbfbf9;height:100%}
.nf-root .caret{display:inline-block;width:1.5px;height:12px;margin-left:1px;background:#5d7f92;vertical-align:-2px;animation:bl 1s steps(2) infinite}
`;
