import React from 'react';

const styles = {
  Text: {
    color: '#dfe7eb',
    fontSize: '48px',
    fontFamily: 'Quantico',
    fontWeight: 700,
    lineHeight: '62px',
    textAlign: 'center',
  },
};

const defaultProps = {
  text: 'Andy AI',
};

const Text = (props) => {
  return (
    <div style={styles.Text}>
      {props.text ?? defaultProps.text}
    </div>
  );
};

export default Text;