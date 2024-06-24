import {
  OrbitControls,
  TransformControls,
  Line,
  useGLTF,
} from "@react-three/drei";
import { useLoader, useThree } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import * as THREE from "three";
import { Perf } from "r3f-perf";
import {
  BoxGeometry,
  BufferGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from "three";
import { Addition, Base, Geometry, Subtraction } from "@react-three/csg";
import { useControls } from "leva";
import { createCuttingGeometry } from "./cuttingGeometry";

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
  resectionOn,
  isPointActive,
  distalResectionDistance,
}) => {
  const bone1 = useLoader(STLLoader, "/Right_Femur.stl");
  const bone2 = useLoader(STLLoader, "/Right_Tibia.stl");
  const { nodes } = useGLTF("/Femur.glb");
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
  const [distalResectionPlane, setDistalResectionPlane] = useState(null);
  const [geometryLoaded, setGeometryLoaded] = useState(false);
  const { boneOpacity, boneColor, anteriorLineLength, lateralLineLength } =
    useControls("Bone Model", {
      boneOpacity: { value: 0.5, min: 0, max: 1, step: 0.1 },
      boneColor: "orange",
      anteriorLineLength: { value: 10.0, min: 10.0, max: 100.0, step: 0.5 },
      lateralLineLength: { value: 0.0, min: 10.0, max: 100.0, step: 0.5 },
    });

  const {
    PerpendicularPlane,
    VarusValgusPlane,
    FlexionExtensionPlane,
    DistalMedialPlane,
    DistalResectionPlane,
  } = useControls("Plane Visibility", {
    PerpendicularPlane: false,
    VarusValgusPlane: false,
    FlexionExtensionPlane: false,
    DistalMedialPlane: false,
    DistalResectionPlane: false,
  });

  useEffect(() => {
    if (
      anteriorLine &&
      anteriorLine.length === 2 &&
      placedPoints["Femur Center"]
    ) {
      const [start, end] = anteriorLine;
      const direction = new THREE.Vector3().subVectors(end, start).normalize();
      const newEnd = new THREE.Vector3().addVectors(
        start,
        direction.multiplyScalar(anteriorLineLength * 0.01) // Adjust scale factor as needed
      );
      setAnteriorLine([start, newEnd]);
      setLines((prevLines) => {
        const newLines = [...prevLines];
        const anteriorLineIndex = newLines.findIndex(
          (line) => line[0].equals(start) && line[1].equals(end)
        );
        if (anteriorLineIndex !== -1) {
          newLines[anteriorLineIndex] = [start, newEnd];
        }
        return newLines;
      });
    }
  }, [anteriorLineLength, anteriorLine, placedPoints]);
  useEffect(() => {
    if (nodes.Right_Femur?.geometry) {
      setGeometryLoaded(true);
    }
  }, [nodes.Right_Femur]);

  useEffect(() => {
    if (distalMedialPlane && flexionExtensionPlane) {
      const planeGeometry = new THREE.PlaneGeometry(5, 5);
      const newDistalResectionPlane = new THREE.Mesh(
        planeGeometry,
        new THREE.MeshStandardMaterial({
          color: "yellow",
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.5,
        })
      );

      newDistalResectionPlane.rotation.copy(distalMedialPlane.rotation);
      newDistalResectionPlane.position.copy(distalMedialPlane.position);

      const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(
        flexionExtensionPlane.quaternion
      );

      newDistalResectionPlane.position.add(
        normal.multiplyScalar(0.01 * distalResectionDistance)
      );

      // Store the normal vector with the plane
      newDistalResectionPlane.userData.normal = normal;

      setDistalResectionPlane(newDistalResectionPlane);
    }
  }, [distalMedialPlane, flexionExtensionPlane]);

  useEffect(() => {
    const renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const handleMouseMove = (event) => {
      if (!isPointActive || resectionOn) {
        setHoverPoint(null);
        return;
      }

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

    if (isPointActive && !resectionOn) {
      window.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [camera, gl.domElement, isPointActive, resectionOn]);

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

          perpVector.multiplyScalar(-anteriorLineLength * 0.01); //anterior line length

          const anteriorPoint = new THREE.Vector3().addVectors(
            femurCenter,
            perpVector
          );

          setLines((prevLines) => [...prevLines, [femurCenter, anteriorPoint]]);
          setAnteriorLine([femurCenter, anteriorPoint]);
        }
      }
    }
  }, [updateClicked, placedPoints, onPointPlace, anteriorLineLength]);

  useEffect(() => {
    if (
      varusValgusPlane &&
      flexionExtensionPlane &&
      lateralLine &&
      lateralLine.length === 2 &&
      perpendicularPlaneRef.current &&
      placedPoints["Femur Center"]
    ) {
      const [start, end] = lateralLine;
      if (!start || !end) return;

      const axis = new THREE.Vector3().subVectors(end, start).normalize();
      flexionExtensionPlane.position.copy(varusValgusPlane.position);

      // Get the current rotation of the varus valgus plane
      const varusValgusRotation = new THREE.Quaternion().setFromEuler(
        varusValgusPlane.rotation
      );

      // Apply the extension angle rotation
      const extensionRotation = new THREE.Quaternion().setFromAxisAngle(
        axis,
        extensionAngle
      );

      // Combine the rotations
      const finalRotation = new THREE.Quaternion().multiplyQuaternions(
        extensionRotation,
        varusValgusRotation
      );

      flexionExtensionPlane.setRotationFromQuaternion(finalRotation);
    }
  }, [
    extensionAngle,
    flexionExtensionPlane,
    lateralLine,
    placedPoints,
    varusValgusPlane,
  ]);

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
        perpendicularDirection.multiplyScalar(lateralLineLength * 0.01) //size of lateral line
      );

      if (projectedFemurCenter && endPoint) {
        setLateralLine([projectedFemurCenter, endPoint]);
      }
      setProjectedAnteriorLine([projectedStart, projectedEnd]);
    }
  }, [
    varusValgusAngle,
    varusValgusPlane,
    anteriorLine,
    placedPoints,
    lateralLineLength,
  ]);

  const handleClick = () => {
    if (!isPointActive || resectionOn || !selectedPoint || !hoverPoint) return;
    onPointPlace(selectedPoint, hoverPoint);
  };

  return (
    <>
      {/* <Perf /> */}
      <OrbitControls makeDefault />
      {/* <gridHelper />
      <axesHelper /> */}

      <group key={resectionOn ? "resection" : "normal"}>
        {resectionOn && nodes.Right_Femur?.geometry ? (
          <mesh receiveShadow castShadow>
            <Geometry useGroups>
              <Base
                geometry={nodes.Right_Femur.geometry}
                position={[0, -7, 0]}
                scale={[0.01, 0.01, 0.01]}
              >
                <meshStandardMaterial
                  transparent
                  opacity={boneOpacity}
                  color={boneColor}
                />
              </Base>
              <Subtraction
                position={distalResectionPlane.position}
                rotation={distalResectionPlane.rotation}
              >
                <primitive
                  object={createCuttingGeometry(
                    distalResectionPlane,
                    5,
                    1,
                    placedPoints["Femur Center"]
                  )}
                />
                <meshStandardMaterial
                  transparent
                  opacity={0.8}
                  side={THREE.DoubleSide}
                  color="red"
                />
              </Subtraction>
            </Geometry>
          </mesh>
        ) : (
          <mesh
            ref={femurRef}
            geometry={bone1}
            scale={0.01}
            position={[0, -7, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            castShadow
            onClick={handleClick}
          >
            <meshStandardMaterial
              transparent
              opacity={boneOpacity}
              color={boneColor}
            />
          </mesh>
        )}
      </group>

      {hoverPoint && (
        <mesh position={hoverPoint}>
          <sphereGeometry args={[0.01, 32, 32]} />
          <meshStandardMaterial color="blue" />
        </mesh>
      )}

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

      {lateralLine && <Line points={lateralLine} color="white" lineWidth={5} />}

      {lines.map((line, index) => (
        <Line key={index} points={line} color="green" lineWidth={2} />
      ))}

      {projectedAnteriorLine && (
        <Line points={projectedAnteriorLine} color="yellow" lineWidth={2} />
      )}

      {plane && PerpendicularPlane && <primitive object={plane} />}

      {varusValgusPlane && VarusValgusPlane && (
        <primitive object={varusValgusPlane} />
      )}

      {flexionExtensionPlane && FlexionExtensionPlane && (
        <primitive object={flexionExtensionPlane} />
      )}

      {distalMedialPlane && DistalMedialPlane && (
        <primitive object={distalMedialPlane} />
      )}

      {distalResectionPlane && DistalResectionPlane && (
        <primitive object={distalResectionPlane} />
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
