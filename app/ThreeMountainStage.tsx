"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type MountainStageProps = {
  opacity: number;
  cameraPhase: number;
  pointerActive: boolean;
  holdProgress: number;
  effectKey: number;
  reducedMotion: boolean;
};

type InkMaterial = THREE.ShaderMaterial & {
  uniforms: {
    uMap: { value: THREE.Texture };
    uOpacity: { value: number };
    uReveal: { value: number };
    uExit: { value: number };
    uLayer: { value: number };
    uTransition: { value: number };
    uTime: { value: number };
    uDark: { value: number };
  };
};

type ActStage = {
  group: THREE.Object3D;
  materials: InkMaterial[];
  camera: THREE.Vector3[];
  target: THREE.Vector3[];
};

const assetPrefix = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const assetUrl = (path: string) => `${assetPrefix}${path}`;

const scenePaths = [
  "/ink/scene-01-mountain-city.webp",
  "/ink/scene-02-street-crafts.webp",
  "/ink/scene-03-estate-night.webp",
  "/ink/scene-04-harbour-port.webp",
  "/ink/scene-05-tsing-yi-opera.webp",
  "/ink/scene-06-mooncake-home.webp",
];
const actTexture = [0, 1, 1, 2, 2, 3, 4, 4, 5];
const darkActs = [false, false, false, true, true, true, true, true, false];

const scrollVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPosition;
  uniform float uTime;
  uniform float uLayer;

  void main() {
    vUv = uv;
    vec3 point = position;
    float breath = sin((uv.x * 3.7 + uv.y * 2.1) * 3.14159 + uTime * 0.17);
    point.z += breath * (0.003 + uLayer * 0.004);
    vPosition = point;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.0);
  }
