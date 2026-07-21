"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  transition: number;
  holdProgress: number;
  burstKey: number;
  origin: { x: number; y: number };
  scene: number;
  reducedMotion: boolean;
};

/**
 * Residual ink controls. The dye ping-pong framebuffer approach is adapted
 * for this site from the MIT-licensed WebGL Fluid Simulation by Pavel Dobryakov.
 * These values are deliberately kept together so the ink can be tuned in one place.
 */
export const INK_TRAIL_TUNING = {
  pointerLag: 0.15,
  inkAmount: 0.52,
  trailLifetime: 1.2,
  wetDepositLifetime: 2.2,
  absorptionSpeed: 0.9,
  bleedWidth: 0.045,
  dryBrushBreakup: 0.56,
  paperGrainStrength: 0.78,
  maximumOpacity: 0.65,
  curlStrength: 0.018,
  pressureIterations: 2,
  mobileQuality: 0.42,
} as const;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const simulationFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uInk;
  uniform vec2 uTexel;
  uniform vec2 uPointer;
  uniform vec2 uPreviousPointer;
  uniform vec2 uVelocity;
  uniform float uDelta;
  uniform float uInject;
  uniform float uMotion;
  uniform float uTime;
  uniform float uInkAmount;
  uniform float uTrailLifetime;
  uniform float uWetLifetime;
  uniform float uAbsorption;
  uniform float uBleedWidth;
  uniform float uBreakup;
  uniform float uMaximumOpacity;
  uniform float uCurl;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  float lineDistance(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a;
    float along = clamp(dot(p - a, ab) / max(dot(ab, ab), 0.000001), 0.0, 1.0);
    return length(p - (a + ab * along));
  }

  void main() {
    vec4 centre = texture2D(uInk, vUv);
    vec4 north = texture2D(uInk, vUv + vec2(0.0, uTexel.y));
    vec4 south = texture2D(uInk, vUv - vec2(0.0, uTexel.y));
    vec4 east = texture2D(uInk, vUv + vec2(uTexel.x, 0.0));
    vec4 west = texture2D(uInk, vUv - vec2(uTexel.x, 0.0));
    vec4 diffuse = (north + south + east + west) * 0.25;
    float bleed = clamp(uBleedWidth * 2.7, 0.0, 0.18);
    float pigment = mix(centre.r, diffuse.r, bleed) * pow(0.015, uDelta / max(0.1, uTrailLifetime));
    float wet = mix(centre.g, diffuse.g, bleed * 1.28) * pow(0.035, uDelta / max(0.1, uWetLifetime));

    if (uInject > 0.0) {
      vec2 flow = vec2(sin(vUv.y * 29.0 + uTime * 0.18), cos(vUv.x * 23.0 - uTime * 0.14)) * uCurl;
      vec2 a = uPreviousPointer + flow;
      vec2 b = uPointer + flow;
      float speed = smoothstep(0.0015, 0.045, uMotion);
      float radius = mix(0.0155, 0.0045, speed);
      float distanceToBrush = lineDistance(vUv, a, b);
      float brush = smoothstep(radius, radius * 0.32, distanceToBrush);
      float bristles = noise(vUv * vec2(460.0, 338.0) + vec2(uTime * 0.16, -uTime * 0.11));
      float broken = smoothstep(uBreakup * 0.74, 1.0, bristles + brush * 0.33);
      float edgeWear = smoothstep(radius * 0.92, radius * 0.28, distanceToBrush);
      float deposit = brush * mix(0.4, 1.0, broken) * edgeWear;
      float amount = mix(uInkAmount, uInkAmount * 0.34, speed);
      pigment = min(uMaximumOpacity, pigment + deposit * amount);
      wet = min(1.0, wet + deposit * mix(0.76, 0.25, speed));
    }

    wet *= mix(1.0, 0.95, uAbsorption);
    gl_FragColor = vec4(clamp(pigment, 0.0, uMaximumOpacity), clamp(wet, 0.0, 1.0), 0.0, 1.0);
  }
