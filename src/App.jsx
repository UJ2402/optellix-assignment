// App.js
import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Experience from "./Experience";
import "./App.css";

const App = () => {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [placedPoints, setPlacedPoints] = useState({});
  const [updateClicked, setUpdateClicked] = useState(false);
  const [varusValgusAngle, setVarusValgusAngle] = useState(0);

  const handlePointSelect = (point) => {
    setSelectedPoint((prevPoint) => (prevPoint === point ? null : point));
  };

  const handlePointPlace = (point, position) => {
    setPlacedPoints((prevPoints) => ({
      ...prevPoints,
      [point]: position,
    }));
  };

  const handleUpdateClick = () => {
    setUpdateClicked(true);
  };

  const handleVarusValgusRotation = (direction) => {
    setVarusValgusAngle((prevAngle) => prevAngle + direction * Math.PI / 180); // Rotate by 1 degree
  };

  const landmarks = [
    "Femur Center",
    "Hip Center",
    "Femur Proximal Canal",
    "Femur Distal Canal",
    "Medial Epicondyle",
    "Lateral Epicondyle",
    "Distal Medial Pt",
    "Distal Lateral Pt",
    "Posterior Medial Pt",
    "Posterior Lateral Pt",
  ];

  return (
    <div className="app">
      <div className="sidebar">
        {landmarks.map((landmark) => (
          <button
            key={landmark}
            className={`landmark-button ${selectedPoint === landmark ? "active" : ""}`}
            onClick={() => handlePointSelect(landmark)}
          >
            {landmark}
          </button>
        ))}
        <button onClick={handleUpdateClick}>Update</button>
        <button onClick={() => handleVarusValgusRotation(1)}>Varus (+)</button>
        <button onClick={() => handleVarusValgusRotation(-1)}>Valgus (-)</button>
      </div>
      <div className="canvas-container">
        <Canvas camera={{ fov: 45, near: 0.1, far: 200000 }}>
          <Experience
            selectedPoint={selectedPoint}
            placedPoints={placedPoints}
            onPointPlace={handlePointPlace}
            updateClicked={updateClicked}
            varusValgusAngle={varusValgusAngle}
          />
          <OrbitControls />
        </Canvas>
      </div>
    </div>
  );
};

export default App;