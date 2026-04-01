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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);

  // ── Constants ─────────────────────────────────────────────────────────────
  const EARTH_RADIUS = 100;
  const CAMERA_ALT = 2.8;                       // altitude above surface
  const SUN_DISTANCE = 500;

  // Sun direction — at the horizon, slightly above Earth's limb
  const sunDir = new THREE.Vector3(1, 0.08, 0.3).normalize();
  const sunWorldPos = sunDir.clone().multiplyScalar(SUN_DISTANCE);

  // Camera: sitting above the North Atlantic, looking toward sunrise
  const camBasePos = new THREE.Vector3(0, EARTH_RADIUS + CAMERA_ALT, 0);
  camera.position.copy(camBasePos);

  // Look toward the horizon where the sun is — slightly below eye level
  const lookTarget = new THREE.Vector3(
    sunDir.x * 200,
    EARTH_RADIUS - 1.5,
    sunDir.z * 200
  );
  camera.lookAt(lookTarget);

  // ── Stars ─────────────────────────────────────────────────────────────────
  const starGeo = new THREE.BufferGeometry();
  const starCount = 4000;
  const starPositions = [];
  const surfaceNormal = camBasePos.clone().normalize();

  for (let i = 0; i < starCount * 4; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    const pos = new THREE.Vector3(x, y, z);
    // Only keep stars above the horizon from camera perspective
    const toStar = pos.clone().sub(camBasePos).normalize();
    if (toStar.dot(surfaceNormal) > -0.05) {
      starPositions.push(x, y, z);
      if (starPositions.length >= starCount * 3) break;
    }
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.12,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
  });
  scene.add(new THREE.Points(starGeo, starMat));

  // ── Earth sphere ──────────────────────────────────────────────────────────
  const earthTexture = createEarthCanvasTexture();
  const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 128, 128);

  const earthMat = new THREE.ShaderMaterial({
    uniforms: {
      uSunPos: { value: sunWorldPos },
      uTexture: { value: earthTexture },
    },
    vertexShader: /* glsl */`
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      varying vec2 vUv;
      void main() {
        vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uSunPos;
      uniform sampler2D uTexture;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      varying vec2 vUv;

      void main() {
        // Light direction from fragment toward sun
        vec3 L = normalize(uSunPos - vWorldPos);
        vec3 N = normalize(vWorldNormal);

        // Land/ocean mask
        float mask = texture2D(uTexture, vUv).r;

        // Base colors
        vec3 ocean = vec3(0.02, 0.03, 0.06);
        vec3 land  = vec3(0.45, 0.45, 0.48);
        vec3 baseColor = mix(ocean, land, mask);

        // Polar highlight
        float polar = smoothstep(0.72, 0.88, abs(normalize(vWorldPos).y));
        baseColor = mix(baseColor, vec3(0.6, 0.6, 0.63), polar * mask);

        // Diffuse lighting — very low ambient for dramatic dark side
        float NdotL = dot(N, L);
        float diff = max(NdotL, 0.0);

        // Ambient — extremely low so dark side is nearly black
        float ambient = 0.015;
        vec3 lit = baseColor * (ambient + diff * 1.2);

        // Terminator warm tint — subtle orange near the day/night boundary
        float terminator = smoothstep(-0.08, 0.15, NdotL) * (1.0 - smoothstep(0.15, 0.4, NdotL));
        vec3 warmTint = vec3(0.6, 0.3, 0.1);
        lit += warmTint * terminator * 0.15 * (0.3 + mask * 0.7);

        // Sunrise warm boost — fragments close to sun direction get amber light
        float sunAngle = max(dot(N, L), 0.0);
        float sunriseZone = smoothstep(0.0, 0.3, sunAngle) * (1.0 - smoothstep(0.3, 0.7, sunAngle));
        lit += vec3(0.4, 0.25, 0.08) * sunriseZone * 0.1;

        gl_FragColor = vec4(lit, 1.0);
      }
    `,
  });

  const earth = new THREE.Mesh(earthGeo, earthMat);
  // Rotate to show interesting landmasses near the visible horizon
  earth.rotation.y = -0.5;
  earth.rotation.x = 0.15;
  scene.add(earth);

  // ── Atmospheric Limb (thin blue line) ────────────────────────────────────
  const atmosRadius = EARTH_RADIUS + 0.8;
  const atmosGeo = new THREE.SphereGeometry(atmosRadius, 128, 128);
  const atmosMat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    uniforms: {
      uSunPos: { value: sunWorldPos },
      uCameraPos: { value: camera.position },
      uEarthRadius: { value: EARTH_RADIUS },
    },
    vertexShader: /* glsl */`
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      void main() {
        vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uSunPos;
      uniform vec3 uCameraPos;
      uniform float uEarthRadius;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;

      void main() {
        vec3 N = normalize(vWorldNormal);
        vec3 V = normalize(uCameraPos - vWorldPos);

        // Rim factor — how close to the edge of the sphere
        float rim = 1.0 - max(dot(N, V), 0.0);

        // Thin band: peaks at the limb, falls off both inward and outward
        float thinBand = pow(rim, 1.8) * (1.0 - pow(rim, 12.0));

        // Sun proximity — brighter near the sun
        vec3 toSun = normalize(uSunPos - vWorldPos);
        float sunProximity = max(dot(N, toSun), 0.0);
        float sunGlow = pow(sunProximity, 2.0);

        // Base atmosphere color — vivid blue
        vec3 atmosBlue = vec3(0.25, 0.50, 1.0);

        // Near sun — shift toward white-gold
        vec3 sunColor = vec3(1.0, 0.92, 0.75);
        vec3 atmosColor = mix(atmosBlue, sunColor, sunGlow * 0.8);

        // Intensity — brighter near sun, dimmer away
        float intensity = thinBand * (0.4 + sunGlow * 2.0);

        // Enhance the blue line visibility
        intensity *= 1.8;

        // Only show atmosphere on the lit side and transition zone
        float litSide = smoothstep(-0.3, 0.2, dot(N, normalize(uSunPos)));
        intensity *= litSide;

        gl_FragColor = vec4(atmosColor, clamp(intensity, 0.0, 1.0));
      }
    `,
  });
  scene.add(new THREE.Mesh(atmosGeo, atmosMat));

  // ── Second atmosphere layer — broader glow ──────────────────────────────
  const outerAtmosGeo = new THREE.SphereGeometry(EARTH_RADIUS + 2.5, 96, 96);
  const outerAtmosMat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    uniforms: {
      uSunPos: { value: sunWorldPos },
      uCameraPos: { value: camera.position },
    },
    vertexShader: /* glsl */`
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      void main() {
        vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uSunPos;
      uniform vec3 uCameraPos;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;

      void main() {
        vec3 N = normalize(vWorldNormal);
        vec3 V = normalize(uCameraPos - vWorldPos);

        float rim = 1.0 - max(dot(N, V), 0.0);
        float glow = pow(rim, 3.0) * 0.35;

        vec3 toSun = normalize(uSunPos - vWorldPos);
        float sunProximity = max(dot(N, toSun), 0.0);
        float sunFactor = pow(sunProximity, 3.0);

        vec3 color = mix(vec3(0.15, 0.3, 0.8), vec3(0.9, 0.85, 0.7), sunFactor);
        float alpha = glow * (0.3 + sunFactor * 1.5);

        float litSide = smoothstep(-0.2, 0.3, dot(N, normalize(uSunPos)));
        alpha *= litSide;

        gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.6));
      }
    `,
  });
  scene.add(new THREE.Mesh(outerAtmosGeo, outerAtmosMat));

  // ── Sun disc sprite ───────────────────────────────────────────────────────
  function createSunTexture(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const cx = size / 2;
    const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
    g.addColorStop(0, 'rgba(255, 255, 248, 1.0)');
    g.addColorStop(0.02, 'rgba(255, 252, 240, 0.95)');
    g.addColorStop(0.08, 'rgba(255, 240, 200, 0.7)');
    g.addColorStop(0.25, 'rgba(255, 210, 130, 0.3)');
    g.addColorStop(0.5, 'rgba(255, 180, 80, 0.1)');
    g.addColorStop(1.0, 'rgba(255, 150, 50, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  // Position sun at the horizon
  const sunSpritePos = sunDir.clone().multiplyScalar(300);
  const sunSpriteMat = new THREE.SpriteMaterial({
    map: createSunTexture(512),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    opacity: 1.0,
  });
  const sunSprite = new THREE.Sprite(sunSpriteMat);
  sunSprite.position.copy(sunSpritePos);
  sunSprite.scale.set(60, 60, 1);
  sunSprite.renderOrder = 10;
  scene.add(sunSprite);

  // ── God rays sprite ───────────────────────────────────────────────────────
  function createGodRayTexture(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const cx = size / 2;

    // Draw radial light streaks
    const rayCount = 10;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx, cx);
      ctx.rotate(angle);

      const grad = ctx.createLinearGradient(0, 0, cx, 0);
      grad.addColorStop(0, 'rgba(255, 240, 200, 0.4)');
      grad.addColorStop(0.3, 'rgba(255, 220, 150, 0.15)');
      grad.addColorStop(0.7, 'rgba(255, 200, 100, 0.04)');
      grad.addColorStop(1.0, 'rgba(255, 180, 80, 0.0)');

      ctx.fillStyle = grad;
      // Narrow ray shape
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(cx, -0.5);
      ctx.lineTo(cx, 0.5);
      ctx.lineTo(0, 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Central bright spot
    const cg = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx * 0.15);
    cg.addColorStop(0, 'rgba(255, 255, 240, 0.6)');
    cg.addColorStop(1, 'rgba(255, 240, 200, 0.0)');
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(c);
  }

  const godRayMat = new THREE.SpriteMaterial({
    map: createGodRayTexture(1024),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    opacity: 0.8,
  });
  const godRaySprite = new THREE.Sprite(godRayMat);
  godRaySprite.position.copy(sunSpritePos);
  godRaySprite.scale.set(180, 180, 1);
  godRaySprite.renderOrder = 9;
  scene.add(godRaySprite);

  // ── Horizon glow ──────────────────────────────────────────────────────────
  function createHorizonGlowTexture(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const cx = size / 2;
    const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
    g.addColorStop(0, 'rgba(255, 230, 180, 0.25)');
    g.addColorStop(0.3, 'rgba(255, 200, 120, 0.1)');
    g.addColorStop(0.6, 'rgba(200, 160, 100, 0.03)');
    g.addColorStop(1.0, 'rgba(150, 120, 80, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  const horizonGlowMat = new THREE.SpriteMaterial({
    map: createHorizonGlowTexture(512),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    opacity: 0.7,
  });
  const horizonGlow = new THREE.Sprite(horizonGlowMat);
  horizonGlow.position.copy(sunSpritePos);
  horizonGlow.scale.set(350, 150, 1);
  horizonGlow.renderOrder = 8;
  scene.add(horizonGlow);

  // ── Mouse → parallax ─────────────────────────────────────────────────────
  const mouse = { x: 0, y: 0 };
  const smoothMouse = { x: 0, y: 0 };

  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // ── Resize ────────────────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ── Animation loop ────────────────────────────────────────────────────────
  let rafId = null;
  const clock = new THREE.Clock();

  function animate() {
    rafId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Smooth mouse following
    smoothMouse.x += (mouse.x - smoothMouse.x) * 0.06;
    smoothMouse.y += (mouse.y - smoothMouse.y) * 0.06;

    // Subtle camera parallax
    camera.position.x = camBasePos.x + smoothMouse.x * 0.4;
    camera.position.z = camBasePos.z + smoothMouse.y * 0.2;
    camera.position.y = camBasePos.y + smoothMouse.y * -0.1;
    camera.lookAt(lookTarget);

    // Slow Earth rotation for subtle motion
    earth.rotation.y += 0.0003;

    // Sun pulse
    const pulse = 1.0 + Math.sin(t * 0.5) * 0.03;
    sunSprite.scale.set(60 * pulse, 60 * pulse, 1);

    // God ray slow rotation
    godRaySprite.material.rotation = t * 0.02;

    renderer.render(scene, camera);
  }
  animate();

  // ── Enter button ──────────────────────────────────────────────────────────
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