`;

const displayFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 uResolution;
  uniform vec2 uOrigin;
  uniform float uTime;
  uniform float uTransition;
  uniform float uHold;
  uniform float uBurst;
  uniform sampler2D uInk;
  uniform float uPaperGrain;
  uniform float uMaximumOpacity;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float value = 0.0; float amp = 0.54;
    for (int i = 0; i < 5; i++) { value += noise(p) * amp; p = p * mat2(1.68, -1.08, 1.08, 1.68) + vec2(7.3, 4.8); amp *= 0.5; }
    return value;
  }
  float ridge(vec2 p) { return 1.0 - abs(fbm(p) * 2.0 - 1.0); }
  float paperFibres(vec2 frag) {
    return noise(vec2(frag.x * 0.027, frag.y * 0.39)) * 0.48
      + noise(vec2(frag.y * 0.034, frag.x * 0.3)) * 0.3 + fbm(frag * 0.007) * 0.22;
  }

  void main() {
    vec2 frag = gl_FragCoord.xy;
    float shortest = min(uResolution.x, uResolution.y);
    vec2 p = (frag - uOrigin) / shortest;
    float t = uTime * 0.09;
    float paper = paperFibres(frag);
    vec2 advection = vec2(fbm(p * 4.1 + vec2(t * 0.32, 3.7)), fbm(p * 4.5 + vec2(-6.2, -t * 0.24))) - 0.5;
    vec2 flow = p + advection * 0.043 + vec2(0.0, -length(p) * 0.014);
    float radius = length(flow);
    float angle = atan(flow.y, flow.x);
    float pigment = fbm(flow * 25.0 + advection * 4.0);
    float granulation = ridge(flow * 61.0 + vec2(paper * 3.2));

    vec4 residual = texture2D(uInk, vUv);
    float dryGrain = fbm(frag * 0.038 + vec2(t * 2.0, -t)) * uPaperGrain;
    float residualCore = smoothstep(0.004, 0.32, residual.r) * (0.58 + paper * 0.42);
    float residualBleed = smoothstep(0.02, 0.52, residual.g) * (0.08 + paper * 0.14);
    float residualAlpha = min(uMaximumOpacity, residualCore * (0.36 + dryGrain * 0.34) + residualBleed);

    float holdRadius = mix(0.006, 0.075, pow(uHold, 0.68));
    float surfaceTension = sin(angle * 8.0 + pigment * 3.8) * 0.006 + sin(angle * 17.0 - pigment * 2.2) * 0.0025;
    float holdEdge = holdRadius + surfaceTension * uHold + (paper - 0.5) * 0.055 + (granulation - 0.5) * 0.017;
    float holdInk = smoothstep(holdEdge + 0.014, holdEdge - 0.012, radius);
    float absorption = smoothstep(holdEdge + 0.022 + paper * 0.006, holdEdge + 0.002, radius);
    float wetEdge = max(0.0, absorption - holdInk * 0.82);
    float sediment = holdInk * smoothstep(0.61, 0.9, pigment) * (0.46 + granulation * 0.54);

    float capillary = 0.0;
    for (int branch = 0; branch < 16; branch++) {
      float fi = float(branch);
      float branchAngle = fi * 2.39996 + hash(vec2(fi, 7.2));
      float reach = holdRadius * (1.18 + hash(vec2(fi, 2.4)) * 0.82);
      float rayDistance = abs(sin(angle - branchAngle + sin(radius * (54.0 + fi) + fi) * 0.03)) * radius;
      float width = mix(0.0009, 0.0028, hash(vec2(fi, 5.1)));
      float ray = smoothstep(width, width * 0.16, rayDistance);
      float segment = smoothstep(holdRadius * 0.62, holdRadius * 0.94, radius) * (1.0 - smoothstep(reach, reach + 0.04, radius));
      capillary += ray * segment;
    }
    capillary *= uHold * (0.42 + paper * 0.58);

    float burstLife = 1.0 - smoothstep(0.56, 1.0, uBurst);
    float burstRadius = pow(uBurst, 0.62) * 1.42;
    float burstEdge = burstRadius + (fbm(flow * 3.35 - t) - 0.5) * (0.13 + uBurst * 0.25) + surfaceTension * 2.2;
    float burst = smoothstep(burstEdge + 0.095, burstEdge - 0.075, radius);
    float burstFront = smoothstep(0.07, 0.006, abs(radius - burstEdge)) * burstLife;

    float satellite = 0.0;
    for (int drop = 0; drop < 24; drop++) {
      float fi = float(drop); float seed = hash(vec2(fi, 11.8));
      vec2 centre = vec2(cos(fi * 2.39996 + seed * 1.7), sin(fi * 2.39996 + seed * 1.7)) * burstRadius * (0.68 + seed * 0.78) + advection * (0.018 + seed * 0.038);
      float dropRadius = mix(0.0013, 0.009, pow(hash(vec2(fi, 3.7)), 2.3));
      satellite += smoothstep(dropRadius, dropRadius * 0.22, length(flow - centre)) * step(seed * 0.38, uBurst);
    }

    float transitionInk = smoothstep(0.08, 0.78, uTransition + (fbm(vUv * 7.0 + t) - 0.5) * 0.46 + sin(vUv.y * 8.0 + t) * 0.025);
    vec3 blackInk = vec3(0.007, 0.009, 0.008);
    float holdPresence = smoothstep(0.012, 0.075, uHold);
    float alpha = residualAlpha;
    alpha = max(alpha, (holdInk * (0.27 + uHold * 0.48 + sediment * 0.13) + wetEdge * 0.2 + capillary * 0.34) * holdPresence);
    alpha = max(alpha, burst * burstLife * (0.78 + granulation * 0.12));
    alpha = max(alpha, burstFront * 0.32 + satellite * burstLife * 0.72);
    alpha = max(alpha, transitionInk * 0.9);
    gl_FragColor = vec4(blackInk, clamp(alpha, 0.0, 0.91));
  }
`;

