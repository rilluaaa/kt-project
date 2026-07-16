"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type MilkTeaStageProps = {
  opacity: number;
  cameraPhase: number;
  pointerActive: boolean;
  holdProgress: number;
  effectKey: number;
  reducedMotion: boolean;
};

const keyedVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const keyedFragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uMap;
  uniform vec2 uGrid;
  uniform float uFrame;
  uniform float uTea;

  vec2 frameUv(float frame) {
    float columns = uGrid.x;
    float rows = uGrid.y;
    float index = mod(frame, columns * rows);
    float column = mod(index, columns);
    float rowFromTop = floor(index / columns);
    return vec2((vUv.x + column) / columns, (vUv.y + rows - 1.0 - rowFromTop) / rows);
  }

  void main() {
    float first = floor(uFrame);
    float blend = smoothstep(0.36, 0.64, fract(uFrame));
    vec4 a = texture2D(uMap, frameUv(first));
    vec4 b = texture2D(uMap, frameUv(first + 1.0));
    vec3 colour = mix(a.rgb, b.rgb, blend);

    float lightness = dot(colour, vec3(0.299, 0.587, 0.114));
    float chroma = max(colour.r, max(colour.g, colour.b)) - min(colour.r, min(colour.g, colour.b));
    float paper = smoothstep(0.77, 0.955, lightness) * (1.0 - smoothstep(0.025, 0.13, chroma));
    float alpha = 1.0 - paper;
    alpha = smoothstep(0.035, 0.82, alpha);
    if (alpha < 0.055) discard;

    vec3 teaGrade = colour * vec3(1.08, 0.92, 0.76);
    colour = mix(colour, teaGrade, uTea * 0.42);
    gl_FragColor = vec4(colour, alpha * 0.98);
  }
`;

const overlayVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const overlayFragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uTime;
  uniform float uHold;
  uniform float uActive;
  uniform float uEffectTime;

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
    float amplitude = 0.52;
    for (int octave = 0; octave < 6; octave++) {
      value += noise(point) * amplitude;
      point = point * 2.03 + vec2(17.7, 9.2);
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 frag = gl_FragCoord.xy;
    float shortest = min(uResolution.x, uResolution.y);
    vec2 point = (frag - uPointer) / shortest;
    float distanceToPointer = length(point);
    float angle = atan(point.y, point.x);

    float fibres = fbm(vec2(angle * 1.85 + uTime * 0.035, distanceToPointer * 27.0 - uTime * 0.06));
    float veins = fbm(vec2(angle * 6.0 - uTime * 0.02, distanceToPointer * 58.0));
    float radius = mix(0.052, 0.148, uHold);
    float irregularEdge = radius + (fibres - 0.5) * mix(0.016, 0.046, uHold) + (veins - 0.5) * 0.008;
    float inkCore = smoothstep(irregularEdge + 0.009, irregularEdge - 0.008, distanceToPointer);
    float wetEdge = smoothstep(irregularEdge + 0.038, irregularEdge + 0.002, distanceToPointer) - inkCore * 0.4;

    float droplets = 0.0;
    for (int index = 0; index < 22; index++) {
      float fi = float(index);
      float seed = hash(vec2(fi, 9.7));
      float dropAngle = fi * 2.39996 + seed * 1.7;
      float dropDistance = radius * (1.16 + seed * 1.24 + uHold * 0.34);
      vec2 dropCentre = vec2(cos(dropAngle), sin(dropAngle)) * dropDistance;
      float dropRadius = mix(0.0018, 0.0078, hash(vec2(fi, 3.1))) * (0.5 + uHold);
      droplets += smoothstep(dropRadius, dropRadius * 0.32, length(point - dropCentre));
    }

    float capillary = smoothstep(0.012, 0.0, abs(sin(angle * 9.0 + fibres * 5.0)) * 0.015 + abs(distanceToPointer - radius * 1.34));
    capillary *= smoothstep(radius * 2.15, radius * 1.04, distanceToPointer) * uHold;

    vec3 colour = vec3(0.018, 0.026, 0.021);
    float alpha = (inkCore * 0.84 + wetEdge * 0.24 + droplets * 0.66 + capillary * 0.34) * uActive;

    if (uEffectTime >= 0.0) {
      float enter = smoothstep(0.0, 0.38, uEffectTime);
      float leave = 1.0 - smoothstep(3.55, 4.45, uEffectTime);
      float envelope = enter * leave;
      vec2 aspectPoint = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
      float bloomNoise = fbm(aspectPoint * 3.8 - vec2(uEffectTime * 0.18, uEffectTime * 0.12));
      float bloomRadius = uEffectTime * 0.43;
      float bloomEdge = bloomRadius + (bloomNoise - 0.5) * 0.26;
      float bloom = smoothstep(bloomEdge + 0.08, bloomEdge - 0.06, length(aspectPoint));

      float teaFall = smoothstep(0.0, 1.22, uEffectTime);
      float streamX = 0.5 + sin(vUv.y * 7.5 + uEffectTime * 1.6) * 0.05;
      float streamWidth = mix(0.012, 0.082, smoothstep(0.0, 0.8, uEffectTime));
      float stream = smoothstep(streamWidth, streamWidth * 0.2, abs(vUv.x - streamX));
      stream *= smoothstep(1.08 - teaFall * 1.5, 1.18 - teaFall * 1.5, vUv.y);
      stream *= 1.0 - smoothstep(-0.25 - teaFall, 0.03 - teaFall, vUv.y);

      float steamNoise = fbm(vec2(vUv.x * 5.0 + sin(vUv.y * 8.0) * 0.16, vUv.y * 3.4 - uEffectTime * 0.5));
      float steam = smoothstep(0.52, 0.79, steamNoise) * smoothstep(0.62, 0.08, abs(vUv.x - 0.5));
      steam *= smoothstep(0.48, 1.0, uEffectTime) * leave;

      vec3 teaColour = vec3(0.35, 0.16, 0.062);
      vec3 steamColour = vec3(0.92, 0.86, 0.72);
      colour = mix(colour, teaColour, stream * 0.9 + bloom * 0.13);
      colour = mix(colour, steamColour, steam * 0.5);
      alpha = max(alpha * leave, bloom * 0.33 * envelope + stream * 0.84 * envelope + steam * 0.24);
    }

    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 0.95));
  }
`;

