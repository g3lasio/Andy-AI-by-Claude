
import React from 'react';

const styles = {
  Button: {
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    top: '516px',
    left: '47px',
    width: '104px',
    height: '89px',
    border: '0',
    boxSizing: 'border-box',
    borderRadius: '12px',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.01)',
    outline: 'none',
  },
  Icon: {
    color: '#fff',
    fill: '#fff',
    width: '59px',
    height: '59px',
    fontSize: '59px',
  },
};

const IconComponent = () => (
  <svg style={styles.Icon} viewBox="0 0 24 24">
    <path fill="none" d="M0 0h24v24H0z"></path>
    <path d="M21 8c-1.45 0-2.26 1.44-1.93 2.51l-3.55 3.56c-.3-.09-.74-.09-1.04 0l-2.55-2.55C12.27 10.45 11.46 9 10 9c-1.45 0-2.27 1.44-1.93 2.52l-4.56 4.55C2.44 15.74 1 16.55 1 18c0 1.1.9 2 2 2 1.45 0 2.26-1.44 1.93-2.51l4.55-4.56c.3.09.74.09 1.04 0l2.55 2.55C12.73 16.55 13.54 18 15 18c1.45 0 2.27-1.44 1.93-2.52l3.56-3.55c1.07.33 2.51-.48 2.51-1.93 0-1.1-.9-2-2-2z"></path>
    <path d="m15 9 .94-2.07L18 6l-2.06-.93L15 3l-.92 2.07L12 6l2.08.93zM3.5 11 4 9l2-.5L4 8l-.5-2L3 8l-2 .5L3 9z"></path>
  </svg>
);

const defaultProps = {
  IconComponent,
};

const IconButton = (props) => {
  return (
    <button style={styles.Button}>
      {props.IconComponent ? <props.IconComponent style={styles.Icon} /> : <defaultProps.IconComponent />}
    </button>
  );
};

export default IconButton;
