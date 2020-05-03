//
// Copyright 2020 DxOS, Inc.
//

import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import IconButton from '@material-ui/core/IconButton';
import MuiToolbar from '@material-ui/core/Toolbar';
import grey from '@material-ui/core/colors/grey';

import {
  FlipToFront,
  FlipToBack,
  CheckBoxOutlineBlank,
  RadioButtonUnchecked,
  NearMe,
  Timeline,
  ZoomIn,
  ZoomOut,
  ZoomOutMap,
  GridOn,
  Undo,
  Redo,
  Palette
} from '@material-ui/icons';

import {
  ContentCopy,
  ContentCut,
  ContentPaste
} from '../icons';

const useStyles = makeStyles(() => ({
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    backgroundColor: grey[100]
  }
}));

/**
 *
 * @constructor
 */
const Toolbar = ({ onAction = () => {} }) => {
  const classes = useStyles();

  // https://material.io/resources/icons/?style=outline
  // https://www.materialui.co/icons
  const groups = [
    {
      type: 'switch',
      items: [
        { id: 'pointer', icon: NearMe },
        { id: 'path', icon: Timeline },
        { id: 'rect', icon: CheckBoxOutlineBlank },
        { id: 'ellipse', icon: RadioButtonUnchecked },
        { id: 'palette', icon: Palette },
      ]
    },

    {
      items: [
        { id: 'cut', icon: ContentCut },
        { id: 'copy', icon: ContentCopy },
        { id: 'paste', icon: ContentPaste },
        { id: 'undo', icon: Undo },
        { id: 'redo', icon: Redo },
      ]
    },

    {
      items: [
        { id: 'front', icon: FlipToFront },
        { id: 'back', icon: FlipToBack },
      ]
    },

    {
      items: [
        { id: 'grid', icon: GridOn },
        { id: 'zoom-in', icon: ZoomIn },
        { id: 'zoom-out', icon: ZoomOut },
        { id: 'zoom-fit', icon: ZoomOutMap },
      ]
    },
  ];

  return (
    <MuiToolbar variant="dense" disableGutters className={classes.toolbar}>
      {
        groups.map(({ items }, i) => (
          <div key={i}>
            {
              items.map(({ id, icon: Icon }) => (
                <IconButton
                  key={id}
                  title={id}
                  disableRipple={true}
                  onClick={() => onAction(id)}
                >
                  <Icon />
                </IconButton>
              ))
            }
          </div>
        ))
      }
    </MuiToolbar>
  );
};

export default Toolbar;
