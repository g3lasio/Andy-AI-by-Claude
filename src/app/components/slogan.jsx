import React from 'react';

const styles = {
  Text: {
    color: '#e8e8ed',
    fontSize: '16px',
    fontFamily: 'Poppins',
    lineHeight: '18px',
    textAlign: 'center',
  },
};

const defaultProps = {
  text: 'Your smart financial assistant',
};

const Text = (props) => {
  return (
    <div style={styles.Text}>
      {props.text ?? defaultProps.text}
    </div>
  );
};

export default Text;