import * as THREE from "three";

export const createCuttingGeometry = (plane, size, depth, femurCenter) => {
  const normal = plane.userData.normal;

  const boxGeometry = new THREE.BoxGeometry(size, size, depth);

  // Create a mesh to apply transformations
  const boxMesh = new THREE.Mesh(boxGeometry);
  boxGeometry.translate(0, 0, -depth / 2);

  // Make the box look at the point that the plane's normal is pointing towards
  const targetPoint = new THREE.Vector3().addVectors(plane.position, -normal);
  boxMesh.lookAt(femurCenter);
  boxGeometry.applyMatrix4(boxMesh.matrix);

  return boxGeometry;
};