`;

const scrollFragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vPosition;
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uReveal;
  uniform float uExit;
  uniform float uLayer;
  uniform float uTransition;
  uniform float uTime;
  uniform float uDark;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amp = 0.52;
    for (int i = 0; i < 5; i++) {
      value += noise(p) * amp;
      p = p * mat2(1.72, -1.08, 1.08, 1.72) + vec2(7.4, 3.1);
      amp *= 0.49;
    }
    return value;
  }

  float transitionField(vec2 uv) {
    float mode = mod(uTransition, 6.0);
    vec2 p = uv;
    if (mode < 0.5) p = vec2(uv.x * 1.3, uv.y * 0.72);
    else if (mode < 1.5) p = vec2(uv.y * 0.84, uv.x * 1.6);
    else if (mode < 2.5) p = vec2(length(uv - 0.5) * 1.7, atan(uv.y - 0.5, uv.x - 0.5) * 0.2);
    else if (mode < 3.5) p = vec2(uv.x + uv.y * 0.46, uv.y * 0.9);
    else if (mode < 4.5) p = vec2(uv.x * 0.72, uv.y + sin(uv.x * 9.0) * 0.08);
    else p = vec2(uv.x + sin(uv.y * 8.0) * 0.11, uv.y);
    return fbm(p * 4.2 + vec2(uTransition * 1.7, -uTime * 0.012)) * 0.76 + uv.x * 0.13 + (1.0 - uv.y) * 0.11;
  }

  void main() {
    vec4 source = texture2D(uMap, vUv);
    float luma = dot(source.rgb, vec3(0.299, 0.587, 0.114));
    float ink = smoothstep(0.94, 0.09, luma);
    float paperNoise = noise(gl_FragCoord.xy * 0.38 + vec2(uTransition * 13.0, 0.0));

    float layerMask = 1.0;
    if (uLayer > 0.5 && uLayer < 1.5) {
      float middleBand = smoothstep(0.02, 0.38, vUv.y) * smoothstep(1.02, 0.48, vUv.y);
      layerMask = ink * middleBand * (0.28 + fbm(vUv * 5.4) * 0.42);
    } else if (uLayer > 1.5) {
      float nearBand = smoothstep(0.18, 0.92, 1.0 - vUv.y);
      float sideWeight = smoothstep(0.0, 0.72, abs(vUv.x - 0.5) * 1.7);
      layerMask = ink * (0.22 + nearBand * 0.52 + sideWeight * 0.18);
      layerMask *= smoothstep(0.18, 0.82, fbm(vUv * 7.2 + 3.0));
    }

    float field = transitionField(vUv);
    float revealThreshold = 1.05 - uReveal * 1.25;
    float reveal = uReveal > 0.995 ? 1.0 : smoothstep(revealThreshold - 0.08, revealThreshold + 0.08, field);
    float exitThreshold = 1.08 - uExit * 1.3;
    float dissolve = uExit < 0.005 ? 1.0 : 1.0 - smoothstep(exitThreshold - 0.06, exitThreshold + 0.08, field);
    float edge = 1.0 - smoothstep(0.0, 0.028, abs(field - revealThreshold));

    vec3 paper = uDark > 0.5 ? vec3(0.055, 0.061, 0.057) : vec3(0.925, 0.905, 0.845);
    vec3 colour = mix(source.rgb, paper, (paperNoise - 0.5) * 0.025);
    colour = mix(colour, vec3(0.015, 0.022, 0.018), edge * 0.08);
    float layerOpacity = uLayer < 0.5 ? 1.0 : (uLayer < 1.5 ? 0.34 : 0.25);
    float alpha = uOpacity * reveal * dissolve * layerMask * layerOpacity;
    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 1.0));
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
  uniform vec2 uOrigin;
  uniform float uTime;
  uniform float uHold;
  uniform float uActive;
  uniform float uBurst;
  uniform float uAct;
  uniform float uTransitionFog;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.54;
    for (int i = 0; i < 5; i++) { v += noise(p) * a; p = p * mat2(1.66, -1.12, 1.12, 1.66) + 7.3; a *= 0.49; }
    return v;
  }

  void main() {
    float shortest = min(uResolution.x, uResolution.y);
    vec2 frag = gl_FragCoord.xy;
    vec2 point = (frag - uPointer * uResolution) / shortest;
    float distanceToPointer = length(point);
    float angle = atan(point.y, point.x);
    float fibres = fbm(vec2(angle * 2.8 + uAct, distanceToPointer * 32.0 - uTime * 0.07));
    float radius = 0.046 + uHold * 0.17 + (fibres - 0.5) * (0.018 + uHold * 0.038);
    float pool = smoothstep(radius + 0.012, radius - 0.01, distanceToPointer) * uActive;
    float wet = (smoothstep(radius + 0.055, radius, distanceToPointer) - pool * 0.62) * uActive;
    float capillary = pow(max(0.0, sin(angle * (9.0 + mod(uAct, 5.0)) + fibres * 9.0)), 15.0);
    capillary *= smoothstep(radius * 1.85, radius * 0.62, distanceToPointer) * uActive * (0.25 + uHold * 0.75);

    float droplets = 0.0;
    for (int i = 0; i < 20; i++) {
      float fi = float(i);
      float seed = hash(vec2(fi, 8.4 + uAct));
      float a = fi * 2.39996 + seed;
      vec2 centre = vec2(cos(a), sin(a)) * radius * (1.18 + seed * 0.98);
      float r = mix(0.0015, 0.0062, hash(vec2(fi, 2.7)));
      droplets += smoothstep(r, r * 0.28, length(point - centre));
    }

    vec2 burstPoint = (frag - uOrigin * uResolution) / shortest;
    float burstDistance = length(burstPoint);
    float burstAngle = atan(burstPoint.y, burstPoint.x);
    float burstNoise = fbm(burstPoint * (3.2 + mod(uAct, 4.0)) - vec2(uTime * 0.085, uTime * 0.035));
    float burstRadius = uBurst * 1.48 + (burstNoise - 0.5) * (0.08 + uBurst * 0.24);
    float wash = smoothstep(burstRadius + 0.09, burstRadius - 0.08, burstDistance);
    float life = smoothstep(0.0, 0.09, uBurst) * (1.0 - smoothstep(0.72, 1.0, uBurst));
    float ring = smoothstep(0.052, 0.005, abs(burstDistance - uBurst * 1.23 - (burstNoise - 0.5) * 0.11));
    float rays = pow(max(0.0, sin(burstAngle * (8.0 + mod(uAct * 3.0, 7.0)) + burstNoise * 11.0)), 17.0);
    rays *= smoothstep(burstRadius + 0.25, burstRadius - 0.04, burstDistance);

    float fogNoise = fbm(vUv * vec2(4.0, 2.5) + vec2(uTime * 0.025, -uTime * 0.018 + uAct));
    float fogBand = smoothstep(0.30, 0.78, fogNoise) * uTransitionFog;
    vec3 colour = mod(uAct, 4.0) > 1.5 ? vec3(0.88, 0.84, 0.74) : vec3(0.012, 0.018, 0.015);
    float alpha = pool * 0.72 + wet * 0.24 + capillary * 0.33 + droplets * 0.5;
    alpha = max(alpha, (wash * 0.76 + ring * 0.58 + rays * 0.23) * life);
    alpha = max(alpha, fogBand * 0.34);
    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 0.92));
  }
`;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => {
  const amount = clamp01(value);
  return amount * amount * (3 - 2 * amount);
};

