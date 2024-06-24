// App.js
import React, { useEffect, useRef, useState } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import {
  MeshTransmissionMaterial,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import Experience from "./Experience";
import { SUBTRACTION, Brush, Evaluator, ADDITION } from "three-bvh-csg";
import "./App.css";
import {
  BoxGeometry,
  BufferGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from "three";
import * as THREE from "three";
const App = () => {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [placedPoints, setPlacedPoints] = useState({});
  const [updateClicked, setUpdateClicked] = useState(false);
  const [varusValgusAngle, setVarusValgusAngle] = useState(0);
  const [extensionAngle, setExtensionAngle] = useState(0);
  const brush1 = new Brush(new SphereGeometry());
  brush1.updateMatrixWorld();
  const brush2 = new Brush(new BoxGeometry());
  brush2.position.y = 0.5;
  brush2.updateMatrixWorld();
  const evaluator = new Evaluator();

  const [resectionOn, setResectionOn] = useState(false);
  const [distalResectionDistance, setDistalResectionDistance] = useState(10);

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

  const handleDistalResectionChange = (change) => {
    setDistalResectionDistance((prevDistance) => Math.max(0, prevDistance + change));
  };

  const handleVarusValgusRotation = (direction) => {
    setVarusValgusAngle((prevAngle) => prevAngle + (direction * Math.PI) / 180); // Rotate by 1 degree
  };

  const handleExtensionRotation = (direction) => {
    setExtensionAngle((prevAngle) => prevAngle + (direction * Math.PI) / 180); // Rotate by 1 degree
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
    <div className="app-container">
      <div className="sidebar left-sidebar">
        <h2>Landmarks</h2>
        {landmarks.map((landmark) => (
          <button
            key={landmark}
            className={`landmark-button ${selectedPoint === landmark ? "active" : ""}`}
            onClick={() => handlePointSelect(landmark)}
          >
            {landmark}
          </button>
        ))}
        <button className="update-button" onClick={handleUpdateClick}>Update</button>
      </div>
      
      <div className="main-content">
        <Canvas camera={{ fov: 45, near: 0.1, far: 200000 }}>
          <OrbitControls />

          <Experience
            selectedPoint={selectedPoint}
            placedPoints={placedPoints}
            onPointPlace={handlePointPlace}
            updateClicked={updateClicked}
            varusValgusAngle={varusValgusAngle}
            extensionAngle={extensionAngle}
            resectionOn={resectionOn}
            distalResectionDistance={distalResectionDistance}

          />
          <ambientLight intensity={1} />
          <pointLight position={[10, 10, 10]} castShadow />
        </Canvas>
        </div>
      
        <div className="sidebar right-sidebar">
      <h2>Adjustments</h2>
      <div className="control-group">
        <h3>Varus/Valgus</h3>
        <div className="angle-controls">
          <button onClick={() => handleVarusValgusRotation(-1)}>-</button>
          <span>{(varusValgusAngle * 180 / Math.PI).toFixed(1)}°</span>
          <button onClick={() => handleVarusValgusRotation(1)}>+</button>
        </div>
      </div>
      <div className="control-group">
        <h3>Flexion/Extension</h3>
        <div className="angle-controls">
          <button onClick={() => handleExtensionRotation(-1)}>-</button>
          <span>{(extensionAngle * 180 / Math.PI).toFixed(1)}°</span>
          <button onClick={() => handleExtensionRotation(1)}>+</button>
        </div>
      </div>
      <div className="control-group">
        <h3>Distal Resection</h3>
        <div className="resection-controls">
          <button onClick={() => handleDistalResectionChange(-1)}>-</button>
          <span>{distalResectionDistance.toFixed(1)} mm</span>
          <button onClick={() => handleDistalResectionChange(1)}>+</button>
        </div>
      </div>
      <div className="control-group">
        <h3>Resection</h3>
        <div 
          className={`toggle-button ${resectionOn ? "active" : ""}`}
          onClick={() => setResectionOn(!resectionOn)}
        ></div>
      </div>
    </div>
    </div>
  );
};

export default App;
