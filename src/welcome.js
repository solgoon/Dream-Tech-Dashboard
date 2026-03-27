import * as THREE from 'three';

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

  // ── Earth sphere ───────────────────────────────────────────────────────────
  const earthGeo = new THREE.SphereGeometry(1, 80, 80);

  const earthMat = new THREE.ShaderMaterial({
    uniforms: {
      uLightDir: { value: new THREE.Vector3(1.5, 0.8, 1.0).normalize() },
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
      varying vec3 vNormal;
      varying vec3 vPos;
      varying vec2 vUv;

      // ---- noise helpers ----
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
      float fbm(vec2 p) {
        float v = 0.0; float a = 0.5;
        for (int i = 0; i < 7; i++) {
          v += a * noise(p); p *= 2.03; a *= 0.49;
        }
        return v;
      }

      void main() {
        // --- land / ocean mask via 3-D position projected onto 2-D noise ---
        vec2 np = vec2(
          atan(vPos.z, vPos.x) * 0.8,
          vPos.y * 1.6
        );
        float mask = fbm(np * 1.9 + 0.5);
        mask = smoothstep(0.44, 0.56, mask);

        // second layer for more organic coastlines
        float detail = fbm(np * 4.2 + 1.7);
        mask = clamp(mask + (detail - 0.5) * 0.22, 0.0, 1.0);
        mask = smoothstep(0.38, 0.62, mask);

        // --- colours ---
        vec3 deepOcean    = vec3(0.02, 0.06, 0.18);
        vec3 shallowOcean = vec3(0.04, 0.13, 0.32);
        vec3 lowLand      = vec3(0.07, 0.16, 0.05);
        vec3 highland     = vec3(0.11, 0.22, 0.08);

        float oceanDepth = fbm(np * 3.5 + 2.1);
        vec3 ocean = mix(deepOcean, shallowOcean, oceanDepth);

        float elevation = fbm(np * 5.0 + 3.3);
        vec3 land = mix(lowLand, highland, elevation);

        vec3 baseColor = mix(ocean, land, mask);

        // polar ice caps
        float polar = smoothstep(0.72, 0.88, abs(vPos.y));
        baseColor = mix(baseColor, vec3(0.55, 0.65, 0.75), polar);

        // --- diffuse lighting ---
        float diff = max(dot(vNormal, uLightDir), 0.0);
        float ambient = 0.08;
        vec3 lit = baseColor * (ambient + diff * 0.92);

        // specular highlight on oceans
        vec3 viewDir = vec3(0.0, 0.0, 1.0);
        vec3 halfDir = normalize(uLightDir + viewDir);
        float spec = pow(max(dot(vNormal, halfDir), 0.0), 48.0) * (1.0 - mask) * 0.35;
        lit += vec3(0.3, 0.55, 1.0) * spec;

        // --- city lights on night side ---
        float nightFactor = 1.0 - smoothstep(0.0, 0.25, diff);
        float cityNoise = fbm(np * 12.0 + 5.5);
        float cities = step(0.64, cityNoise) * mask * nightFactor * 0.6;
        lit += vec3(1.0, 0.85, 0.4) * cities;

        // --- rim atmosphere ---
        vec3 camDir = vec3(0.0, 0.0, 1.0);
        float rim = 1.0 - max(dot(vNormal, camDir), 0.0);
        rim = pow(rim, 3.5);
        lit += vec3(0.05, 0.22, 0.8) * rim * 0.55;

        gl_FragColor = vec4(lit, 1.0);
      }
    `,
  });

  const earth = new THREE.Mesh(earthGeo, earthMat);
  scene.add(earth);

  // ── Atmosphere glow (outer shell) ──────────────────────────────────────────
  const atmosGeo = new THREE.SphereGeometry(1.06, 64, 64);
  const atmosMat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    uniforms: {},
    vertexShader: /* glsl */`
      varying vec3 vNormal;
      varying vec3 vPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPos = position;
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
        gl_FragColor = vec4(0.1, 0.35, 1.0, alpha);
      }
    `,
  });
  scene.add(new THREE.Mesh(atmosGeo, atmosMat));

  // ── Mouse → rotation target ────────────────────────────────────────────────
  const mouse = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const autoSpin = { y: 0 }; // slow auto-spin offset

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

    // Slow auto-spin keeps the globe alive even when cursor is static
    autoSpin.y += delta * 0.06;

    // Cursor-driven target rotation (map mouse -1..+1 → ±1.2 rad)
    target.x = mouse.y * 0.55;
    target.y = mouse.x * 1.2 + autoSpin.y;

    // Smooth lerp
    earth.rotation.x += (target.x - earth.rotation.x) * 0.06;
    earth.rotation.y += (target.y - earth.rotation.y) * 0.06;

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
