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

const sceneVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying float vRelief;
  uniform sampler2D uTexture;
  uniform sampler2D uDepthMap;
  uniform float uDepth;
  uniform float uTime;
  uniform float uEffect;

  float gaussian(vec2 point, vec2 centre, vec2 spread) {
    vec2 delta = (point - centre) / spread;
    return exp(-dot(delta, delta) * 2.0);
  }

  void main() {
    vUv = uv;
    vec3 point = position;
    vec3 ink = texture2D(uTexture, uv).rgb;
    float measuredDepth = texture2D(uDepthMap, uv).r;
    float darkness = 1.0 - dot(ink, vec3(0.299, 0.587, 0.114));

    float relief = -0.28;
    relief += (1.0 - smoothstep(0.52, 0.92, uv.y)) * 0.20;
    relief += gaussian(uv, vec2(0.54, 0.49), vec2(0.15, 0.25)) * 0.33;
    relief += gaussian(uv, vec2(0.82, 0.46), vec2(0.24, 0.36)) * 0.24;
    relief += gaussian(uv, vec2(0.18, 0.24), vec2(0.18, 0.22)) * 0.22;
    relief += smoothstep(0.46, 0.03, uv.y) * 0.22;
    relief += darkness * 0.07;
    relief -= gaussian(uv, vec2(0.18, 0.78), vec2(0.21, 0.18)) * 0.13;
    relief = mix(relief, (measuredDepth - 0.43) * 1.16, 0.78);
    vRelief = relief;

    point.z += relief * uDepth;
    float cinematicWave = sin(uv.x * 13.0 + uTime * 1.2) * sin(uv.y * 9.0 - uTime) * 0.035;
    point.z += cinematicWave * uEffect;
    point.x += sin(uv.y * 7.0 + uTime * 0.7) * 0.018 * uEffect;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.0);
  }
`;

const sceneFragmentShader = /* glsl */ `
  varying vec2 vUv;
  varying float vRelief;
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uEffect;

  float hash(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec3 colour = texture2D(uTexture, vUv).rgb;
    float paper = hash(floor(vUv * vec2(980.0, 660.0)) + floor(uTime * 0.35)) - 0.5;
    colour += paper * 0.014;

    vec3 teaGrade = colour * vec3(1.10, 0.91, 0.72);
    colour = mix(colour, teaGrade, uEffect * 0.58);
    colour *= 1.0 + vRelief * 0.07;

    vec2 centred = vUv - 0.5;
    float vignette = smoothstep(0.84, 0.24, dot(centred, centred));
    colour *= mix(0.86, 1.04, vignette);
    gl_FragColor = vec4(colour, 1.0);
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
    for (int octave = 0; octave < 5; octave++) {
      value += noise(point) * amplitude;
      point = point * 2.04 + vec2(17.7, 9.2);
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
    float fibre = fbm(vec2(angle * 1.7 + uTime * 0.045, distanceToPointer * 24.0 - uTime * 0.07));
    float radius = mix(0.052, 0.122, uHold);
    float irregularEdge = radius + (fibre - 0.5) * mix(0.014, 0.032, uHold);
    float inkCore = smoothstep(irregularEdge + 0.006, irregularEdge - 0.007, distanceToPointer);
    float wetEdge = smoothstep(irregularEdge + 0.025, irregularEdge + 0.002, distanceToPointer) - inkCore * 0.28;

    float droplets = 0.0;
    for (int index = 0; index < 14; index++) {
      float fi = float(index);
      float seed = hash(vec2(fi, 9.7));
      float dropAngle = fi * 2.39996 + seed;
      float dropDistance = radius * (1.28 + seed * 0.92 + uHold * 0.24);
      vec2 dropCentre = vec2(cos(dropAngle), sin(dropAngle)) * dropDistance;
      float dropRadius = mix(0.0022, 0.0065, hash(vec2(fi, 3.1))) * (0.45 + uHold);
      droplets += smoothstep(dropRadius, dropRadius * 0.35, length(point - dropCentre));
    }

    float capillary = smoothstep(0.009, 0.0, abs(sin(angle * 7.0 + fibre * 4.0)) * 0.012 + abs(distanceToPointer - radius * 1.32));
    capillary *= smoothstep(radius * 1.9, radius * 1.04, distanceToPointer) * uHold;

    vec3 colour = vec3(0.025, 0.038, 0.030);
    float alpha = (inkCore * 0.80 + wetEdge * 0.30 + droplets * 0.68 + capillary * 0.30) * uActive;

    if (uEffectTime >= 0.0) {
      float enter = smoothstep(0.0, 0.36, uEffectTime);
      float leave = 1.0 - smoothstep(3.35, 4.15, uEffectTime);
      float envelope = enter * leave;
      float fall = smoothstep(0.0, 1.18, uEffectTime);
      float streamX = 0.5 + sin(vUv.y * 7.5 + uEffectTime * 1.6) * 0.055;
      float streamWidth = mix(0.018, 0.078, smoothstep(0.0, 0.75, uEffectTime));
      float stream = smoothstep(streamWidth, streamWidth * 0.22, abs(vUv.x - streamX));
      stream *= smoothstep(1.08 - fall * 1.48, 1.18 - fall * 1.48, vUv.y);
      stream *= 1.0 - smoothstep(-0.22 - fall, 0.02 - fall, vUv.y);

      float steamNoise = fbm(vec2(vUv.x * 5.2 + sin(vUv.y * 8.0) * 0.18, vUv.y * 3.4 - uEffectTime * 0.52));
      float steam = smoothstep(0.52, 0.78, steamNoise);
      steam *= smoothstep(0.58, 0.12, abs(vUv.x - 0.5));
      steam *= smoothstep(0.55, 1.0, uEffectTime) * leave;

      float wave = abs(length((vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0)) - uEffectTime * 0.25);
      float shockwave = smoothstep(0.025, 0.0, wave) * leave;
      vec3 teaColour = vec3(0.36, 0.17, 0.075);
      vec3 steamColour = vec3(0.92, 0.86, 0.72);
      colour = mix(colour, teaColour, stream * 0.88);
      colour = mix(colour, steamColour, steam * 0.48);
      alpha = max(alpha * leave, stream * 0.82 * envelope + steam * 0.26 + shockwave * 0.25);
      alpha += envelope * 0.075;
    }

    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 0.94));
  }
