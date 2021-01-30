//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useRef } from 'react';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(() => ({
  root: {
    // NOTE: Inside div[position=relative].
    position: 'absolute',

    '& input': {
      outline: 'none',
      border: 'none',
      textAlign: 'center',
      fontSize: 18,
      fontFamily: 'monospace',
      backgroundColor: 'transparent'
    }
  }
}));

/**
 * Floating text input.
 * @param grid
 * @param object
 * @param onUpdate
 * @param onEnter
 * @returns {*}
 * @constructor
 */
const Input = ({ grid, object, onUpdate, onEnter = () => {} }) => {
  const classes = useStyles();
  const inputRef = useRef(null);

  // Autofocus.
  useEffect(() => {
    setTimeout(() => {
      inputRef.current.focus();
    });
  }, []);

  const handleUpdate = event => onUpdate(object.id, { text: event.target.value });
  const handleKeyPress = event => {
    if (event.key === 'Enter') {
      onEnter();
    }
  };

  const { properties: { text = '', bounds: { x, y, width: textWidth, height: textHeight } } } = object;

  // TODO(burdon): Map SVG coordinates.
  const inset = 10;
  const fontSize = 18;
  const { width, height } = grid.size;
  const { x: rx, y: ry } = grid.project({ x, y });
  const style = {
    left: width / 2 + rx + inset - 2,
    top: height / 2 + ry + grid.scaleY(textHeight / 2) - (2 * fontSize / 3)
  };

  // TODO(burdon): Autofocus.
  return (
    <div className={classes.root} style={style}>
      <input
        ref={inputRef}
        type="text"
        value={text}
        style={{ width: grid.scaleX(textWidth) - 2 * inset }}
        onChange={handleUpdate}
        onKeyPress={handleKeyPress}
      />
    </div>
  );
};

export default Input;