type SpriteRecord = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  material: THREE.ShaderMaterial;
};

const ease = (value: number) => value * value * (3 - 2 * value);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export default function ThreeMilkTeaStage({ opacity, cameraPhase, pointerActive, holdProgress, effectKey, reducedMotion }: MilkTeaStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ opacity, cameraPhase, pointerActive, holdProgress, reducedMotion });
  const effectStartedRef = useRef(-1);

  useEffect(() => {
    propsRef.current = { opacity, cameraPhase, pointerActive, holdProgress, reducedMotion };
  }, [opacity, cameraPhase, pointerActive, holdProgress, reducedMotion]);

  useEffect(() => {
    if (effectKey > 0) effectStartedRef.current = performance.now();
  }, [effectKey]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let frame = 0;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch {
      host.classList.add("is-unavailable");
      host.closest(".experience")?.classList.add("webgl-unavailable");
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.autoClear = false;
    renderer.setClearColor(0xeae3d5, 1);
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xded6c7, 0.027);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.08, 70);
    const world = new THREE.Group();
    scene.add(world);

    const textureLoader = new THREE.TextureLoader();
    const textures: THREE.Texture[] = [];
    const materials: THREE.Material[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const sprites: SpriteRecord[] = [];

    const loadTexture = (url: string, repeat = false) => {
      const texture = textureLoader.load(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      if (repeat) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
      }
      textures.push(texture);
      return texture;
    };

    const keyMaterial = (texture: THREE.Texture, columns = 1, rows = 1) => {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: texture },
          uGrid: { value: new THREE.Vector2(columns, rows) },
          uFrame: { value: 0 },
          uTea: { value: 0 },
        },
        vertexShader: keyedVertexShader,
        fragmentShader: keyedFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true,
      });
      materials.push(material);
      return material;
    };

    const addKeyedPlane = (
      url: string,
      size: [number, number],
      position: [number, number, number],
      rotation: [number, number, number] = [0, 0, 0],
      grid: [number, number] = [1, 1],
      isSprite = false,
    ) => {
      const geometry = new THREE.PlaneGeometry(size[0], size[1]);
      geometries.push(geometry);
      const material = keyMaterial(loadTexture(url), grid[0], grid[1]);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      mesh.renderOrder = isSprite ? 4 : 2;
      world.add(mesh);
      if (isSprite) sprites.push({ mesh, material });
      return mesh;
    };

    const groundTexture = loadTexture("/ink/milk-tea/ground-texture.jpg", true);
    groundTexture.repeat.set(2.2, 2.2);
    const groundMaterial = new THREE.MeshBasicMaterial({ map: groundTexture, color: 0xbeb8ae });
    materials.push(groundMaterial);
    const groundGeometry = new THREE.PlaneGeometry(32, 32, 1, 1);
    geometries.push(groundGeometry);
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    world.add(ground);

    const panoramaTexture = loadTexture("/ink/milk-tea/distant-panorama.jpg");
    const panoramaMaterial = new THREE.MeshBasicMaterial({ map: panoramaTexture, side: THREE.BackSide, color: 0xe1d9cc });
    materials.push(panoramaMaterial);
    const panoramaGeometry = new THREE.CylinderGeometry(19, 19, 9.5, lowPower ? 36 : 72, 1, true, THREE.MathUtils.degToRad(-150), THREE.MathUtils.degToRad(300));
    geometries.push(panoramaGeometry);
    const panorama = new THREE.Mesh(panoramaGeometry, panoramaMaterial);
    panorama.position.y = 4.35;
    panorama.rotation.y = THREE.MathUtils.degToRad(8);
    world.add(panorama);

    const shellGeometry = new THREE.BoxGeometry(7.05, 3.45, 4.15);
    geometries.push(shellGeometry);
    const shellMaterial = new THREE.MeshStandardMaterial({ color: 0xc8c0b1, roughness: 1, metalness: 0 });
    materials.push(shellMaterial);
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    shell.position.set(0.65, 1.7, 0);
    world.add(shell);

    const edgesGeometry = new THREE.EdgesGeometry(shellGeometry, 34);
    geometries.push(edgesGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x393934, transparent: true, opacity: 0.35 });
    materials.push(edgesMaterial);
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    edges.position.copy(shell.position);
    world.add(edges);

    addKeyedPlane("/ink/milk-tea/building-front.jpg", [7.7, 5.13], [0.65, 2.05, 2.09]);
    addKeyedPlane("/ink/milk-tea/building-rear.jpg", [7.7, 5.13], [0.65, 2.05, -2.09], [0, Math.PI, 0]);
    addKeyedPlane("/ink/milk-tea/building-left.jpg", [4.7, 4.7], [-2.89, 2.0, 0], [0, -Math.PI / 2, 0]);
    addKeyedPlane("/ink/milk-tea/building-right.jpg", [4.7, 4.7], [4.19, 2.0, 0], [0, Math.PI / 2, 0]);
    addKeyedPlane("/ink/milk-tea/building-roof.jpg", [7.6, 5.06], [0.65, 3.44, 0], [-Math.PI / 2, 0, 0]);

    const interior = addKeyedPlane("/ink/milk-tea/interior-walls.jpg", [4.25, 2.84], [1.2, 1.55, 2.13]);
    interior.renderOrder = 3;

    addKeyedPlane("/ink/milk-tea/tea-master-turntable.jpg", [2.75, 3.67], [0.05, 1.75, 3.0], [0, 0, 0], [4, 2], true);
    addKeyedPlane("/ink/milk-tea/woodworker-turntable.jpg", [2.55, 3.4], [3.3, 1.62, 2.8], [0, 0, 0], [4, 2], true);
    addKeyedPlane("/ink/milk-tea/diners-turntable.jpg", [2.35, 3.13], [-2.2, 1.47, 2.55], [0, 0, 0], [4, 2], true);
    addKeyedPlane("/ink/milk-tea/youth-turntable.jpg", [1.9, 2.53], [-3.8, 1.2, 3.55], [0, 0, 0], [4, 2], true);
    addKeyedPlane("/ink/milk-tea/bus-turntable.jpg", [2.7, 3.6], [-5.35, 1.45, -0.2], [0, 0, 0], [4, 2], true);

    const inkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-7.2, 0.12, 4.2),
      new THREE.Vector3(-4.5, 0.18, 2.6),
      new THREE.Vector3(-2.0, 0.22, 3.3),
      new THREE.Vector3(0.1, 0.25, 3.55),
      new THREE.Vector3(2.3, 0.2, 2.4),
      new THREE.Vector3(4.8, 0.16, 0.7),
      new THREE.Vector3(6.4, 0.12, -2.5),
    ]);
    const ribbonGeometry = new THREE.TubeGeometry(inkCurve, lowPower ? 72 : 140, 0.055, 8, false);
    geometries.push(ribbonGeometry);
    const ribbonMaterial = new THREE.MeshBasicMaterial({ color: 0x111714, transparent: true, opacity: 0.72 });
    materials.push(ribbonMaterial);
    const ribbon = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
    ribbon.renderOrder = 5;
    world.add(ribbon);

    const particleCount = lowPower ? 330 : 720;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      particlePositions[index * 3] = (Math.random() - 0.5) * 18;
      particlePositions[index * 3 + 1] = Math.random() * 6.5;
      particlePositions[index * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    geometries.push(particleGeometry);
    const particleMaterial = new THREE.PointsMaterial({ color: 0x202722, size: 0.028, transparent: true, opacity: 0.16, depthWrite: false });
    materials.push(particleMaterial);
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    world.add(particles);

    scene.add(new THREE.HemisphereLight(0xf6efe2, 0x56534d, 2.2));
    const keyLight = new THREE.DirectionalLight(0xffecd1, 2.4);
    keyLight.position.set(-6, 10, 8);
    scene.add(keyLight);

    const overlayScene = new THREE.Scene();
    const overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const overlayUniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uTime: { value: 0 },
      uHold: { value: 0 },
      uActive: { value: 0 },
      uEffectTime: { value: -1 },
    };
    const overlayMaterial = new THREE.ShaderMaterial({
      uniforms: overlayUniforms,
      vertexShader: overlayVertexShader,
      fragmentShader: overlayFragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    materials.push(overlayMaterial);
    const overlayGeometry = new THREE.PlaneGeometry(2, 2);
    geometries.push(overlayGeometry);
    const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
    overlayScene.add(overlay);

    const pointerCss = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);
    const pointerTargetCss = pointerCss.clone();
    const drawingBuffer = new THREE.Vector2();
    const onPointerMove = (event: PointerEvent) => {
      pointerTargetCss.set(event.clientX, window.innerHeight - event.clientY);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const resize = () => {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.15 : 1.55));
      renderer.setSize(width, height, false);
      renderer.getDrawingBufferSize(drawingBuffer);
      overlayUniforms.uResolution.value.copy(drawingBuffer);
    };
    resize();
    window.addEventListener("resize", resize);

    const render = (now: number) => {
      if (disposed) return;
      const props = propsRef.current;
      const seconds = now * 0.001;
      pointerCss.lerp(pointerTargetCss, props.reducedMotion ? 1 : 0.15);

      let effectTime = -1;
      let effect = 0;
      if (effectStartedRef.current >= 0) {
        effectTime = (now - effectStartedRef.current) / 1000;
        if (effectTime <= 4.5) {
          const enter = clamp01(effectTime / 0.48);
          const leave = 1 - clamp01((effectTime - 3.55) / 0.9);
          effect = ease(enter) * leave;
        } else effectStartedRef.current = -1;
      }

      const rawProgress = clamp01((props.cameraPhase - 3) / 4.95);
      const progress = props.reducedMotion ? 0.08 : ease(rawProgress);
      const angle = THREE.MathUtils.degToRad(-62 + progress * 270);
      const radius = 7.8 - Math.sin(progress * Math.PI) * 1.05 - effect * 0.75;
      const pointerX = pointerCss.x / Math.max(1, window.innerWidth) - 0.5;
      const pointerY = pointerCss.y / Math.max(1, window.innerHeight) - 0.5;
      const target = new THREE.Vector3(
        THREE.MathUtils.lerp(-0.35, 1.55, progress),
        1.42 + Math.sin(progress * Math.PI) * 0.18,
        THREE.MathUtils.lerp(2.15, 0.6, progress),
      );

      camera.position.set(
        target.x + Math.sin(angle) * radius + pointerX * 0.32,
        2.0 + Math.sin(progress * Math.PI * 2.65) * 1.22 + pointerY * 0.2 + effect * 0.18,
        target.z + Math.cos(angle) * radius,
      );
      camera.lookAt(target.x + pointerX * 0.12, target.y + pointerY * 0.08, target.z);
      camera.rotateZ(Math.sin(progress * Math.PI * 2.0) * 0.018);

      sprites.forEach(({ mesh, material }) => {
        const vectorX = camera.position.x - mesh.position.x;
        const vectorZ = camera.position.z - mesh.position.z;
        let view = THREE.MathUtils.radToDeg(Math.atan2(vectorX, vectorZ)) / 45;
        view = (view % 8 + 8) % 8;
        material.uniforms.uFrame.value = view;
        material.uniforms.uTea.value = effect;
        mesh.lookAt(camera.position.x, mesh.position.y, camera.position.z);
      });

      particles.rotation.y = seconds * 0.012;
      particles.position.y = Math.sin(seconds * 0.18) * 0.12;
      ribbonMaterial.opacity = 0.58 + Math.sin(seconds * 0.9) * 0.1 + effect * 0.16;

      const pixelScaleX = drawingBuffer.x / Math.max(1, window.innerWidth);
      const pixelScaleY = drawingBuffer.y / Math.max(1, window.innerHeight);
      overlayUniforms.uTime.value = seconds;
      overlayUniforms.uPointer.value.set(pointerCss.x * pixelScaleX, pointerCss.y * pixelScaleY);
      overlayUniforms.uHold.value += (props.holdProgress - overlayUniforms.uHold.value) * 0.18;
      overlayUniforms.uActive.value += ((props.pointerActive ? 1 : 0) - overlayUniforms.uActive.value) * 0.13;
      overlayUniforms.uEffectTime.value = effectTime;

      renderer.clear();
      renderer.render(scene, camera);
      renderer.clearDepth();
      renderer.render(overlayScene, overlayCamera);
      frame = window.requestAnimationFrame(render);
    };
    frame = window.requestAnimationFrame(render);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", resize);
      textures.forEach((texture) => texture.dispose());
      materials.forEach((material) => material.dispose());
      geometries.forEach((geometry) => geometry.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="milk-tea-webgl" style={{ opacity }} ref={hostRef} aria-hidden="true" />;
}
