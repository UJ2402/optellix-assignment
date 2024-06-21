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
  extensionAngle,
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
  const perpendicularPlaneRef = useRef(null);
  const [projectedAnteriorLine, setProjectedAnteriorLine] = useState(null);
  const [lateralLine, setLateralLine] = useState(null);
  const [flexionExtensionPlane, setFlexionExtensionPlane] = useState(null);
  const [distalMedialPlane, setDistalMedialPlane] = useState(null);

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

        const planeNormal = new THREE.Vector3()
          .subVectors(hipCenter, femurCenter)
          .normalize();

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
        perpendicularPlaneRef.current = perpendicularPlane;

        const varusValgusPlane = perpendicularPlane.clone();
        varusValgusPlane.rotation.copy(perpendicularPlane.rotation);
        varusValgusPlane.material = perpendicularPlane.material.clone();
        varusValgusPlane.material.color.setHex(0xff0000);
        setVarusValgusPlane(varusValgusPlane);

        if (varusValgusPlane) {
          const flexionExtensionPlane = varusValgusPlane.clone();
          flexionExtensionPlane.rotation.copy(varusValgusPlane.rotation);
          flexionExtensionPlane.material = varusValgusPlane.material.clone();
          flexionExtensionPlane.material.color.setHex(0x00ff00);
          setFlexionExtensionPlane(flexionExtensionPlane);
        }

        const projectPointOntoPlane = (point) => {
          const ray = new THREE.Ray(point, planeNormal.clone().negate());
          const planeMath = new THREE.Plane().setFromNormalAndCoplanarPoint(
            planeNormal,
            femurCenter
          );
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

        if (projectedMedial && projectedLateral) {
          setLines((prevLines) => [
            ...prevLines,
            [projectedMedial, projectedLateral],
          ]);

          const perpVector = calculatePerpendicularVector(
            projectedMedial,
            projectedLateral,
            planeNormal
          );

          perpVector.multiplyScalar(-0.1);

          const anteriorPoint = new THREE.Vector3().addVectors(
            femurCenter,
            perpVector
          );

          setLines((prevLines) => [...prevLines, [femurCenter, anteriorPoint]]);
          setAnteriorLine([femurCenter, anteriorPoint]);
        }
      }
    }
  }, [updateClicked, placedPoints, onPointPlace]);

  useEffect(() => {
    if (
      flexionExtensionPlane &&
      lateralLine &&
      lateralLine.length === 2 &&
      perpendicularPlaneRef.current &&
      placedPoints["Femur Center"]
    ) {
      const [start, end] = lateralLine;
      console.log(lateralLine);
      if (!start || !end) return;

      const axis = new THREE.Vector3().subVectors(end, start).normalize();
      flexionExtensionPlane.position.copy(start);

      const initialRotation = new THREE.Quaternion().setFromEuler(
        perpendicularPlaneRef.current.rotation
      );

      const flexionExtensionRotation = new THREE.Quaternion().setFromAxisAngle(
        axis,
        extensionAngle
      );

      const finalRotation = new THREE.Quaternion().multiplyQuaternions(
        flexionExtensionRotation,
        initialRotation
      );

      flexionExtensionPlane.setRotationFromQuaternion(finalRotation);
    }
  }, [extensionAngle, flexionExtensionPlane, lateralLine, placedPoints]);

  useEffect(() => {
    if (
      flexionExtensionPlane &&
      placedPoints["Distal Medial Pt"] &&
      lateralLine &&
      lateralLine.length === 2
    ) {
      const distalMedialPoint = placedPoints["Distal Medial Pt"];
      const [start, end] = lateralLine;

      const planeGeometry = new THREE.PlaneGeometry(5, 5);
      const newDistalMedialPlane = new THREE.Mesh(
        planeGeometry,
        new THREE.MeshStandardMaterial({
          color: "purple",
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.5,
        })
      );

      newDistalMedialPlane.rotation.copy(flexionExtensionPlane.rotation);
      newDistalMedialPlane.position.copy(distalMedialPoint);

      const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(
        flexionExtensionPlane.quaternion
      );
      newDistalMedialPlane.lookAt(
        newDistalMedialPlane.position.clone().add(normal)
      );

      setDistalMedialPlane(newDistalMedialPlane);
    }
  }, [flexionExtensionPlane, placedPoints, lateralLine]);
  useEffect(() => {
    if (
      varusValgusPlane &&
      anteriorLine &&
      anteriorLine.length === 2 &&
      perpendicularPlaneRef.current &&
      placedPoints["Femur Center"]
    ) {
      const [start, end] = anteriorLine;
      if (!start || !end) return;

      const axis = new THREE.Vector3().subVectors(end, start).normalize();
      varusValgusPlane.position.copy(start);

      const initialRotation = new THREE.Quaternion().setFromEuler(
        perpendicularPlaneRef.current.rotation
      );

      const varusValgusRotation = new THREE.Quaternion().setFromAxisAngle(
        axis,
        varusValgusAngle
      );

      const finalRotation = new THREE.Quaternion().multiplyQuaternions(
        varusValgusRotation,
        initialRotation
      );

      varusValgusPlane.setRotationFromQuaternion(finalRotation);

      const planeNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(
        finalRotation
      );
      const projectPointOntoPlane = (point) => {
        const v = new THREE.Vector3().subVectors(point, start);
        const dist = v.dot(planeNormal);
        return new THREE.Vector3().addVectors(
          point,
          planeNormal.clone().multiplyScalar(-dist)
        );
      };

      const projectedStart = projectPointOntoPlane(start);
      const projectedEnd = projectPointOntoPlane(end);
      const projectedDirection = new THREE.Vector3()
        .subVectors(projectedEnd, projectedStart)
        .normalize();

      const perpendicularDirection = new THREE.Vector3()
        .crossVectors(planeNormal, projectedDirection)
        .normalize();

      const femurCenter = placedPoints["Femur Center"];
      const projectedFemurCenter = projectPointOntoPlane(femurCenter);

      const endPoint = new THREE.Vector3().addVectors(
        projectedFemurCenter,
        perpendicularDirection.multiplyScalar(1)
      );

      if (projectedFemurCenter && endPoint) {
        setLateralLine([projectedFemurCenter, endPoint]);
      }
      setProjectedAnteriorLine([projectedStart, projectedEnd]);
    }
  }, [varusValgusAngle, varusValgusPlane, anteriorLine, placedPoints]);

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
      {lateralLine && <Line points={lateralLine} color="white" lineWidth={5} />}
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
      {distalMedialPlane && <primitive object={distalMedialPlane} />}

      {flexionExtensionPlane && <primitive object={flexionExtensionPlane} />}
      {projectedAnteriorLine && (
        <Line points={projectedAnteriorLine} color="yellow" lineWidth={5} />
      )}
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
