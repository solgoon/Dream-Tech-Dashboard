import * as THREE from 'three';
import { createEarthCanvasTexture } from './utils/earthTexture.js';

export function initWelcome() {
  const overlay = document.getElementById('welcome-overlay');
  const canvas = document.getElementById('globe-canvas');
  const enterBtn = document.getElementById('welcome-enter-btn');
  if (!overlay || !canvas) return;

  // ── Renderer ──────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 2.8;

  // ── Stars ──────────────────────────────────────────────────────────────────
  const starGeo = new THREE.BufferGeometry();
  const starCount = 2800;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i++) {
    starPos[i] = (Math.random() - 0.5) * 200;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.18,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.75,
  });
  scene.add(new THREE.Points(starGeo, starMat));

  // ── Earth sphere (texture-based) ──────────────────────────────────────────
  const earthTexture = createEarthCanvasTexture();
  const earthGeo = new THREE.SphereGeometry(1, 80, 80);

  const earthMat = new THREE.ShaderMaterial({
    uniforms: {
      uLightDir: { value: new THREE.Vector3(1.5, 0.8, 1.0).normalize() },
      uTexture: { value: earthTexture },
    },
    vertexShader: /* glsl */`
      varying vec3 vNormal;
      varying vec3 vPos;
      varying vec2 vUv;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPos    = position;
        vUv     = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uLightDir;
      uniform sampler2D uTexture;
      varying vec3 vNormal;
      varying vec3 vPos;
      varying vec2 vUv;

      // Minimal noise for city-light sparkle
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1,0)), f.x),
          mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
          f.y
        );
      }

      void main() {
        // Land/ocean mask from real coastline texture
        float mask = texture2D(uTexture, vUv).r;

        // Black/gray palette
        vec3 ocean = vec3(0.03, 0.03, 0.05);
        vec3 land  = vec3(0.55, 0.55, 0.60);
        vec3 baseColor = mix(ocean, land, mask);

        // Polar regions — bright white-gray
        float polar = smoothstep(0.72, 0.88, abs(vPos.y));
        baseColor = mix(baseColor, vec3(0.65, 0.65, 0.68), polar * mask);

        // Diffuse lighting — generous ambient keeps dark side readable
        float diff = max(dot(vNormal, uLightDir), 0.0);
        float ambient = 0.35;
        vec3 lit = baseColor * (ambient + diff * 0.65);

        // City lights on night side — cool white
        float nightFactor = 1.0 - smoothstep(0.0, 0.25, diff);
        vec2 np = vUv * 40.0;
        float cityNoise = noise(np);
        float cities = step(0.72, cityNoise) * mask * nightFactor * 0.5;
        lit += vec3(0.85, 0.85, 0.95) * cities;

        // Rim atmosphere — silver-gray
        vec3 camDir = vec3(0.0, 0.0, 1.0);
        float rim = 1.0 - max(dot(vNormal, camDir), 0.0);
        rim = pow(rim, 3.5);
        lit += vec3(0.2, 0.2, 0.25) * rim * 0.55;

        gl_FragColor = vec4(lit, 1.0);
      }
    `,
  });

  const earth = new THREE.Mesh(earthGeo, earthMat);
  // Three.js SphereGeometry UV: phi=0 → longitude -180° (Pacific) faces camera.
  // New York longitude = -74°. phi_NY = (-74+180)/360 * 2π ≈ 1.852 rad.
  // To bring NY to front: rotation.y = -phi_NY.
  const NY_PHI = ((-74 + 180) / 360) * Math.PI * 2; // ≈ 1.852 rad
  earth.rotation.y = -NY_PHI;
  scene.add(earth);

  // ── Atmosphere glow (outer shell) — silver-gray ────────────────────────────
  const atmosGeo = new THREE.SphereGeometry(1.06, 64, 64);
  const atmosMat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    uniforms: {},
    vertexShader: /* glsl */`
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vNormal;
      void main() {
        vec3 camDir = vec3(0.0, 0.0, 1.0);
        float rim = 1.0 - max(dot(vNormal, camDir), 0.0);
        rim = pow(rim, 4.0);
        float alpha = rim * 0.6;
        gl_FragColor = vec4(0.25, 0.25, 0.3, alpha);
      }
    `,
  });
  scene.add(new THREE.Mesh(atmosGeo, atmosMat));

  // ── Mouse → rotation target ────────────────────────────────────────────────
  const mouse = { x: 0, y: 0 };
  const target = { x: -NY_PHI, y: 0 }; // pre-seed to avoid lerp-in from 0

  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;   // -1 … +1
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;  // -1 … +1
  });

  // ── Resize ─────────────────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ── Animation loop ─────────────────────────────────────────────────────────
  let rafId = null;
  const clock = new THREE.Clock();

  function animate() {
    rafId = requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Full π range: cursor at edge → globe rotates 180° from center
    // mouse.x=0 → -NY_PHI (New York at front); mouse.x=±1 → opposite side
    target.x = mouse.y * 0.8;
    target.y = -NY_PHI + mouse.x * Math.PI;

    earth.rotation.x += (target.x - earth.rotation.x) * 0.08;
    earth.rotation.y += (target.y - earth.rotation.y) * 0.08;

    renderer.render(scene, camera);
  }
  animate();

  // ── Enter button ───────────────────────────────────────────────────────────
  function enterDashboard() {
    overlay.classList.add('hidden');
    setTimeout(() => {
      overlay.style.display = 'none';
      cancelAnimationFrame(rafId);
      renderer.dispose();
    }, 800);
  }

  if (enterBtn) {
    enterBtn.addEventListener('click', enterDashboard);
    enterBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') enterDashboard();
    });
  }
}