export default function ThreeFilmInk(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  useEffect(() => { propsRef.current = props; }, [props]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" });
    } catch {
      host.classList.add("is-unavailable");
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const simScene = new THREE.Scene();
    const displayScene = new THREE.Scene();
    const drawingBuffer = new THREE.Vector2();
    const pointer = new THREE.Vector2(0.5, 0.5);
    const previousPointer = pointer.clone();
    const rawPointer = pointer.clone();
    let pointerReady = false;
    let readTarget: THREE.WebGLRenderTarget;
    let writeTarget: THREE.WebGLRenderTarget;
    let mobile = false;

    const simUniforms = {
      uInk: { value: null as THREE.Texture | null },
      uTexel: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: pointer.clone() },
      uPreviousPointer: { value: previousPointer.clone() },
      uVelocity: { value: new THREE.Vector2() },
      uDelta: { value: 0 },
      uInject: { value: 0 },
      uMotion: { value: 0 },
      uTime: { value: 0 },
      uInkAmount: { value: INK_TRAIL_TUNING.inkAmount },
      uTrailLifetime: { value: INK_TRAIL_TUNING.trailLifetime },
      uWetLifetime: { value: INK_TRAIL_TUNING.wetDepositLifetime },
      uAbsorption: { value: INK_TRAIL_TUNING.absorptionSpeed },
      uBleedWidth: { value: INK_TRAIL_TUNING.bleedWidth },
      uBreakup: { value: INK_TRAIL_TUNING.dryBrushBreakup },
      uMaximumOpacity: { value: INK_TRAIL_TUNING.maximumOpacity },
      uCurl: { value: INK_TRAIL_TUNING.curlStrength },
    };
    const displayUniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uOrigin: { value: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2) },
      uTime: { value: 0 },
      uTransition: { value: 0 },
      uHold: { value: 0 },
      uBurst: { value: 1 },
      uInk: { value: null as THREE.Texture | null },
      uPaperGrain: { value: INK_TRAIL_TUNING.paperGrainStrength },
      uMaximumOpacity: { value: INK_TRAIL_TUNING.maximumOpacity },
    };
    const simMaterial = new THREE.ShaderMaterial({ vertexShader, fragmentShader: simulationFragment, uniforms: simUniforms, depthTest: false, depthWrite: false });
    const displayMaterial = new THREE.ShaderMaterial({ vertexShader, fragmentShader: displayFragment, uniforms: displayUniforms, transparent: true, depthTest: false, depthWrite: false });
    simScene.add(new THREE.Mesh(geometry, simMaterial));
    displayScene.add(new THREE.Mesh(geometry, displayMaterial));

    const createTargets = () => {
      readTarget?.dispose();
      writeTarget?.dispose();
      const quality = mobile ? INK_TRAIL_TUNING.mobileQuality : 0.56;
      const width = Math.max(96, Math.round(drawingBuffer.x * quality));
      const height = Math.max(96, Math.round(drawingBuffer.y * quality));
      const options: THREE.RenderTargetOptions = { depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.UnsignedByteType };
      readTarget = new THREE.WebGLRenderTarget(width, height, options);
      writeTarget = new THREE.WebGLRenderTarget(width, height, options);
      simUniforms.uTexel.value.set(1 / width, 1 / height);
      renderer.setRenderTarget(readTarget); renderer.clear();
      renderer.setRenderTarget(writeTarget); renderer.clear();
      renderer.setRenderTarget(null);
    };

    const resize = () => {
      mobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 720;
      const lowPower = mobile || (navigator.hardwareConcurrency || 8) <= 4;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.25));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderer.getDrawingBufferSize(drawingBuffer);
      displayUniforms.uResolution.value.copy(drawingBuffer);
      createTargets();
    };

    let frame = 0;
    let disposed = false;
    let pageVisible = !document.hidden;
    let previousTime = performance.now();
    let burstStarted = previousTime - 5000;
    let seenBurst = propsRef.current.burstKey;
    const swapTargets = () => { const current = readTarget; readTarget = writeTarget; writeTarget = current; };
    const queueDraw = () => { if (!disposed && pageVisible && !frame) frame = window.requestAnimationFrame(draw); };
    const onVisibility = () => { pageVisible = !document.hidden; previousTime = performance.now(); queueDraw(); };

    const draw = (now: number) => {
      frame = 0;
      if (disposed || !pageVisible) return;
      const current = propsRef.current;
      const delta = Math.min(0.034, Math.max(0.001, (now - previousTime) / 1000));
      previousTime = now;
      const target = new THREE.Vector2(
        current.origin.x / Math.max(1, window.innerWidth),
        1 - current.origin.y / Math.max(1, window.innerHeight),
      );
      if (!pointerReady) {
        pointer.copy(target); previousPointer.copy(target); rawPointer.copy(target); pointerReady = true;
      }
      const rawMovement = target.distanceTo(rawPointer);
      rawPointer.copy(target);
      previousPointer.copy(pointer);
      pointer.lerp(target, current.reducedMotion ? 1 : INK_TRAIL_TUNING.pointerLag);
      const velocity = pointer.clone().sub(previousPointer);
      const motion = velocity.length();
      const keepInertia = rawMovement > 0.00024 || (motion > 0.00028 && rawMovement > 0.00004);
      const scaleX = drawingBuffer.x / Math.max(1, window.innerWidth);
      const scaleY = drawingBuffer.y / Math.max(1, window.innerHeight);
      displayUniforms.uOrigin.value.set(current.origin.x * scaleX, (window.innerHeight - current.origin.y) * scaleY);

      if (current.burstKey !== seenBurst) { seenBurst = current.burstKey; burstStarted = now; }
      const passes = mobile ? 1 : INK_TRAIL_TUNING.pressureIterations;
      for (let pass = 0; pass < passes; pass += 1) {
        simUniforms.uInk.value = readTarget.texture;
        simUniforms.uPointer.value.copy(pointer);
        simUniforms.uPreviousPointer.value.copy(previousPointer);
        simUniforms.uVelocity.value.copy(velocity);
        simUniforms.uDelta.value = pass === 0 ? delta : 0;
        simUniforms.uInject.value = pass === 0 && !current.reducedMotion && (keepInertia || current.holdProgress > 0.01) ? 1 : 0;
        simUniforms.uInkAmount.value = INK_TRAIL_TUNING.inkAmount * (current.holdProgress > 0.01 ? 0.84 : 1);
        simUniforms.uMotion.value = motion;
        simUniforms.uTime.value = now * 0.001;
        renderer.setRenderTarget(writeTarget);
        renderer.render(simScene, camera);
        swapTargets();
      }

      displayUniforms.uInk.value = readTarget.texture;
      displayUniforms.uTime.value = now * 0.001;
      displayUniforms.uTransition.value += (current.transition - displayUniforms.uTransition.value) * (current.reducedMotion ? 1 : 0.095);
      displayUniforms.uHold.value += (current.holdProgress - displayUniforms.uHold.value) * (current.reducedMotion ? 1 : 0.12);
      displayUniforms.uBurst.value = Math.min(1, (now - burstStarted) / (current.reducedMotion ? 120 : 2500));
      renderer.setRenderTarget(null);
      renderer.render(displayScene, camera);
      queueDraw();
    };

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    resize();
    queueDraw();

    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      readTarget.dispose();
      writeTarget.dispose();
      geometry.dispose();
      simMaterial.dispose();
      displayMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="film-ink-field" ref={hostRef} aria-hidden="true" />;
}
