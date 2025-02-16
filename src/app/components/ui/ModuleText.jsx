
import React from 'react';

const styles = {
  Text: {
    color: '#030303',
    fontSize: '16px',
    fontFamily: 'Poppins',
    lineHeight: '24px',
    textAlign: 'center',
  },
};

const defaultProps = {
  text: 'FinAdvisor',
};

const ModuleText = (props) => {
  return (
    <div style={styles.Text}>
      {props.text ?? defaultProps.text}
    </div>
  );
};

export default ModuleText;
