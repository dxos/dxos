//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { createClock } from '@dxos/animation';
import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Panel from '@dxos/react-ui/Panel';

import { AnimationPlayer, type AnimationPlayerProps } from '#components';
import { meta } from '#meta';
import { detach, keyEdit } from '#model';
import { Animation, AnimatorCapabilities } from '#types';

export type AnimatorArticleProps = AppSurface.ObjectArticleProps<Animation.Animation>;

/** The article of an Animation: the toolbar, then the player over the stages other plugins contribute. */
export const AnimatorArticle = ({ role, subject, attendableId }: AnimatorArticleProps) => {
  const [animation] = useObject(subject);
  const stages = Hooks.useCapabilities(AnimatorCapabilities.Stage);
  // One clock per open animation (DESIGN.md §8); a different animation starts its own at 0.
  const clock = useMemo(() => createClock(), [subject]);

  // A new shot plays the last shot's stage object, which is the common case of a film continuing in one scene.
  const lastStage = subject.shots.at(-1)?.stage;
  const handleAddShot = useCallback(() => {
    const target = lastStage?.target;
    if (!target) {
      return;
    }
    Obj.update(subject, (subject) => {
      subject.shots.push(Animation.makeShot(Ref.make(target)));
    });
  }, [subject, lastStage]);

  const handleEdit = useCallback<NonNullable<AnimationPlayerProps['onEdit']>>(
    (shotId, t, edit) => {
      const index = subject.shots.findIndex((shot) => shot.id === shotId);
      const shot = subject.shots[index];
      const object = shot?.stage.target;
      const stage = AnimatorCapabilities.findStage(stages, object);
      if (!shot || !object || !stage) {
        return;
      }
      const timeline = detach(keyEdit(shot.timeline, edit, t, stage.targets(object)));
      Obj.update(subject, (subject) => {
        subject.shots[index].timeline = timeline;
      });
    },
    [subject, stages],
  );

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'add-shot',
          {
            label: ['add-shot.label', { ns: meta.profile.key }],
            icon: 'ph--plus--regular',
            disabled: !lastStage,
            disposition: 'toolbar',
            testId: 'animator.toolbar.add-shot',
          },
          () => handleAddShot(),
        )
        .action(
          'export',
          {
            label: ['export.label', { ns: meta.profile.key }],
            icon: 'ph--export--regular',
            // Export arrives with the WebCodecs renderer (Phase 4).
            disabled: true,
            disposition: 'toolbar',
            testId: 'animator.toolbar.export',
          },
          () => {},
        )
        .build(),
    [lastStage, handleAddShot],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Panel.Header>
      <Panel.Body>
        <AnimationPlayer animation={animation} stages={stages} clock={clock} onEdit={handleEdit} />
      </Panel.Body>
    </Panel.Root>
  );
};

AnimatorArticle.displayName = 'AnimatorArticle';
