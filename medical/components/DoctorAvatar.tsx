import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const DOCTOR_AVATAR_URL = 'https://models.readyplayer.me/6582e5791726222b622f7717.glb?morphTargets=ARKit&textureAtlas=1024';

// FIX: Replaced declarative lights with imperative creation to solve TSX typing issues for JSX.IntrinsicElements.
function Lights() {
  const { scene } = useThree();
  useEffect(() => {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 2.5);
    directionalLight1.position.set(3, 3, 5);
    const directionalLight2 = new THREE.DirectionalLight(0x64ffda, 1);
    directionalLight2.position.set(-3, 3, 5);
    scene.add(ambientLight, directionalLight1, directionalLight2);
    return () => {
      scene.remove(ambientLight, directionalLight1, directionalLight2);
    };
  }, [scene]);
  return null;
}

// FIX: Replaced declarative <primitive> with imperative scene manipulation to solve TSX typing issues.
function Model() {
  const { scene: modelScene } = useGLTF(DOCTOR_AVATAR_URL);
  const { scene: rootScene } = useThree();
  const headRef = useRef<THREE.Object3D | null>(null);
  
  const targetRotation = useRef(new THREE.Vector2()).current;

  useEffect(() => {
    modelScene.traverse((object) => {
      // Find the head bone by its conventional name
      if (object.name === 'Head') {
        headRef.current = object;
      }
    });

    const handleMouseMove = (event: MouseEvent) => {
      // Normalize mouse coordinates (-1 to +1)
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Adjust sensitivity for a natural look
      targetRotation.set(y * 0.2, x * 0.4);
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    // Set initial position and add to scene
    modelScene.position.set(0, -1.5, 0);
    rootScene.add(modelScene);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      rootScene.remove(modelScene);
    }
  }, [modelScene, rootScene, targetRotation]);

  useFrame((state) => {
    // Animate head movement smoothly using linear interpolation (lerp)
    if (headRef.current) {
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, targetRotation.y, 0.1);
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, targetRotation.x, 0.1);
    }
    
    // Apply a subtle idle animation to the body for a more lively feel
    modelScene.position.y = -1.5 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
  });
  
  return null;
}

const DoctorAvatar = () => {
  return (
    <div className="w-full h-full min-h-[400px] md:min-h-0 cursor-pointer">
      <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }}>
        <Lights />
        <Model />
      </Canvas>
    </div>
  );
};

// Preload the model for faster initial rendering
useGLTF.preload(DOCTOR_AVATAR_URL);

export default DoctorAvatar;
