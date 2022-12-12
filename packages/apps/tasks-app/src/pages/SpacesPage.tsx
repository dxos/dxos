import React, { useCallback } from "react";
import { SpacesPage as BaseSpacesPage } from "@dxos/react-appkit";
import { Space, ObjectModel } from "@dxos/client";
import { TASK_LIST } from "../containers/TaskList";

export type SpacesPageProps = {

}

export const SpacesPage = (props: SpacesPageProps) => {
  const createListItem = useCallback(async (space: Space) => {
    await space.database.createItem({
      model: ObjectModel,
      type: TASK_LIST
    });
  }, []);
  return <BaseSpacesPage onSpaceCreate={createListItem} />
}