`;

const smoothEnvelope = (time: number) => {
  const enter = Math.min(1, Math.max(0, time / 0.48));
  const exit = 1 - Math.min(1, Math.max(0, (time - 3.25) / 0.85));
  return enter * enter * (3 - 2 * enter) * exit;
};

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
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 20);
    camera.position.set(0, 0, 3.75);

    const geometry = new THREE.PlaneGeometry(2, 2, lowPower ? 92 : 156, lowPower ? 62 : 104);
    const texture = new THREE.Texture();
    const depthTexture = new THREE.Texture();
    const sceneUniforms = {
      uTexture: { value: texture },
      uDepthMap: { value: depthTexture },
      uDepth: { value: 0.78 },
      uTime: { value: 0 },
      uEffect: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms: sceneUniforms,
      vertexShader: sceneVertexShader,
      fragmentShader: sceneFragmentShader,
      side: THREE.DoubleSide,
    });
    material.visible = false;
    const panorama = new THREE.Mesh(geometry, material);
    scene.add(panorama);

    const textureLoader = new THREE.TextureLoader();
    let texturesReady = 0;
    const revealWhenReady = () => {
      texturesReady += 1;
      if (texturesReady === 2) material.visible = true;
    };

    textureLoader.load("/ink/scene-02-street-crafts.webp", (loaded) => {
      if (disposed) {
        loaded.dispose();
        return;
      }
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.minFilter = THREE.LinearMipmapLinearFilter;
      loaded.magFilter = THREE.LinearFilter;
      loaded.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      sceneUniforms.uTexture.value = loaded;
      texture.dispose();
      revealWhenReady();
    });
    textureLoader.load("/ink/scene-02-depth.png", (loaded) => {
      if (disposed) {
        loaded.dispose();
        return;
      }
      loaded.colorSpace = THREE.NoColorSpace;
      loaded.minFilter = THREE.LinearFilter;
      loaded.magFilter = THREE.LinearFilter;
      sceneUniforms.uDepthMap.value = loaded;
      depthTexture.dispose();
      revealWhenReady();
    });

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
    const overlay = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), overlayMaterial);
    overlayScene.add(overlay);

    const pointer = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);
    const pointerTarget = pointer.clone();
    const onPointerMove = (event: PointerEvent) => {
      pointerTarget.set(event.clientX, window.innerHeight - event.clientY);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const resize = () => {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.2 : 1.65));
      renderer.setSize(width, height, false);
      overlayUniforms.uResolution.value.set(width, height);

      const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      const viewWidth = viewHeight * camera.aspect;
      const imageAspect = 1.5;
      const planeWidth = Math.max(viewWidth, viewHeight * imageAspect) * 1.18;
      const planeHeight = Math.max(viewHeight, viewWidth / imageAspect) * 1.18;
      panorama.scale.set(planeWidth / 2, planeHeight / 2, 1);
    };
    resize();
    window.addEventListener("resize", resize);

    const render = (now: number) => {
      if (disposed) return;
      const props = propsRef.current;
      const seconds = now * 0.001;
      pointer.lerp(pointerTarget, props.reducedMotion ? 1 : 0.16);

      let effectTime = -1;
      let effect = 0;
      if (effectStartedRef.current >= 0) {
        effectTime = (now - effectStartedRef.current) / 1000;
        if (effectTime <= 4.2) effect = smoothEnvelope(effectTime);
        else effectStartedRef.current = -1;
      }

      const pointerX = pointer.x / Math.max(1, window.innerWidth) - 0.5;
      const pointerY = pointer.y / Math.max(1, window.innerHeight) - 0.5;
      const drift = props.reducedMotion ? 0 : props.cameraPhase;
      camera.position.x = Math.sin(drift * 0.73) * 0.21 + pointerX * 0.45 + effect * 0.09;
      camera.position.y = Math.cos(drift * 0.51) * 0.075 + pointerY * 0.18 - effect * 0.035;
      camera.position.z = 3.75 - effect * 0.52;
      camera.rotation.z = props.reducedMotion ? 0 : Math.sin(drift * 0.38) * 0.009;
      camera.lookAt(pointerX * 0.16, pointerY * 0.08, 0.02 + effect * 0.08);

      sceneUniforms.uTime.value = seconds;
      sceneUniforms.uEffect.value = effect;
      overlayUniforms.uTime.value = seconds;
      overlayUniforms.uPointer.value.copy(pointer);
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
      geometry.dispose();
      material.dispose();
      sceneUniforms.uTexture.value.dispose();
      sceneUniforms.uDepthMap.value.dispose();
      overlay.geometry.dispose();
      overlayMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="milk-tea-webgl" style={{ opacity }} ref={hostRef} aria-hidden="true" />;
}
