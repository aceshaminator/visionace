import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export type VisemeType = 'SILENCE' | 'A_E' | 'O_U' | 'P_B_M' | 'F_V' | 'L_N';

interface VisemeTarget {
  upperHeight: number;
  lowerHeight: number;
  width: number;
  teethGap: number;
}

const VISEME_CONFIGS: Record<VisemeType, VisemeTarget> = {
  SILENCE: { upperHeight: 0.08, lowerHeight: -0.08, width: 0.85, teethGap: 0.0 },
  A_E:     { upperHeight: 0.35, lowerHeight: -0.4,  width: 1.1,  teethGap: 0.25 },
  O_U:     { upperHeight: 0.25, lowerHeight: -0.25, width: 0.45, teethGap: 0.12 },
  P_B_M:   { upperHeight: 0.01, lowerHeight: -0.01, width: 0.8,  teethGap: 0.0 },
  F_V:     { upperHeight: 0.18, lowerHeight: -0.06, width: 0.85, teethGap: 0.05 },
  L_N:     { upperHeight: 0.28, lowerHeight: -0.28, width: 0.95, teethGap: 0.18 },
};

export const Mouth3DVisualizer: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeViseme, setActiveViseme] = useState<VisemeType>('SILENCE');
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);

  const currentShape = useRef<VisemeTarget>({ ...VISEME_CONFIGS.SILENCE });
  const targetShape = useRef<VisemeTarget>({ ...VISEME_CONFIGS.SILENCE });

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || 320;
    const height = mountRef.current.clientHeight || 320;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0c);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 4.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight.position.set(2, 4, 3);
    scene.add(dirLight);
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.9);
    frontLight.position.set(0, 0, 5);
    scene.add(frontLight);

    // Materials
    const lipMaterial = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.35,
      metalness: 0.1,
    });
    const teethMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
    });
    const cavityMaterial = new THREE.MeshBasicMaterial({ color: 0x110306 });

    // Inner Cavity Background
    const cavityGeo = new THREE.PlaneGeometry(2.2, 1.4);
    const cavityMesh = new THREE.Mesh(cavityGeo, cavityMaterial);
    cavityMesh.position.z = -0.3;
    scene.add(cavityMesh);

    // Upper Teeth (Narrow base geometry so it never exceeds lip width)
    const upperTeethGeo = new THREE.BoxGeometry(0.5, 0.14, 0.1);
    const upperTeethMesh = new THREE.Mesh(upperTeethGeo, teethMaterial);
    upperTeethMesh.position.set(0, 0.06, -0.1);
    scene.add(upperTeethMesh);

    // Lower Teeth
    const lowerTeethGeo = new THREE.BoxGeometry(0.45, 0.12, 0.1);
    const lowerTeethMesh = new THREE.Mesh(lowerTeethGeo, teethMaterial);
    lowerTeethMesh.position.set(0, -0.06, -0.1);
    scene.add(lowerTeethMesh);

    // --- CONTINUOUS CLOSED LIP CURVE MESH ---
    let lipMesh: THREE.Mesh;

    const buildLipGeometry = (shape: VisemeTarget) => {
      const points = [
        new THREE.Vector3(-shape.width, 0, 0), // Left Corner
        new THREE.Vector3(-shape.width * 0.5, shape.upperHeight * 0.9, 0.05),
        new THREE.Vector3(0, shape.upperHeight, 0.1), // Upper Cupids Bow
        new THREE.Vector3(shape.width * 0.5, shape.upperHeight * 0.9, 0.05),
        new THREE.Vector3(shape.width, 0, 0), // Right Corner
        new THREE.Vector3(shape.width * 0.5, shape.lowerHeight * 0.9, 0.05),
        new THREE.Vector3(0, shape.lowerHeight, 0.1), // Bottom Center Lip
        new THREE.Vector3(-shape.width * 0.5, shape.lowerHeight * 0.9, 0.05),
      ];

      const curve = new THREE.CatmullRomCurve3(points, true); // Closed smooth loop
      return new THREE.TubeGeometry(curve, 48, 0.07, 12, true);
    };

    lipMesh = new THREE.Mesh(buildLipGeometry(currentShape.current), lipMaterial);
    scene.add(lipMesh);

    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const lerp = 0.15;
      const cur = currentShape.current;
      const tar = targetShape.current;

      cur.upperHeight += (tar.upperHeight - cur.upperHeight) * lerp;
      cur.lowerHeight += (tar.lowerHeight - cur.lowerHeight) * lerp;
      cur.width += (tar.width - cur.width) * lerp;
      cur.teethGap += (tar.teethGap - cur.teethGap) * lerp;

      // Rebuild smooth continuous lip geometry dynamically
      lipMesh.geometry.dispose();
      lipMesh.geometry = buildLipGeometry(cur);

      // Hide teeth when mouth height opening is small or closed
      const mouthOpening = Math.abs(cur.upperHeight - cur.lowerHeight);
      const isClosed = mouthOpening < 0.12;

      upperTeethMesh.visible = !isClosed;
      lowerTeethMesh.visible = !isClosed;

      // Scale teeth relative to mouth width so they never stick out
      const scaledTeethWidth = Math.max(0.3, cur.width * 0.7);
      upperTeethMesh.scale.x = scaledTeethWidth;
      lowerTeethMesh.scale.x = scaledTeethWidth * 0.9;

      upperTeethMesh.position.y = Math.max(0.02, cur.upperHeight * 0.35);
      lowerTeethMesh.position.y = Math.min(-0.02, cur.lowerHeight * 0.35);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const triggerViseme = (viseme: VisemeType) => {
    setActiveViseme(viseme);
    targetShape.current = { ...VISEME_CONFIGS[viseme] };
  };

  const playTestSequence = async () => {
    if (isPlayingSequence) return;
    setIsPlayingSequence(true);

    const sequence: VisemeType[] = ['P_B_M', 'O_U', 'L_N', 'A_E', 'O_U', 'P_B_M', 'SILENCE'];

    for (const viseme of sequence) {
      triggerViseme(viseme);
      await new Promise((res) => setTimeout(res, 350));
    }

    setIsPlayingSequence(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#09090b', padding: '20px', borderRadius: '16px', border: '1px solid #27272a' }}>
      <h3 style={{ color: '#f8fafc', marginBottom: '8px', fontSize: '1.2rem' }}>3D Speech Viseme Engine</h3>
      <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '16px' }}>
        Active Viseme Shape: <strong style={{ color: '#38bdf8' }}>{activeViseme}</strong>
      </p>

      <div ref={mountRef} style={{ width: '300px', height: '260px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #3f3f46' }} />

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '16px', maxWidth: '320px' }}>
        {(['SILENCE', 'A_E', 'O_U', 'P_B_M', 'F_V', 'L_N'] as VisemeType[]).map((v) => (
          <button
            key={v}
            onClick={() => triggerViseme(v)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: activeViseme === v ? '1px solid #38bdf8' : '1px solid #3f3f46',
              background: activeViseme === v ? '#0284c7' : '#18181b',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}
          >
            {v}
          </button>
        ))}
      </div>

      <button
        onClick={playTestSequence}
        disabled={isPlayingSequence}
        style={{
          marginTop: '16px',
          padding: '10px 20px',
          borderRadius: '8px',
          border: 'none',
          background: isPlayingSequence ? '#52525b' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
          color: '#ffffff',
          fontWeight: 'bold',
          cursor: isPlayingSequence ? 'not-allowed' : 'pointer',
          width: '100%',
          maxWidth: '280px'
        }}
      >
        {isPlayingSequence ? 'Simulating Speech...' : '▶ Play Test Speech ("M-O-T-I-O-N")'}
      </button>
    </div>
  );
};