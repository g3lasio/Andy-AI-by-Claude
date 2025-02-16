
import React from 'react';

const styles = {
  Card: {
    top: '134px',
    left: '133px',
    width: '109px',
    height: '100px',
    backgroundColor: '#f0f0f0',
    borderRadius: '10000px',
  },
};

const Card = (props) => {
  return (
    <div style={styles.Card}>
      {props.children}
    </div>
  );
};

export default Card;
