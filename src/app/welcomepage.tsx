import React from 'react';
import Icon from './components/Icon_andy'; // Ajusta el nombre según la ruta de tu archivo
import Text from './components/Text'; // Ajusta el nombre según la ruta de tu archivo
import Button from './components/Button_login'; // Ajusta el nombre según la ruta de tu archivo

const WelcomePage = () => {
  return (
    <div
      style={{
        backgroundColor: '#112121',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
      }}
    >
      <Icon />
      <Text text="Andy AI" />
      <Text text="Your smart financial assistant" />
      <Button label="Login" />
      <Button label="Sign Up" />
    </div>
  );
};

export default WelcomePage;
