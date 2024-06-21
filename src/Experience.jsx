import { OrbitControls, TransformControls, Line } from "@react-three/drei";
import { useLoader, useThree } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import * as THREE from "three";
const calculatePerpendicularVector = (v1, v2, planeNormal) => {
  const lineVector = new THREE.Vector3().subVectors(v2, v1);
  return new THREE.Vector3().crossVectors(lineVector, planeNormal).normalize();
};
const Experience = ({
  selectedPoint,
  onPointPlace,
  placedPoints,
  updateClicked,
  varusValgusAngle,
}) => {
  const bone1 = useLoader(STLLoader, "/Right_Femur.stl");
  const bone2 = useLoader(STLLoader, "/Right_Tibia.stl");
  const femurRef = useRef();
  const { camera, gl } = useThree();
  const [hoverPoint, setHoverPoint] = useState(null);
  const [lines, setLines] = useState([]);
  const [plane, setPlane] = useState(null);
  const [varusValgusPlane, setVarusValgusPlane] = useState(null);
  const [anteriorLine, setAnteriorLine] = useState(null);
  const perpendicularPlaneRef = useRef(null);  // Add this line

  useEffect(() => {
    const renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const handleMouseMove = (event) => {
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObject(femurRef.current);

      if (intersects.length > 0) {
        const point = intersects[0].point;
        setHoverPoint(point);
      } else {
        setHoverPoint(null);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [camera, gl.domElement]);

  useEffect(() => {
    if (updateClicked && placedPoints) {
      const linesToCreate = [
        ["Femur Center", "Hip Center"],
        ["Femur Proximal Canal", "Femur Distal Canal"],
        ["Medial Epicondyle", "Lateral Epicondyle"],
        ["Posterior Medial Pt", "Posterior Lateral Pt"],
      ];

      const createdLines = linesToCreate
        .map(([point1, point2]) => {
          const start = placedPoints[point1];
          const end = placedPoints[point2];

          if (start && end) {
            return [start, end];
          }

          return null;
        })
        .filter(Boolean);

      setLines(createdLines);
      if (
        placedPoints["Femur Center"] &&
        placedPoints["Hip Center"] &&
        placedPoints["Medial Epicondyle"] &&
        placedPoints["Lateral Epicondyle"]
      ) {
        const femurCenter = placedPoints["Femur Center"];
        const hipCenter = placedPoints["Hip Center"];
        const medialEpicondyle = placedPoints["Medial Epicondyle"];
        const lateralEpicondyle = placedPoints["Lateral Epicondyle"];
        // Calculate plane normal
        const planeNormal = new THREE.Vector3()
          .subVectors(hipCenter, femurCenter)
          .normalize();

        // Create plane
        const planeGeometry = new THREE.PlaneGeometry(5, 5);
        const perpendicularPlane = new THREE.Mesh(
          planeGeometry,
          new THREE.MeshStandardMaterial({
            color: "blue",
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,
          })
        );
        perpendicularPlane.position.copy(femurCenter);
        perpendicularPlane.lookAt(hipCenter);


        setPlane(perpendicularPlane);
        perpendicularPlaneRef.current = perpendicularPlane;  // Store reference

        const varusValgusPlane = perpendicularPlane.clone();
        // console.log(varusValgusPlane.rotation._x);
        // varusValgusPlane.rotation._x = Math.PI * 0.2;
        varusValgusPlane.rotation.copy(perpendicularPlane.rotation);  // Copy rotation

        varusValgusPlane.material = perpendicularPlane.material.clone();
        varusValgusPlane.material.color.setHex(0xff0000); // Set color to red
        setVarusValgusPlane(varusValgusPlane);
        console.log(varusValgusPlane.rotation,perpendicularPlane.rotation)

        // Project points onto plane
        const projectPointOntoPlane = (point) => {
          const ray = new THREE.Ray(point, planeNormal.clone().negate());

          const planeMath = new THREE.Plane().setFromNormalAndCoplanarPoint(
            planeNormal,
            femurCenter
          );

          // Calculate the intersection
          const target = new THREE.Vector3();
          ray.intersectPlane(planeMath, target);

          if (!target) {
            console.warn("No intersection found for point:", point);
            return null;
          }

          return target;
        };

        const projectedMedial = projectPointOntoPlane(medialEpicondyle);
        const projectedLateral = projectPointOntoPlane(lateralEpicondyle);

        // Add projected line
        setLines((prevLines) => [
          ...prevLines,
          [projectedMedial, projectedLateral],
        ]);
        if (projectedMedial && projectedLateral) {
          const perpVector = calculatePerpendicularVector(
            projectedMedial,
            projectedLateral,
            planeNormal
          );

          perpVector.multiplyScalar(-0.1);

          // Add to femur center to get the new point
          const anteriorPoint = new THREE.Vector3().addVectors(
            femurCenter,
            perpVector
          );

          setLines((prevLines) => [...prevLines, [femurCenter, anteriorPoint]]); // anterior line from femur
          setAnteriorLine([femurCenter, anteriorPoint]);

          // Optionally, add the new point to placedPoints
            // onPointPlace("Anterior Point", anteriorPoint);
        }
      }
    }
  }, [updateClicked, placedPoints, onPointPlace]);
  useEffect(() => {
    if (varusValgusPlane && anteriorLine && perpendicularPlaneRef.current) {
      const [start, end] = anteriorLine;
      const axis = new THREE.Vector3().subVectors(end, start).normalize();
      varusValgusPlane.position.copy(start);

      // Use the stored reference to get the initial rotation
      const initialRotation = new THREE.Quaternion().setFromEuler(perpendicularPlaneRef.current.rotation);

      // Create a rotation quaternion for the varus/valgus angle
      const varusValgusRotation = new THREE.Quaternion().setFromAxisAngle(
        axis,
        varusValgusAngle
      );

      // Combine the initial rotation with the varus/valgus rotation
      const finalRotation = new THREE.Quaternion().multiplyQuaternions(
        varusValgusRotation,
        initialRotation
      );

      // Apply the final rotation
      varusValgusPlane.setRotationFromQuaternion(finalRotation);
    }
  }, [varusValgusAngle, varusValgusPlane, anteriorLine]);
  const handleClick = () => {
    if (!selectedPoint || !hoverPoint) return;
    onPointPlace(selectedPoint, hoverPoint);
  };

  return (
    <>
      <gridHelper />
      <axesHelper />
      <mesh
        ref={femurRef}
        geometry={bone1}
        scale={0.01}
        position={[0, -7, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
        onClick={handleClick}
      >
        <meshStandardMaterial wireframe opacity={0} color="white" />
      </mesh>
      {/* <mesh
        geometry={bone2}
        scale={0.01}
        position={[0, -7, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
      >
        <meshStandardMaterial color="red" />
      </mesh> */}
      {Object.entries(placedPoints).map(([point, position]) => (
        <mesh key={point} position={position}>
          <sphereGeometry args={[0.01, 32, 32]} />
          <meshStandardMaterial color="red" />
          {selectedPoint === point && (
            <TransformControls
              mode="translate"
              onObjectChange={() => {
                onPointPlace(point, position);
              }}
            />
          )}
        </mesh>
      ))}
      {plane && <primitive object={plane} />}
      {varusValgusPlane && <primitive object={varusValgusPlane} />}
      {hoverPoint && (
        <mesh position={hoverPoint}>
          <sphereGeometry args={[0.01, 32, 32]} />
          <meshStandardMaterial color="blue" />
        </mesh>
      )}
      {lines.map((line, index) => (
        <Line key={index} points={line} color="green" lineWidth={5} />
      ))}
      {plane && <primitive object={plane} />}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} castShadow />
      <directionalLight
        position={[5, 10, 0]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
    </>
  );
};

export default Experience;