function samplePath(points: THREE.Vector3[], amount: number, target: THREE.Vector3) {
  const t = ease(amount);
  if (t < 0.5) target.lerpVectors(points[0], points[1], ease(t * 2));
  else target.lerpVectors(points[1], points[2], ease((t - 0.5) * 2));
  return target;
}

function fogTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 64);
    gradient.addColorStop(0, "rgba(236,231,216,.72)");
    gradient.addColorStop(0.42, "rgba(218,214,202,.34)");
    gradient.addColorStop(1, "rgba(205,201,190,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(canvas);
}

export default function ThreeMountainStage({ opacity, cameraPhase, pointerActive, holdProgress, effectKey, reducedMotion }: MountainStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ cameraPhase, pointerActive, holdProgress, reducedMotion });
  const effectRef = useRef(effectKey);

  useEffect(() => {
    propsRef.current = { cameraPhase, pointerActive, holdProgress, reducedMotion };
  }, [cameraPhase, pointerActive, holdProgress, reducedMotion]);

  useEffect(() => { effectRef.current = effectKey; }, [effectKey]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
    } catch {
      host.classList.add("is-unavailable");
      document.documentElement.classList.add("webgl-unavailable");
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0xece7d9, 1);
    renderer.autoClear = false;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xece7d9);
    scene.fog = new THREE.FogExp2(0xded8ca, 0.018);
    const camera = new THREE.PerspectiveCamera(47, 1, 0.1, 80);
    const overlayScene = new THREE.Scene();
    const overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const textureLoader = new THREE.TextureLoader();
    const textures = scenePaths.map((path) => {
      const texture = textureLoader.load(assetUrl(path));
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return texture;
    });

    const overlayUniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uOrigin: { value: new THREE.Vector2(0.5, 0.5) },
      uTime: { value: 0 },
      uHold: { value: 0 },
      uActive: { value: 0 },
      uBurst: { value: 0 },
      uAct: { value: 0 },
      uTransitionFog: { value: 0 },
    };
    const overlayGeometry = new THREE.PlaneGeometry(2, 2);
    const overlayMaterial = new THREE.ShaderMaterial({
      uniforms: overlayUniforms,
      vertexShader: overlayVertexShader,
      fragmentShader: overlayFragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    overlayScene.add(new THREE.Mesh(overlayGeometry, overlayMaterial));

    const fogGeometry = new THREE.BufferGeometry();
    const fogPositions = new Float32Array(420 * 3);
    for (let index = 0; index < 420; index += 1) {
      fogPositions[index * 3] = (Math.random() - 0.5) * 18;
      fogPositions[index * 3 + 1] = (Math.random() - 0.5) * 9;
      fogPositions[index * 3 + 2] = 0.8 + Math.random() * 5.5;
    }
    fogGeometry.setAttribute("position", new THREE.BufferAttribute(fogPositions, 3));
    const fogMap = fogTexture();
    const fogMaterial = new THREE.PointsMaterial({ map: fogMap, color: 0xe3decf, size: 0.72, transparent: true, opacity: 0.12, depthWrite: false, sizeAttenuation: true });
    const fog = new THREE.Points(fogGeometry, fogMaterial);
    fog.renderOrder = 999;
    scene.add(fog);

    const stages: ActStage[] = [];
    let modelRoot: THREE.Object3D | null = null;
    let modelReady = false;
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      assetUrl("/models/ink-scroll-world.glb"),
      (gltf) => {
        modelRoot = gltf.scene;
        scene.add(modelRoot);
        for (let actIndex = 0; actIndex < 9; actIndex += 1) {
          const number = String(actIndex + 1).padStart(2, "0");
          const group = modelRoot.getObjectByName(`Act${number}`) ?? modelRoot;
          const materials: InkMaterial[] = [];
          for (const [layerIndex, layerName] of ["Base", "Mid", "Near"].entries()) {
            const mesh = modelRoot.getObjectByName(`Act${number}_${layerName}`) as THREE.Mesh | undefined;
            if (!mesh) continue;
            const material = new THREE.ShaderMaterial({
              uniforms: {
                uMap: { value: textures[actTexture[actIndex]] },
                uOpacity: { value: 0 },
                uReveal: { value: 0 },
                uExit: { value: 0 },
                uLayer: { value: layerIndex },
                uTransition: { value: actIndex },
                uTime: { value: 0 },
                uDark: { value: darkActs[actIndex] ? 1 : 0 },
              },
              vertexShader: scrollVertexShader,
              fragmentShader: scrollFragmentShader,
              transparent: true,
              depthTest: false,
              depthWrite: false,
              side: THREE.DoubleSide,
            }) as InkMaterial;
            mesh.material = material;
            mesh.frustumCulled = false;
            mesh.renderOrder = actIndex * 4 + layerIndex;
            materials.push(material);
          }
          const cameraPoints = ["Start", "Mid", "End"].map((key) => modelRoot!.getObjectByName(`Cam${number}_${key}`)?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3(0, 0, 5));
          const targetPoints = ["Start", "Mid", "End"].map((key) => modelRoot!.getObjectByName(`Target${number}_${key}`)?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3());
          stages.push({ group, materials, camera: cameraPoints, target: targetPoints });
        }
        modelReady = stages.length === 9;
      },
      undefined,
      () => {
        host.classList.add("is-unavailable");
        document.documentElement.classList.add("webgl-unavailable");
      },
    );

    const pointer = new THREE.Vector2(0.5, 0.5);
    const pointerTarget = pointer.clone();
    const cameraPosition = new THREE.Vector3();
    const cameraTarget = new THREE.Vector3();
    const transitionCamera = new THREE.Vector3();
    const transitionTarget = new THREE.Vector3();
    const drawingBuffer = new THREE.Vector2();
    let disposed = false;
    let visible = !document.hidden;
    let frame = 0;
    let seenEffect = effectRef.current;
    let effectStarted = -1;

    const onPointerMove = (event: PointerEvent) => {
      pointerTarget.set(event.clientX / Math.max(1, window.innerWidth), 1 - event.clientY / Math.max(1, window.innerHeight));
    };
    const onPointerEnter = (event: PointerEvent) => onPointerMove(event);
    const onVisibility = () => { visible = !document.hidden; };
    const resize = () => {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      const isMobile = width <= 900;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = isMobile ? 56 : 47;
      camera.updateProjectionMatrix();
      renderer.getDrawingBufferSize(drawingBuffer);
      overlayUniforms.uResolution.value.copy(drawingBuffer);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerenter", onPointerEnter, { passive: true });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    resize();

    const draw = (now: number) => {
      if (disposed) return;
      if (!visible) {
        frame = window.requestAnimationFrame(draw);
        return;
      }
      const props = propsRef.current;
      const phase = Math.min(8.999, Math.max(0, props.cameraPhase));
      const act = Math.min(8, Math.floor(phase));
      const amount = props.reducedMotion ? 0.34 : phase - act;
      const nextAct = Math.min(8, act + 1);
      const transition = nextAct === act ? 0 : ease((amount - 0.69) / 0.31);

      pointer.lerp(pointerTarget, props.reducedMotion ? 1 : 0.12);
      overlayUniforms.uPointer.value.copy(pointer);
      overlayUniforms.uTime.value = now * 0.001;
      overlayUniforms.uAct.value = act;
      overlayUniforms.uActive.value += ((props.pointerActive ? 1 : 0) - overlayUniforms.uActive.value) * 0.16;
      overlayUniforms.uHold.value += (props.holdProgress - overlayUniforms.uHold.value) * 0.19;
      overlayUniforms.uTransitionFog.value += ((transition > 0 ? Math.sin(transition * Math.PI) : 0) - overlayUniforms.uTransitionFog.value) * 0.11;

      if (effectRef.current !== seenEffect) {
        seenEffect = effectRef.current;
        effectStarted = now;
        overlayUniforms.uOrigin.value.copy(pointer);
      }
      overlayUniforms.uBurst.value = effectStarted < 0 ? 0 : clamp01((now - effectStarted) / 3000);

      if (modelReady) {
        for (let index = 0; index < stages.length; index += 1) {
          const isCurrent = index === act;
          const isIncoming = index === nextAct && transition > 0;
          stages[index].group.visible = isCurrent || isIncoming;
          for (const material of stages[index].materials) {
            material.uniforms.uTime.value = now * 0.001;
            material.uniforms.uOpacity.value = isCurrent || isIncoming ? 1 : 0;
            material.uniforms.uReveal.value = isCurrent ? 1 : isIncoming ? transition : 0;
            material.uniforms.uExit.value = isCurrent ? transition * 0.2 : 0;
          }
        }

        const localAmount = transition > 0 ? 1 : amount / 0.69;
        samplePath(stages[act].camera, localAmount, cameraPosition);
        samplePath(stages[act].target, localAmount, cameraTarget);
        if (transition > 0) {
          transitionCamera.copy(stages[nextAct].camera[0]);
          transitionTarget.copy(stages[nextAct].target[0]);
          cameraPosition.lerp(transitionCamera, transition);
          cameraTarget.lerp(transitionTarget, transition);
        }
        if (!props.reducedMotion) {
          cameraPosition.x += (pointer.x - 0.5) * 0.24;
          cameraPosition.y += (pointer.y - 0.5) * 0.14;
        }
        camera.position.lerp(cameraPosition, props.reducedMotion ? 1 : 0.13);
        camera.lookAt(cameraTarget);
      }

      fog.rotation.z = now * 0.000012;
      fog.position.x = Math.sin(now * 0.00005 + act) * 0.45;
      fogMaterial.opacity = 0.09 + overlayUniforms.uTransitionFog.value * 0.36 + (act === 0 || act === 5 ? 0.04 : 0);

      renderer.clear();
      renderer.render(scene, camera);
      renderer.clearDepth();
      renderer.render(overlayScene, overlayCamera);
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerenter", onPointerEnter);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      stages.forEach((stage) => stage.materials.forEach((material) => material.dispose()));
      textures.forEach((texture) => texture.dispose());
      overlayGeometry.dispose();
      overlayMaterial.dispose();
      fogGeometry.dispose();
      fogMaterial.dispose();
      fogMap.dispose();
      if (modelRoot) scene.remove(modelRoot);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="mountain-webgl blender-ink-world" style={{ opacity }} ref={hostRef} aria-hidden="true" data-blender-world="nine-act-scroll" />;
}
