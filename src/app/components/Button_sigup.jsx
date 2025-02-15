import React from 'react';

const styles = {
  Button: {
    cursor: 'pointer',
    top: '585px',
    left: '24px',
    width: '327px',
    height: '36px',
    padding: '0px 8px',
    border: '0',
    boxSizing: 'border-box',
    borderRadius: '6px',
    boxShadow: '0px 2px 8px rgba(0,0,0,0.16)',
    backgroundColor: '#13c3c3',
    color: '#19191b',
    fontSize: '22px',
    fontFamily: 'Quantico',
    fontWeight: 500,
    lineHeight: '29px',
    outline: 'none',
  },
};

const defaultProps = {
  label: 'Sign Up',
};

const Button = (props) => {
  return (
    <button style={styles.Button}>
      {props.label ?? defaultProps.label}
    </button>
  );
};

export default Button;