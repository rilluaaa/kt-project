"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const assetPrefix = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type MilkTeaStageProps = {
  opacity: number;
  cameraPhase: number;
  pointerActive: boolean;
  holdProgress: number;
  effectKey: number;
  reducedMotion: boolean;
};

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform vec2 uEffectOrigin;
  uniform float uTime;
  uniform float uHold;
  uniform float uActive;
  uniform float uEffect;

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
    float radius = mix(0.052, 0.15, uHold);
    float edge = radius + (fibres - 0.5) * mix(0.018, 0.05, uHold);
    float core = smoothstep(edge + 0.01, edge - 0.008, distanceToPointer);
    float wet = smoothstep(edge + 0.042, edge + 0.003, distanceToPointer) - core * 0.36;

    float droplets = 0.0;
    for (int index = 0; index < 15; index++) {
      float fi = float(index);
      float seed = hash(vec2(fi, 7.1));
      float dropAngle = fi * 2.39996 + seed;
      float dropDistance = radius * (1.25 + seed * 1.0);
      vec2 centre = vec2(cos(dropAngle), sin(dropAngle)) * dropDistance;
      float dropRadius = mix(0.0018, 0.0068, hash(vec2(fi, 2.4)));
      droplets += smoothstep(dropRadius, dropRadius * 0.3, length(point - centre));
    }

    vec2 effectPoint = (frag - uEffectOrigin) / shortest;
    float effectDistance = length(effectPoint);
    float effectAngle = atan(effectPoint.y, effectPoint.x);
    float effectNoise = fbm(effectPoint * 4.4 - vec2(uTime * 0.045, uTime * 0.025));
    float effectEdge = uEffect * 1.55 + (effectNoise - 0.5) * 0.28;
    float wash = smoothstep(effectEdge + 0.1, effectEdge - 0.07, effectDistance);
    float burstLife = smoothstep(0.0, 0.1, uEffect) * (1.0 - smoothstep(0.76, 1.0, uEffect));
    float ringDistance = abs(effectDistance - uEffect * 1.28 - (effectNoise - 0.5) * 0.08);
    float pressureRing = smoothstep(0.038, 0.005, ringDistance) * burstLife;
    float radialFibres = pow(max(0.0, sin(effectAngle * 13.0 + effectNoise * 8.0)), 8.0);
    radialFibres *= smoothstep(effectEdge + 0.13, effectEdge - 0.02, effectDistance) * burstLife;

    vec3 colour = mix(vec3(0.018, 0.025, 0.021), vec3(0.14, 0.09, 0.052), wash * 0.1);
    float alpha = (core * 0.84 + wet * 0.24 + droplets * 0.58) * uActive;
    alpha = max(alpha, wash * burstLife * 0.76);
    alpha = max(alpha, pressureRing * 0.58 + radialFibres * 0.2);
    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 0.94));
  }
`;

export default function ThreeMilkTeaStage({ opacity, cameraPhase, pointerActive, holdProgress, effectKey, reducedMotion }: MilkTeaStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
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
    const video = videoRef.current;
    if (!host || !video) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" });
    } catch {
      host.classList.add("is-unavailable");
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "milk-tea-ink-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uEffectOrigin: { value: new THREE.Vector2(0.5, 0.5) },
      uTime: { value: 0 },
      uHold: { value: 0 },
      uActive: { value: 0 },
      uEffect: { value: 0 },
    };
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthTest: false, depthWrite: false });
    scene.add(new THREE.Mesh(geometry, material));

    const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
    const pointer = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);
    const pointerTarget = pointer.clone();
    const drawingBuffer = new THREE.Vector2();
    let duration = 10;
    let disposed = false;
    let frame = 0;
    let lastSeek = 0;
    let capturedEffectAt = -1;

    const metadata = () => { if (Number.isFinite(video.duration) && video.duration > 0) duration = video.duration; };
    const pointerMove = (event: PointerEvent) => pointerTarget.set(event.clientX, window.innerHeight - event.clientY);
    const resize = () => {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.2));
      renderer.setSize(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight), false);
      renderer.getDrawingBufferSize(drawingBuffer);
      uniforms.uResolution.value.copy(drawingBuffer);
    };
    video.addEventListener("loadedmetadata", metadata);
    window.addEventListener("pointermove", pointerMove, { passive: true });
    window.addEventListener("resize", resize);
    resize();

    const draw = (now: number) => {
      if (disposed) return;
      const props = propsRef.current;
      const progress = props.reducedMotion ? 0.05 : Math.min(1, Math.max(0, (props.cameraPhase - 3) / 4.95));
      const targetTime = Math.min(Math.max(0, duration - 0.05), progress * Math.max(0.1, duration - 0.05));
      if (video.readyState >= 2 && !video.seeking && Math.abs(video.currentTime - targetTime) > 0.055 && now - lastSeek > 42) {
        video.currentTime = targetTime;
        lastSeek = now;
      }

      let effect = 0;
      if (effectStartedRef.current >= 0) {
        const elapsed = (now - effectStartedRef.current) / 1000;
        effect = Math.min(1, elapsed / 3.9);
        if (elapsed > 4.1) effectStartedRef.current = -1;
      }

      pointer.lerp(pointerTarget, props.reducedMotion ? 1 : 0.18);
      const scaleX = drawingBuffer.x / Math.max(1, window.innerWidth);
      const scaleY = drawingBuffer.y / Math.max(1, window.innerHeight);
      uniforms.uPointer.value.set(pointer.x * scaleX, pointer.y * scaleY);
      if (effectStartedRef.current >= 0 && capturedEffectAt !== effectStartedRef.current) {
        capturedEffectAt = effectStartedRef.current;
        uniforms.uEffectOrigin.value.copy(uniforms.uPointer.value);
      }
      uniforms.uTime.value = now * 0.001;
      uniforms.uHold.value += (props.holdProgress - uniforms.uHold.value) * 0.18;
      uniforms.uActive.value += ((props.pointerActive ? 1 : 0) - uniforms.uActive.value) * 0.14;
      uniforms.uEffect.value = effect;
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      video.pause();
      video.removeEventListener("loadedmetadata", metadata);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("resize", resize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="milk-tea-webgl is-video-stage" style={{ opacity }} ref={hostRef} aria-hidden="true">
      <video ref={videoRef} className="milk-tea-film" src={`${assetPrefix}/media/scene-02-milk-tea.mp4`} preload="auto" muted playsInline />
      <div className="milk-tea-film-grade" />
    </div>
  );
}
