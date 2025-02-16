
import React from 'react';

const styles = {
  Icon: {
    color: '#2ddddd',
    fill: '#2ddddd',
    fontSize: '407px',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '407px',
    height: '413px',
    zIndex: 0,
  },
};

const IconComponent = () => (
  <svg style={styles.Icon} viewBox="0 0 24 24">
    <path d="M0 0h24v24H0V0z" fill="none"></path>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"></path>
  </svg>
);

const BackgroundCircle = () => {
  return <IconComponent />;
};

export default BackgroundCircle;
