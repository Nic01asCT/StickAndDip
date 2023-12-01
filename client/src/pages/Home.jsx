// Home.jsx
import React from "react";
import "../pages/style.css";

const Home = () => {
  const devices = [
    { name: 'Gerät 1', connected: true },
    { name: 'Gerät 2', connected: false },
    { name: 'Gerät 3', connected: true },
    { name: 'Gerät 4', connected: false },
  ];

  return (
    <div className="content">
      <div className="HomeTitel">Willkommen zu Hause!</div>
      <div className="device-list-container">
        <h2 className="device-list-title">Geräteliste</h2>
        <ul className="device-list">
          {devices.map((device, index) => (
            <li key={index} className="device-item">
              <span className="device-name">{device.name}</span>
              {device.connected ? <span className="connected">Verbunden</span> :
               <span className="not-connected">Verbunden</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Home;
