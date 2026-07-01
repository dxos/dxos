//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { TweenService } from './tween-service';

describe('TweenService', () => {
  test('immediate setTarget with duration 0 snaps to target', ({ expect }) => {
    const svc = new TweenService();
    svc.setTarget('a', { x: 10, y: 20 }, { duration: 0 });
    svc.advance(0);
    const v = svc.read('a')!;
    expect(v.x).toBe(10);
    expect(v.y).toBe(20);
  });

  test('interpolates linearly when duration > 0', ({ expect }) => {
    const svc = new TweenService();
    svc.setTarget('a', { x: 0, y: 0 }, { duration: 0 });
    svc.advance(0);
    svc.setTarget('a', { x: 100, y: 0 }, { duration: 1000, easing: 'linear' });
    svc.advance(500);
    const v = svc.read('a')!;
    expect(v.x).toBeCloseTo(50, 1);
  });

  test('isAnimating reflects pending tweens', ({ expect }) => {
    const svc = new TweenService();
    svc.setTarget('a', { x: 0, y: 0 }, { duration: 0 });
    svc.advance(0);
    expect(svc.isAnimating()).toBe(false);
    svc.setTarget('a', { x: 100, y: 0 }, { duration: 100 });
    expect(svc.isAnimating()).toBe(true);
    svc.advance(100);
    expect(svc.isAnimating()).toBe(false);
  });

  test('remove drops an entity', ({ expect }) => {
    const svc = new TweenService();
    svc.setTarget('a', { x: 1, y: 2 }, { duration: 0 });
    svc.advance(0);
    svc.remove('a');
    expect(svc.read('a')).toBeUndefined();
  });
});
