"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const assetPrefix = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type MountainStageProps = {
  opacity: number;
  cameraPhase: number;
  pointerActive: boolean;
  holdProgress: number;
  effectKey: number;
  reducedMotion: boolean;
};

const plateVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const plateFragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uMap;
  uniform vec2 uResolution;
  uniform float uReveal;
  uniform float uTime;

  float hash(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    float a = hash(cell);
    float b = hash(cell + vec2(1.0, 0.0));
    float c = hash(cell + vec2(0.0, 1.0));
    float d = hash(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
  }

  float fbm(vec2 point) {
    float value = 0.0;
    float amplitude = 0.54;
    for (int octave = 0; octave < 5; octave++) {
      value += noise(point) * amplitude;
      point = point * 2.04 + vec2(13.1, 7.7);
      amplitude *= 0.48;
    }
    return value;
  }

  vec2 coverUv(vec2 uv) {
    float screenAspect = uResolution.x / uResolution.y;
    float imageAspect = 1.5;
    if (screenAspect > imageAspect) {
      float visibleHeight = imageAspect / screenAspect;
      uv.y = (uv.y - 0.5) * visibleHeight + 0.5;
    } else {
      float visibleWidth = screenAspect / imageAspect;
      uv.x = (uv.x - 0.5) * visibleWidth + 0.5;
    }
    return uv;
  }

  void main() {
    vec2 imageUv = coverUv(vUv);
    vec3 colour = texture2D(uMap, imageUv).rgb;
    float field = fbm(vUv * 4.2 + vec2(uTime * 0.018, -uTime * 0.011));
    field = field * 0.7 + (1.0 - vUv.y) * 0.16 + vUv.x * 0.06;
    float threshold = uReveal * 1.34;
    float alpha = 1.0 - smoothstep(field - 0.08, field + 0.08, threshold);
    float wetEdge = smoothstep(0.0, 0.055, abs(field - threshold)) * (1.0 - smoothstep(0.055, 0.11, abs(field - threshold)));
    colour = mix(colour, vec3(0.02, 0.027, 0.023), wetEdge * 0.2);
    gl_FragColor = vec4(colour, alpha);
  }
`;

const interactionFragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform vec2 uEffectOrigin;
  uniform float uTime;
  uniform float uHold;
  uniform float uActive;
  uniform float uEffect;
  uniform float uAct;

  float hash(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    float a = hash(cell);
    float b = hash(cell + vec2(1.0, 0.0));
    float c = hash(cell + vec2(0.0, 1.0));
    float d = hash(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
  }

  float fbm(vec2 point) {
    float value = 0.0;
    float amplitude = 0.54;
    for (int octave = 0; octave < 4; octave++) {
      value += noise(point) * amplitude;
      point = point * 2.03 + vec2(13.7, 8.9);
      amplitude *= 0.48;
    }
    return value;
  }

  void main() {
    vec2 frag = gl_FragCoord.xy;
    float shortest = min(uResolution.x, uResolution.y);
    vec2 point = (frag - uPointer) / shortest;
    float distanceToPointer = length(point);
    float angle = atan(point.y, point.x);
    float fibres = fbm(vec2(angle * 2.0 + uTime * 0.025, distanceToPointer * 30.0 - uTime * 0.04));
    float radius = mix(0.052, 0.158, uHold);
    float edge = radius + (fibres - 0.5) * mix(0.018, 0.054, uHold);
    float core = smoothstep(edge + 0.01, edge - 0.008, distanceToPointer);
    float wet = smoothstep(edge + 0.045, edge + 0.003, distanceToPointer) - core * 0.36;

    float droplets = 0.0;
    for (int index = 0; index < 15; index++) {
      float fi = float(index);
      float seed = hash(vec2(fi, 7.1 + uAct));
      float dropAngle = fi * 2.39996 + seed;
      float dropDistance = radius * (1.25 + seed * 1.05);
      vec2 centre = vec2(cos(dropAngle), sin(dropAngle)) * dropDistance;
      float dropRadius = mix(0.0018, 0.0068, hash(vec2(fi, 2.4)));
      droplets += smoothstep(dropRadius, dropRadius * 0.3, length(point - centre));
    }

    vec2 effectPoint = (frag - uEffectOrigin) / shortest;
    float effectDistance = length(effectPoint);
    float effectAngle = atan(effectPoint.y, effectPoint.x);
    float effectNoise = fbm(effectPoint * 4.4 - vec2(uTime * 0.045, uTime * 0.025));
    float effectEdge = uEffect * 1.58 + (effectNoise - 0.5) * 0.3;
    float wash = smoothstep(effectEdge + 0.1, effectEdge - 0.07, effectDistance);
    float burstLife = smoothstep(0.0, 0.1, uEffect) * (1.0 - smoothstep(0.76, 1.0, uEffect));
    float ringDistance = abs(effectDistance - uEffect * 1.3 - (effectNoise - 0.5) * 0.08);
    float pressureRing = smoothstep(0.04, 0.005, ringDistance) * burstLife;
    float rayCount = 9.0 + mod(uAct, 5.0);
    float radialFibres = pow(max(0.0, sin(effectAngle * rayCount + effectNoise * 8.0)), 9.0);
    radialFibres *= smoothstep(effectEdge + 0.14, effectEdge - 0.02, effectDistance) * burstLife;

    vec3 colour = vec3(0.015, 0.022, 0.018);
    float alpha = (core * 0.86 + wet * 0.24 + droplets * 0.6) * uActive;
    alpha = max(alpha, wash * burstLife * 0.78);
    alpha = max(alpha, pressureRing * 0.6 + radialFibres * 0.22);
    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 0.95));
  }
`;

const ease = (value: number) => value * value * (3 - 2 * value);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function makeGradientMap() {
  const data = new Uint8Array([
    39, 42, 38, 255,
    102, 102, 94, 255,
    173, 169, 156, 255,
    232, 226, 211, 255,
  ]);
  const texture = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

function makeFacadeTexture(seed: number, dark = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  const random = (index: number) => {
    const value = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };

  context.fillStyle = dark ? "#77766e" : "#b7b3a7";
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < 90; index += 1) {
    const alpha = 0.018 + random(index + 8) * 0.06;
    context.fillStyle = `rgba(27, 31, 28, ${alpha})`;
    context.beginPath();
    context.arc(random(index) * 256, random(index + 2) * 512, 2 + random(index + 4) * 18, 0, Math.PI * 2);
    context.fill();
  }
  for (let row = 0; row < 13; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      const index = row * 5 + column;
      const lit = random(index + 91) > 0.84;
      context.fillStyle = lit ? "rgba(231, 219, 177, .72)" : `rgba(22, 27, 24, ${0.38 + random(index + 160) * 0.28})`;
      context.fillRect(16 + column * 47, 16 + row * 38, 22, 25);
      context.strokeStyle = "rgba(26, 31, 28, .42)";
      context.strokeRect(15.5 + column * 47, 15.5 + row * 38, 23, 26);
    }
  }
  context.strokeStyle = "rgba(28, 32, 29, .34)";
  context.lineWidth = 3;
  for (let row = 1; row < 13; row += 1) {
    context.beginPath();
    context.moveTo(0, row * 38 + 4);
    context.lineTo(256, row * 38 + 4);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 2;
  return texture;
}

export default function ThreeMountainStage({ opacity, cameraPhase, pointerActive, holdProgress, effectKey, reducedMotion }: MountainStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ cameraPhase, pointerActive, holdProgress, reducedMotion });
  const effectStartedRef = useRef(-1);

  useEffect(() => {
    propsRef.current = { cameraPhase, pointerActive, holdProgress, reducedMotion };
  }, [cameraPhase, pointerActive, holdProgress, reducedMotion]);

  useEffect(() => {
    if (effectKey > 0) effectStartedRef.current = performance.now();
  }, [effectKey]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: false, antialias: false, powerPreference: "high-performance" });
    } catch {
      host.classList.add("is-unavailable");
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0xe8e2d4, 1);
    renderer.autoClear = false;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8e2d4);
    scene.fog = new THREE.FogExp2(0xd9d3c6, lowPower ? 0.022 : 0.018);
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 130);
    const world = new THREE.Group();
    scene.add(world);
    const mountainZone = new THREE.Group();
    world.add(mountainZone);

    const overlayScene = new THREE.Scene();
    const interactionScene = new THREE.Scene();
    const overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const referenceTexture = new THREE.TextureLoader().load(`${assetPrefix}/ink/scene-01-mountain-city.webp`);
    referenceTexture.colorSpace = THREE.SRGBColorSpace;
    referenceTexture.minFilter = THREE.LinearMipmapLinearFilter;
    referenceTexture.magFilter = THREE.LinearFilter;
    const plateUniforms = {
      uMap: { value: referenceTexture },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uReveal: { value: 0 },
      uTime: { value: 0 },
    };
    const plateGeometry = new THREE.PlaneGeometry(2, 2);
    const plateMaterial = new THREE.ShaderMaterial({
      uniforms: plateUniforms,
      vertexShader: plateVertexShader,
      fragmentShader: plateFragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    overlayScene.add(new THREE.Mesh(plateGeometry, plateMaterial));
    const interactionUniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uEffectOrigin: { value: new THREE.Vector2(0.5, 0.5) },
      uTime: { value: 0 },
      uHold: { value: 0 },
      uActive: { value: 0 },
      uEffect: { value: 0 },
      uAct: { value: 0 },
    };
    const interactionGeometry = new THREE.PlaneGeometry(2, 2);
    const interactionMaterial = new THREE.ShaderMaterial({
      uniforms: interactionUniforms,
      vertexShader: plateVertexShader,
      fragmentShader: interactionFragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    interactionScene.add(new THREE.Mesh(interactionGeometry, interactionMaterial));

    const gradientMap = makeGradientMap();
    const facadeLight = makeFacadeTexture(2.3);
    const facadeMid = makeFacadeTexture(7.1, true);
    const materials = {
      paper: new THREE.MeshToonMaterial({ color: 0xb6b1a5, gradientMap, flatShading: true }),
      pale: new THREE.MeshToonMaterial({ color: 0xd1cbbd, gradientMap, flatShading: true }),
      stone: new THREE.MeshToonMaterial({ color: 0x686a63, gradientMap, flatShading: true }),
      dark: new THREE.MeshToonMaterial({ color: 0x252a27, gradientMap, flatShading: true }),
      facadeLight: new THREE.MeshToonMaterial({ color: 0xd1cbbd, map: facadeLight, gradientMap, flatShading: true }),
      facadeMid: new THREE.MeshToonMaterial({ color: 0xaaa69b, map: facadeMid, gradientMap, flatShading: true }),
      water: new THREE.MeshToonMaterial({ color: 0x9fa29b, gradientMap, transparent: true, opacity: 0.68 }),
      ink: new THREE.MeshBasicMaterial({ color: 0x111713, transparent: true, opacity: 0.88 }),
      bamboo: new THREE.MeshToonMaterial({ color: 0x7c6e56, gradientMap, flatShading: true }),
      cloth: new THREE.MeshToonMaterial({ color: 0x4b514b, gradientMap, flatShading: true }),
      cinnabar: new THREE.MeshToonMaterial({ color: 0x85473e, gradientMap, flatShading: true }),
      warm: new THREE.MeshBasicMaterial({ color: 0xd8bb82, transparent: true, opacity: 0.78 }),
    };
    const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x171c18, transparent: true, opacity: 0.55 });
    const faintOutlineMaterial = new THREE.LineBasicMaterial({ color: 0x252b27, transparent: true, opacity: 0.2 });
    const geometries: THREE.BufferGeometry[] = [plateGeometry, interactionGeometry];

    const addOutlined = (geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], scale: [number, number, number] = [1, 1, 1], outline = outlineMaterial, parent: THREE.Object3D = mountainZone) => {
      geometries.push(geometry);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.scale.set(...scale);
      const edges = new THREE.EdgesGeometry(geometry, 24);
      geometries.push(edges);
      mesh.add(new THREE.LineSegments(edges, outline));
      parent.add(mesh);
      return mesh;
    };

    const addBuilding = (x: number, z: number, width: number, height: number, depth: number, dark = false, parent: THREE.Object3D = mountainZone) => {
      const geometry = new THREE.BoxGeometry(width, height, depth);
      return addOutlined(geometry, dark ? materials.facadeMid : materials.facadeLight, [x, height / 2 - 0.15, z], [1, 1, 1], outlineMaterial, parent);
    };

    scene.add(new THREE.HemisphereLight(0xf2ecdc, 0x444944, 2.2));
    const sun = new THREE.DirectionalLight(0xf6efdc, 2.4);
    sun.position.set(-8, 18, 12);
    scene.add(sun);

    const groundGeometry = new THREE.PlaneGeometry(74, 74, 34, 34);
    const groundPosition = groundGeometry.attributes.position;
    for (let index = 0; index < groundPosition.count; index += 1) {
      const x = groundPosition.getX(index);
      const y = groundPosition.getY(index);
      const ridge = Math.max(0, 1 - Math.hypot((x + 19) / 18, (y - 2) / 24));
      const terraces = Math.floor(ridge * 7) / 7;
      const noise = Math.sin(x * 0.31) * Math.cos(y * 0.23) * 0.18;
      groundPosition.setZ(index, terraces * 8 + noise - 0.45);
    }
    groundGeometry.computeVertexNormals();
    groundGeometry.rotateX(-Math.PI / 2);
    addOutlined(groundGeometry, materials.paper, [0, 0, 0], [1, 1, 1], faintOutlineMaterial);

    const waterGeometry = new THREE.PlaneGeometry(56, 28, 22, 10);
    waterGeometry.rotateX(-Math.PI / 2);
    const water = addOutlined(waterGeometry, materials.water, [8, -0.38, -26], [1, 1, 1], faintOutlineMaterial);

    const mountainGeometry = new THREE.ConeGeometry(7, 15, 7, 3);
    for (let index = 0; index < 7; index += 1) {
      const x = -25 + index * 9;
      const z = -41 - (index % 2) * 5;
      const scale = 0.72 + (index % 3) * 0.18;
      addOutlined(mountainGeometry.clone(), index % 2 ? materials.stone : materials.paper, [x, 5.2, z], [scale, scale, scale], faintOutlineMaterial);
    }

    const towerLayout = [
      [-13, -12, 3.4, 14, 3.1], [-8, -15, 2.8, 18, 2.8], [-3, -13, 3.2, 12, 3.3],
      [3, -15, 3.1, 15, 3.2], [8, -13, 2.9, 12, 3.1], [13, -17, 3.2, 16, 3.2],
      [18, -14, 2.8, 11, 3.0], [-17, -22, 2.6, 11, 2.8], [-5, -24, 2.8, 14, 2.8],
      [6, -23, 3.0, 12, 3.1], [16, -24, 2.9, 13, 2.9], [24, -21, 2.6, 10, 2.7],
    ] as const;
    towerLayout.forEach(([x, z, width, height, depth], index) => {
      if (!lowPower || index % 2 === 0) addBuilding(x, z, width, height, depth, index % 3 === 0);
    });

    for (let index = 0; index < (lowPower ? 10 : 17); index += 1) {
      const angle = index * 1.73;
      const radius = 8 + (index % 4) * 2.2;
      const x = Math.sin(angle) * radius + 2;
      const z = Math.cos(angle) * radius - 3;
      const height = 2.4 + (index % 5) * 0.62;
      addBuilding(x, z, 2.2 + (index % 2) * 0.7, height, 2.2, index % 4 === 0);
    }

    const cliffGeometry = new THREE.DodecahedronGeometry(3.8, 1);
    for (let index = 0; index < 8; index += 1) {
      const x = -13.5 + Math.sin(index * 1.7) * 3.2;
      const y = 2.0 + index * 0.82;
      const z = 4 - index * 1.35;
      const rock = addOutlined(cliffGeometry.clone(), index % 3 === 0 ? materials.dark : materials.stone, [x, y, z], [1.4, 0.9, 1.25]);
      rock.rotation.set(index * 0.23, index * 0.41, index * 0.1);
    }

    const stepGeometry = new THREE.BoxGeometry(2.9, 0.22, 0.72);
    for (let index = 0; index < 24; index += 1) {
      const step = addOutlined(stepGeometry.clone(), materials.pale, [-8.6 + index * 0.43, 4.2 - index * 0.18, 5.2 - index * 0.14], [1, 1, 1], faintOutlineMaterial);
      step.rotation.y = -0.22;
    }
    const railGeometry = new THREE.CylinderGeometry(0.035, 0.035, 1.1, 6);
    for (let index = 0; index < 13; index += 1) {
      addOutlined(railGeometry.clone(), materials.dark, [-9.7 + index * 0.83, 4.65 - index * 0.34, 5.05 - index * 0.27], [1, 1, 1], faintOutlineMaterial);
    }

    const bridge = addOutlined(new THREE.BoxGeometry(23, 0.42, 2.1), materials.stone, [5.2, 2.25, -3.8]);
    bridge.rotation.y = -0.12;
    for (let index = 0; index < 7; index += 1) {
      addOutlined(new THREE.BoxGeometry(0.5, 4.4, 0.5), materials.stone, [-3.5 + index * 3.1, 0.15, -3 + index * -0.38], [1, 1, 1], faintOutlineMaterial);
    }

    addBuilding(5.5, 4.5, 8.4, 4.8, 6.8, true);
    const rooftop = addOutlined(new THREE.BoxGeometry(8.9, 0.25, 7.3), materials.dark, [5.5, 4.92, 4.5]);
    rooftop.rotation.y = -0.03;

    const person = new THREE.Group();
    const body = addOutlined(new THREE.BoxGeometry(0.46, 1.25, 0.34), materials.dark, [0, 0, 0]);
    body.removeFromParent();
    body.position.set(0, 1.2, 0);
    person.add(body);
    const head = addOutlined(new THREE.SphereGeometry(0.25, 10, 7), materials.dark, [0, 0, 0]);
    head.removeFromParent();
    head.position.set(0, 2.03, 0);
    person.add(head);
    for (const side of [-1, 1]) {
      const leg = addOutlined(new THREE.CylinderGeometry(0.095, 0.12, 0.92, 7), materials.dark, [0, 0, 0]);
      leg.removeFromParent();
      leg.position.set(side * 0.12, 0.38, 0);
      person.add(leg);
    }
    person.position.set(2.6, 5.04, 4.15);
    person.rotation.y = Math.PI;
    mountainZone.add(person);

    const inkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-15, 10, -5), new THREE.Vector3(-12, 7, 1), new THREE.Vector3(-9, 4.6, 4.5),
      new THREE.Vector3(-3, 2.7, 2.8), new THREE.Vector3(2.3, 5.08, 4.2), new THREE.Vector3(7, 2.6, -1.5),
      new THREE.Vector3(12, 0.2, -10), new THREE.Vector3(15, -0.12, -24),
    ]);
    const inkGeometry = new THREE.TubeGeometry(inkCurve, 160, 0.16, 8, false);
    geometries.push(inkGeometry);
    const inkRibbon = new THREE.Mesh(inkGeometry, materials.ink);
    mountainZone.add(inkRibbon);

    const mistGeometry = new THREE.BufferGeometry();
    const mistPositions: number[] = [];
    const mistCount = lowPower ? 90 : 160;
    for (let index = 0; index < mistCount; index += 1) {
      const angle = index * 2.39996;
      const radius = 5 + (index % 19) * 1.5;
      mistPositions.push(Math.cos(angle) * radius, 1 + (index % 11) * 0.72, -8 - Math.sin(angle) * radius * 0.7);
    }
    mistGeometry.setAttribute("position", new THREE.Float32BufferAttribute(mistPositions, 3));
    geometries.push(mistGeometry);
    const mistMaterial = new THREE.PointsMaterial({ color: 0xe9e3d6, size: lowPower ? 1.15 : 1.35, transparent: true, opacity: 0.2, depthWrite: false, sizeAttenuation: true });
    const mist = new THREE.Points(mistGeometry, mistMaterial);
    mountainZone.add(mist);

    const makeZone = (x: number, z: number) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      world.add(group);
      return group;
    };

    const addFigure = (parent: THREE.Object3D, x: number, z: number, scale = 1, facing = 0, seated = false) => {
      const figure = new THREE.Group();
      const bodyHeight = seated ? 0.82 : 1.18;
      addOutlined(new THREE.BoxGeometry(0.42, bodyHeight, 0.3), materials.dark, [0, seated ? 0.98 : 1.1, 0], [scale, scale, scale], outlineMaterial, figure);
      addOutlined(new THREE.SphereGeometry(0.23, 9, 6), materials.dark, [0, seated ? 1.62 : 1.86, 0], [scale, scale, scale], outlineMaterial, figure);
      for (const side of [-1, 1]) {
        const leg = addOutlined(new THREE.CylinderGeometry(0.075, 0.1, seated ? 0.58 : 0.84, 6), materials.dark, [side * 0.11, seated ? 0.47 : 0.42, seated ? 0.18 : 0], [scale, scale, scale], outlineMaterial, figure);
        if (seated) leg.rotation.x = Math.PI * 0.38;
      }
      figure.position.set(x, 0, z);
      figure.rotation.y = facing;
      parent.add(figure);
      return figure;
    };

    const addLamp = (parent: THREE.Object3D, x: number, y: number, z: number, size = 0.34) => {
      addOutlined(new THREE.SphereGeometry(size, 10, 7), materials.warm, [x, y, z], [1, 1.18, 1], faintOutlineMaterial, parent);
      addOutlined(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 5), materials.dark, [x, y + 0.56, z], [1, 1, 1], faintOutlineMaterial, parent);
    };

    const addBambooFrame = (parent: THREE.Object3D, width: number, height: number, depth: number) => {
      const pole = new THREE.CylinderGeometry(0.055, 0.07, height, 7);
      for (const x of [-width / 2, 0, width / 2]) {
        for (const z of [-depth / 2, depth / 2]) addOutlined(pole.clone(), materials.bamboo, [x, height / 2, z], [1, 1, 1], faintOutlineMaterial, parent);
      }
      const beamX = new THREE.CylinderGeometry(0.055, 0.065, width, 7);
      beamX.rotateZ(Math.PI / 2);
      const beamZ = new THREE.CylinderGeometry(0.055, 0.065, depth, 7);
      beamZ.rotateX(Math.PI / 2);
      for (const y of [height * 0.55, height]) {
        for (const z of [-depth / 2, depth / 2]) addOutlined(beamX.clone(), materials.bamboo, [0, y, z], [1, 1, 1], faintOutlineMaterial, parent);
        for (const x of [-width / 2, width / 2]) addOutlined(beamZ.clone(), materials.bamboo, [x, y, 0], [1, 1, 1], faintOutlineMaterial, parent);
      }
    };

    // Act 2 — tea stall and waking estate street.
    const teaZone = makeZone(12, -52);
    addOutlined(new THREE.BoxGeometry(34, 0.22, 25), materials.paper, [0, -0.1, 0], [1, 1, 1], faintOutlineMaterial, teaZone);
    for (let index = 0; index < 7; index += 1) addBuilding(-13 + index * 4.2, -9 - (index % 2) * 3, 3.1, 8 + (index % 3) * 2.6, 3.2, index % 3 === 0, teaZone);
    addOutlined(new THREE.BoxGeometry(10, 5.2, 5.4), materials.facadeMid, [4.5, 2.5, -0.8], [1, 1, 1], outlineMaterial, teaZone);
    addOutlined(new THREE.BoxGeometry(8.6, 1.05, 2.1), materials.stone, [1.8, 0.55, 3.0], [1, 1, 1], outlineMaterial, teaZone);
    addOutlined(new THREE.BoxGeometry(8.9, 0.16, 3.7), materials.cloth, [1.2, 4.35, 2.2], [1, 1, 1], faintOutlineMaterial, teaZone).rotation.x = -0.12;
    const kettle = addOutlined(new THREE.CylinderGeometry(0.44, 0.56, 0.82, 12), materials.pale, [0.8, 1.34, 2.7], [1, 1, 1], outlineMaterial, teaZone);
    kettle.rotation.z = -0.06;
    addOutlined(new THREE.TorusGeometry(0.44, 0.055, 6, 16, Math.PI), materials.dark, [0.8, 1.8, 2.7], [1, 1, 1], faintOutlineMaterial, teaZone).rotation.x = Math.PI / 2;
    const teaMaster = addFigure(teaZone, 0.3, 1.65, 1.05, -0.1);
    teaMaster.rotation.z = -0.035;
    for (let index = 0; index < 9; index += 1) addOutlined(new THREE.CylinderGeometry(0.11, 0.13, 0.3, 8), materials.pale, [-2.4 + index * 0.55, 1.2, 2.55], [1, 1, 1], faintOutlineMaterial, teaZone);
    const bus = addOutlined(new THREE.BoxGeometry(5.6, 2.45, 2.15), materials.facadeLight, [-8.2, 1.25, 4.2], [1, 1, 1], outlineMaterial, teaZone);
    bus.rotation.y = -0.14;
    for (const x of [-10.1, -6.5]) for (const z of [3.18, 5.2]) addOutlined(new THREE.CylinderGeometry(0.42, 0.42, 0.22, 10), materials.dark, [x, 0.45, z], [1, 1, 1], faintOutlineMaterial, teaZone).rotation.x = Math.PI / 2;
    addFigure(teaZone, -2.9, 5.5, 0.92, Math.PI);
    addFigure(teaZone, 5.7, 2.1, 0.88, -Math.PI / 2, true);
    addLamp(teaZone, 1.2, 4.0, 2.5, 0.28);

    // Act 3 — wood-carving workshop, connected behind the tea stall.
    const woodZone = makeZone(-10, -92);
    addOutlined(new THREE.BoxGeometry(28, 0.22, 24), materials.paper, [0, -0.1, 0], [1, 1, 1], faintOutlineMaterial, woodZone);
    addOutlined(new THREE.BoxGeometry(17, 6.8, 8.4), materials.facadeMid, [0, 3.3, -3.5], [1, 1, 1], outlineMaterial, woodZone);
    addOutlined(new THREE.BoxGeometry(12, 0.32, 5.2), materials.dark, [0, 6.6, -0.6], [1, 1, 1], outlineMaterial, woodZone).rotation.x = -0.16;
    addOutlined(new THREE.BoxGeometry(7.2, 1.2, 2.7), materials.bamboo, [0.5, 0.65, 2.6], [1, 1, 1], outlineMaterial, woodZone);
    addFigure(woodZone, 0.2, 2.0, 1.05, 0);
    for (let index = 0; index < 18; index += 1) {
      const x = -4.5 + (index % 6) * 1.65;
      const z = -0.2 + Math.floor(index / 6) * 0.75;
      const tool = addOutlined(new THREE.CylinderGeometry(0.035, 0.055, 1.1 + (index % 3) * 0.2, 5), materials.dark, [x, 1.45, z], [1, 1, 1], faintOutlineMaterial, woodZone);
      tool.rotation.z = -0.5 + (index % 5) * 0.2;
    }
    for (let index = 0; index < 9; index += 1) addOutlined(new THREE.BoxGeometry(1.8 + (index % 3) * 0.55, 0.28, 0.52), materials.bamboo, [-4 + (index % 4) * 2.4, 0.28 + Math.floor(index / 4) * 0.32, 5.4], [1, 1, 1], faintOutlineMaterial, woodZone);
    addLamp(woodZone, 0.5, 5.6, 0.6, 0.32);

    // Act 4 — estate Yu Lan gathering.
    const yulanZone = makeZone(10, -132);
    addOutlined(new THREE.BoxGeometry(36, 0.2, 28), materials.stone, [0, -0.12, 0], [1, 1, 1], faintOutlineMaterial, yulanZone);
    for (let index = 0; index < 8; index += 1) addBuilding(-15 + index * 4.4, -10 - (index % 2) * 3, 3.2, 12 + (index % 3) * 3, 3.2, true, yulanZone);
    addBambooFrame(yulanZone, 13, 6.5, 7.5);
    addOutlined(new THREE.BoxGeometry(13.8, 0.22, 8.2), materials.cloth, [0, 6.6, 0], [1, 1, 1], faintOutlineMaterial, yulanZone);
    addOutlined(new THREE.BoxGeometry(8.8, 0.75, 4.4), materials.bamboo, [0, 0.38, -0.5], [1, 1, 1], outlineMaterial, yulanZone);
    for (let index = 0; index < 14; index += 1) {
      const x = -6 + (index % 7) * 2;
      const z = -2.7 + Math.floor(index / 7) * 4.6;
      addLamp(yulanZone, x, 4.8 + (index % 2) * 0.42, z, 0.24);
    }
    for (let index = 0; index < (lowPower ? 12 : 22); index += 1) addFigure(yulanZone, -7.5 + (index % 8) * 2.1, 5 + Math.floor(index / 8) * 2.1, 0.72, Math.PI, true);

    // Act 5 — neon workshop in the same night district.
    const neonZone = makeZone(-8, -174);
    addOutlined(new THREE.BoxGeometry(30, 0.2, 23), materials.dark, [0, -0.1, 0], [1, 1, 1], faintOutlineMaterial, neonZone);
    addOutlined(new THREE.BoxGeometry(18, 7.5, 10), materials.facadeMid, [1, 3.65, -2], [1, 1, 1], outlineMaterial, neonZone);
    addOutlined(new THREE.BoxGeometry(8.6, 1.0, 3.0), materials.stone, [1.4, 0.55, 2.8], [1, 1, 1], outlineMaterial, neonZone);
    addFigure(neonZone, 0.8, 2.1, 1.02, 0);
    const neonCurves = [
      [new THREE.Vector3(-4, 2.1, 2), new THREE.Vector3(-2.5, 4.8, 1.7), new THREE.Vector3(0, 3.2, 1.6), new THREE.Vector3(2.5, 5.2, 1.7), new THREE.Vector3(4.2, 2.4, 2)],
      [new THREE.Vector3(-3.2, 1.8, 1.3), new THREE.Vector3(-1.2, 3.5, 1.1), new THREE.Vector3(1.2, 2.5, 1.0), new THREE.Vector3(3.6, 4.4, 1.2)],
    ];
    neonCurves.forEach((points) => {
      const curve = new THREE.CatmullRomCurve3(points);
      addOutlined(new THREE.TubeGeometry(curve, 52, 0.065, 7, false), materials.warm, [0, 0, 0], [1, 1, 1], faintOutlineMaterial, neonZone);
    });
    for (let index = 0; index < 12; index += 1) addOutlined(new THREE.CylinderGeometry(0.055, 0.055, 4.7, 6), materials.pale, [-6.8 + (index % 4) * 1.2, 2.35, -0.5 + Math.floor(index / 4) * 1.1], [1, 1, 1], faintOutlineMaterial, neonZone);

    // Act 6 — harbour and container port.
    const harbourZone = makeZone(6, -220);
    const harbourWater = new THREE.PlaneGeometry(42, 31, 18, 12);
    harbourWater.rotateX(-Math.PI / 2);
    addOutlined(harbourWater, materials.water, [5, -0.28, -4], [1, 1, 1], faintOutlineMaterial, harbourZone);
    for (let level = 0; level < 4; level += 1) {
      for (let index = 0; index < 9 - level; index += 1) {
        const container = addOutlined(new THREE.BoxGeometry(3.7, 1.45, 1.62), level % 2 ? materials.facadeMid : materials.stone, [-10 + index * 2.25 + level * 0.7, 0.72 + level * 1.45, -1 - (index % 2) * 1.8], [1, 1, 1], outlineMaterial, harbourZone);
        container.rotation.y = index % 2 ? Math.PI / 2 : 0;
      }
    }
    for (let index = 0; index < 5; index += 1) {
      const x = -12 + index * 6.5;
      addOutlined(new THREE.BoxGeometry(0.42, 10.5, 0.42), materials.dark, [x, 5.25, -8], [1, 1, 1], outlineMaterial, harbourZone).rotation.z = -0.12;
      const arm = addOutlined(new THREE.BoxGeometry(8.5, 0.36, 0.36), materials.dark, [x + 3.6, 9.9, -8], [1, 1, 1], outlineMaterial, harbourZone);
      arm.rotation.z = -0.16;
    }
    addOutlined(new THREE.BoxGeometry(25, 0.38, 2.4), materials.stone, [7, 4.2, -13], [1, 1, 1], outlineMaterial, harbourZone).rotation.y = -0.08;
    for (let index = 0; index < 7; index += 1) addOutlined(new THREE.BoxGeometry(0.4, 5, 0.4), materials.stone, [-3 + index * 3.5, 1.7, -13], [1, 1, 1], faintOutlineMaterial, harbourZone);

    // Act 7 — Chun Kwan opera stage.
    const operaZone = makeZone(-10, -270);
    addOutlined(new THREE.BoxGeometry(34, 0.2, 27), materials.paper, [0, -0.1, 0], [1, 1, 1], faintOutlineMaterial, operaZone);
    addBambooFrame(operaZone, 16, 8.2, 9.5);
    addOutlined(new THREE.BoxGeometry(16.8, 0.22, 10.2), materials.cloth, [0, 8.35, 0], [1, 1, 1], faintOutlineMaterial, operaZone);
    addOutlined(new THREE.BoxGeometry(12.5, 1.2, 6.2), materials.bamboo, [0, 0.6, -0.6], [1, 1, 1], outlineMaterial, operaZone);
    for (const x of [-5.4, 5.4]) addOutlined(new THREE.BoxGeometry(2.1, 6.2, 0.22), materials.cinnabar, [x, 4.25, 2.2], [1, 1, 1], outlineMaterial, operaZone);
    for (let index = 0; index < 5; index += 1) addFigure(operaZone, -4 + index * 2, -0.4 + (index % 2) * 0.8, 0.9, Math.PI);
    for (let index = 0; index < (lowPower ? 16 : 28); index += 1) addFigure(operaZone, -8 + (index % 10) * 1.75, 5 + Math.floor(index / 10) * 2.1, 0.68, Math.PI, true);
    for (let index = 0; index < 10; index += 1) addLamp(operaZone, -7 + index * 1.55, 6.7 + (index % 2) * 0.45, 3.1, 0.22);

    // Act 8 — Tin Hau altar beyond the turning curtain.
    const tinhauZone = makeZone(10, -314);
    addOutlined(new THREE.BoxGeometry(31, 0.2, 24), materials.paper, [0, -0.1, 0], [1, 1, 1], faintOutlineMaterial, tinhauZone);
    addBambooFrame(tinhauZone, 14, 7.4, 8.2);
    addOutlined(new THREE.BoxGeometry(11.5, 1.15, 4.8), materials.cinnabar, [0, 0.58, -1.4], [1, 1, 1], outlineMaterial, tinhauZone);
    addOutlined(new THREE.BoxGeometry(5.8, 3.8, 0.4), materials.dark, [0, 3.0, -3.5], [1, 1, 1], outlineMaterial, tinhauZone);
    for (let index = 0; index < 17; index += 1) {
      const x = -4.6 + (index % 9) * 1.15;
      addOutlined(new THREE.CylinderGeometry(0.025, 0.035, 1.25 + (index % 3) * 0.24, 5), materials.cinnabar, [x, 1.6, -0.2], [1, 1, 1], faintOutlineMaterial, tinhauZone);
    }
    for (let index = 0; index < 13; index += 1) addLamp(tinhauZone, -6 + index, 5.9 + (index % 2) * 0.35, 2.4, 0.23);
    for (let index = 0; index < (lowPower ? 10 : 18); index += 1) addFigure(tinhauZone, -7 + (index % 7) * 2.15, 4.6 + Math.floor(index / 7) * 2.1, 0.72, Math.PI, true);

    // Act 9 — mooncake home and the final table of memory.
    const homeZone = makeZone(0, -356);
    addOutlined(new THREE.BoxGeometry(28, 0.24, 23), materials.paper, [0, -0.12, 0], [1, 1, 1], faintOutlineMaterial, homeZone);
    addOutlined(new THREE.BoxGeometry(28, 9.2, 0.34), materials.facadeMid, [0, 4.5, -9.5], [1, 1, 1], outlineMaterial, homeZone);
    addOutlined(new THREE.BoxGeometry(0.34, 9.2, 20), materials.facadeMid, [-12.2, 4.5, 0], [1, 1, 1], outlineMaterial, homeZone);
    const table = addOutlined(new THREE.CylinderGeometry(4.2, 4.2, 0.46, 24), materials.bamboo, [0, 1.42, 0], [1, 1, 1], outlineMaterial, homeZone);
    table.rotation.y = 0.08;
    addOutlined(new THREE.CylinderGeometry(0.58, 0.72, 1.3, 10), materials.bamboo, [0, 0.68, 0], [1, 1, 1], faintOutlineMaterial, homeZone);
    const familyCount = lowPower ? 5 : 7;
    for (let index = 0; index < familyCount; index += 1) {
      const angle = (index / familyCount) * Math.PI * 2;
      addFigure(homeZone, Math.cos(angle) * 5.3, Math.sin(angle) * 5.3, 0.78, -angle + Math.PI / 2, true);
    }
    for (let index = 0; index < 13; index += 1) {
      const angle = (index / 13) * Math.PI * 2;
      addOutlined(new THREE.CylinderGeometry(0.32, 0.34, 0.18, 12), materials.cinnabar, [Math.cos(angle) * (1.2 + (index % 3) * 0.75), 1.76, Math.sin(angle) * (1.2 + (index % 3) * 0.75)], [1, 1, 1], faintOutlineMaterial, homeZone);
    }
    addOutlined(new THREE.BoxGeometry(2.1, 0.36, 2.8), materials.dark, [2.9, 1.82, -0.6], [1, 1, 1], outlineMaterial, homeZone);
    addLamp(homeZone, -2.5, 6.8, -1.2, 0.64);

    const zoneGroups = [mountainZone, teaZone, woodZone, yulanZone, neonZone, harbourZone, operaZone, tinhauZone, homeZone];
    const zoneCentres = [
      new THREE.Vector3(1.6, 3.0, -1.6), new THREE.Vector3(12, 2.2, -52), new THREE.Vector3(-10, 2.1, -92),
      new THREE.Vector3(10, 2.8, -132), new THREE.Vector3(-8, 2.5, -174), new THREE.Vector3(6, 2.5, -220),
      new THREE.Vector3(-10, 3.1, -270), new THREE.Vector3(10, 2.8, -314), new THREE.Vector3(0, 2.4, -356),
    ];
    const actRanges = [[0, 3], [3, 6], [6, 8], [8, 10], [10, 12], [12, 15], [15, 17], [17, 18], [18, 21]] as const;
    const orbitSpans = [Math.PI * 1.5, Math.PI * 1.02, Math.PI * 0.92, Math.PI * 0.82, Math.PI * 1.06, Math.PI * 1.42, Math.PI * 0.96, Math.PI * 1.16, Math.PI * 1.18];
    const orbitRadii = [19.5, 15.5, 13.8, 17, 14.2, 21, 17.5, 15.2, 14.8];
    const orbitHeights = [6.2, 5.2, 4.8, 6.1, 5.1, 7.2, 6.6, 6.0, 5.2];

    const memoryPath = new THREE.CatmullRomCurve3(zoneCentres.map((centre, index) => centre.clone().add(new THREE.Vector3(index % 2 ? -4 : 4, -1.8, 4))));
    const memoryGeometry = new THREE.TubeGeometry(memoryPath, 260, 0.11, 7, false);
    geometries.push(memoryGeometry);
    const memoryRibbon = new THREE.Mesh(memoryGeometry, materials.ink);
    memoryRibbon.material.opacity = 0.42;
    world.add(memoryRibbon);

    const drawingBuffer = new THREE.Vector2();
    let disposed = false;
    let frame = 0;
    let visible = !document.hidden;
    let smoothedPhase = 0;
    const pointer = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);
    const pointerTarget = pointer.clone();
    let capturedEffectAt = -1;

    const resize = () => {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 0.9 : 1.2));
      renderer.setSize(width, height, false);
      renderer.getDrawingBufferSize(drawingBuffer);
      plateUniforms.uResolution.value.copy(drawingBuffer);
      interactionUniforms.uResolution.value.copy(drawingBuffer);
      camera.aspect = width / height;
      camera.fov = width < 720 ? 54 : 46;
      camera.updateProjectionMatrix();
    };
    const onVisibility = () => { visible = !document.hidden; };
    const onPointerMove = (event: PointerEvent) => pointerTarget.set(event.clientX, window.innerHeight - event.clientY);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    resize();

    const draw = (now: number) => {
      if (disposed) return;
      if (visible) {
        const props = propsRef.current;
        const targetPhase = props.reducedMotion ? Math.floor(props.cameraPhase) : Math.min(20.999, Math.max(0, props.cameraPhase));
        smoothedPhase += (targetPhase - smoothedPhase) * 0.075;
        let act = actRanges.findIndex((range) => smoothedPhase >= range[0] && smoothedPhase < range[1]);
        if (act < 0) act = 8;
        const range = actRanges[act];
        const local = clamp01((smoothedPhase - range[0]) / (range[1] - range[0]));
        const travel = ease(clamp01((local - 0.78) / 0.22));
        const orbit = ease(clamp01(local / 0.78));
        const angle = orbit * orbitSpans[act];
        const centre = zoneCentres[act];
        const radius = orbitRadii[act] - Math.sin(orbit * Math.PI) * (act === 5 ? 4.6 : 2.4);
        const height = orbitHeights[act] + Math.sin(orbit * Math.PI * 2.1) * 1.8 + Math.sin(orbit * Math.PI) * 1.4;
        const currentPosition = new THREE.Vector3(centre.x + Math.sin(angle) * radius, height, centre.z + Math.cos(angle) * radius);
        const lookTarget = centre.clone();
        if (act < zoneCentres.length - 1 && travel > 0) {
          const nextCentre = zoneCentres[act + 1];
          const nextEntry = new THREE.Vector3(nextCentre.x, orbitHeights[act + 1], nextCentre.z + orbitRadii[act + 1]);
          currentPosition.lerp(nextEntry, travel);
          lookTarget.lerp(nextCentre, travel);
        }
        camera.position.copy(currentPosition);
        lookTarget.y += Math.sin(orbit * Math.PI * 1.4) * 0.55;
        camera.lookAt(lookTarget);
        zoneGroups.forEach((group, index) => { group.visible = Math.abs(index - act) <= 1; });
        scene.fog!.density = (lowPower ? 0.022 : 0.018) + Math.sin(travel * Math.PI) * 0.035;
        mist.rotation.y = now * 0.000012;
        mist.position.y = Math.sin(now * 0.00018) * 0.22;
        inkRibbon.material.opacity = 0.78 + Math.sin(now * 0.0012) * 0.08;
        person.rotation.z = Math.sin(now * 0.0011) * 0.008;

        pointer.lerp(pointerTarget, props.reducedMotion ? 1 : 0.18);
        const pixelScaleX = drawingBuffer.x / Math.max(1, window.innerWidth);
        const pixelScaleY = drawingBuffer.y / Math.max(1, window.innerHeight);
        interactionUniforms.uPointer.value.set(pointer.x * pixelScaleX, pointer.y * pixelScaleY);
        if (effectStartedRef.current >= 0 && capturedEffectAt !== effectStartedRef.current) {
          capturedEffectAt = effectStartedRef.current;
          interactionUniforms.uEffectOrigin.value.copy(interactionUniforms.uPointer.value);
        }
        let effect = 0;
        if (effectStartedRef.current >= 0) {
          const elapsed = (now - effectStartedRef.current) / 1000;
          effect = Math.min(1, elapsed / 3.8);
          if (elapsed > 4.05) effectStartedRef.current = -1;
        }
        interactionUniforms.uTime.value = now * 0.001;
        interactionUniforms.uHold.value += (props.holdProgress - interactionUniforms.uHold.value) * 0.18;
        interactionUniforms.uActive.value += ((props.pointerActive ? 1 : 0) - interactionUniforms.uActive.value) * 0.14;
        interactionUniforms.uEffect.value = effect;
        interactionUniforms.uAct.value = act;

        plateUniforms.uReveal.value = clamp01((smoothedPhase - 0.012) / 0.15);
        plateUniforms.uTime.value = now * 0.001;
        renderer.clear();
        renderer.render(scene, camera);
        if (plateUniforms.uReveal.value < 1) {
          renderer.clearDepth();
          renderer.render(overlayScene, overlayCamera);
        }
        if (interactionUniforms.uActive.value > 0.005 || interactionUniforms.uEffect.value > 0) {
          renderer.clearDepth();
          renderer.render(interactionScene, overlayCamera);
        }
      }
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
      const disposableMaterials = [...Object.values(materials), outlineMaterial, faintOutlineMaterial, mistMaterial, plateMaterial, interactionMaterial];
      geometries.forEach((geometry) => geometry.dispose());
      disposableMaterials.forEach((material) => material.dispose());
      gradientMap.dispose();
      facadeLight.dispose();
      facadeMid.dispose();
      referenceTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="mountain-webgl is-true-3d" style={{ opacity }} ref={hostRef} aria-hidden="true" />;
}
