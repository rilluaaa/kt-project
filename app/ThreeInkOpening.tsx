"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type ThreeInkOpeningProps = {
  progress: number;
  ready: boolean;
  opening: boolean;
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
  uniform vec2 uCentre;
  uniform vec2 uPointer;
  uniform float uTime;
  uniform float uProgress;
  uniform float uReady;
  uniform float uHover;
  uniform float uOpening;

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
      point = point * mat2(1.72, -1.05, 1.05, 1.72) + vec2(11.7, 4.3);
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 frag = gl_FragCoord.xy;
    float shortest = min(uResolution.x, uResolution.y);
    vec2 point = (frag - uCentre) / shortest;
    float aspect = uResolution.x / uResolution.y;
    float distanceToCentre = length(point);
    float angle = atan(point.y, point.x);

    float paperGrain = noise(frag * 0.42) * 0.5 + noise(frag * 0.91) * 0.5;
    float fibres = fbm(vec2(angle * 2.15 - uTime * 0.016, distanceToCentre * 34.0 + uTime * 0.025));
    float veins = fbm(vec2(angle * 8.2 + fibres * 2.0, distanceToCentre * 86.0));
    float tide = fbm(point * 7.0 + vec2(uTime * 0.025, -uTime * 0.018));

    float loadingRadius = mix(0.052, 0.205, pow(uProgress, 0.72));
    float readyRadius = 0.104 + sin(uTime * 0.72) * 0.004 + uHover * 0.022;
    float radius = mix(loadingRadius, readyRadius, uReady);
    float roughness = mix(0.026, 0.052, uReady + uProgress * 0.3);
    float edge = radius + (fibres - 0.5) * roughness + (veins - 0.5) * 0.012;

    float core = smoothstep(edge + 0.012, edge - 0.012, distanceToCentre);
    float wetHalo = smoothstep(edge + 0.046, edge + 0.005, distanceToCentre) - core * 0.34;
    float sediment = smoothstep(0.7, 0.95, tide) * smoothstep(edge + 0.02, edge - 0.04, distanceToCentre);

    float capillary = 0.0;
    for (int branch = 0; branch < 15; branch++) {
      float fi = float(branch);
      float branchAngle = fi * 2.39996 + hash(vec2(fi, 4.7)) * 0.8;
      float branchLength = radius * (1.12 + hash(vec2(fi, 8.1)) * 0.7);
      float angularDistance = abs(sin((angle - branchAngle) * 0.5));
      float radialDistance = abs(distanceToCentre - branchLength * (0.78 + fibres * 0.24));
      capillary += smoothstep(0.018, 0.002, angularDistance * 0.028 + radialDistance);
    }
    capillary *= smoothstep(radius * 2.05, radius * 0.88, distanceToCentre) * (0.35 + uProgress * 0.65);

    float droplets = 0.0;
    for (int drop = 0; drop < 22; drop++) {
      float fi = float(drop);
      float seed = hash(vec2(fi, 13.2));
      float dropAngle = fi * 2.39996 + seed * 1.3;
      float dropDistance = radius * (1.24 + seed * 1.08);
      vec2 dropCentre = vec2(cos(dropAngle), sin(dropAngle)) * dropDistance;
      float dropRadius = mix(0.0016, 0.0068, hash(vec2(fi, 2.9)));
      droplets += smoothstep(dropRadius, dropRadius * 0.3, length(point - dropCentre));
    }

    vec2 pointerPoint = (frag - uPointer) / shortest;
    float pointerWet = smoothstep(0.035, 0.0, length(pointerPoint)) * uHover;

    float openingRadius = uOpening * (0.38 + aspect * 0.52);
    float openingNoise = fbm(point * 3.4 - vec2(uTime * 0.08, uTime * 0.04));
    float openingEdge = openingRadius + (openingNoise - 0.5) * mix(0.04, 0.25, uOpening);
    float openingWash = smoothstep(openingEdge + 0.09, openingEdge - 0.07, distanceToCentre);

    vec3 dryInk = vec3(0.016, 0.023, 0.019);
    vec3 wetInk = vec3(0.045, 0.055, 0.046);
    vec3 colour = mix(dryInk, wetInk, wetHalo * 0.65 + paperGrain * 0.12);
    float alpha = core * (0.72 + sediment * 0.2) + wetHalo * 0.23 + capillary * 0.22 + droplets * 0.52 + pointerWet * 0.25;
    vec2 digitPoint = point * vec2(0.58, 1.42);
    float digitReserve = 1.0 - smoothstep(0.035, 0.115, length(digitPoint));
    alpha *= 1.0 - digitReserve * (1.0 - uReady) * 0.88;
    alpha = max(alpha, openingWash * mix(0.0, 0.97, uOpening));
    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 0.97));
  }
`;

export default function ThreeInkOpening({ progress, ready, opening, reducedMotion }: ThreeInkOpeningProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ progress, ready, opening, reducedMotion });

  useEffect(() => {
    propsRef.current = { progress, ready, opening, reducedMotion };
  }, [progress, ready, opening, reducedMotion]);

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
    renderer.autoClear = true;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uCentre: { value: new THREE.Vector2(0.5, 0.5) },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uReady: { value: 0 },
      uHover: { value: 0 },
      uOpening: { value: 0 },
    };
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(geometry, material));

    const drawingBuffer = new THREE.Vector2();
    const pointer = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);
    const pointerTarget = pointer.clone();
    let disposed = false;
    let frame = 0;
    let visible = !document.hidden;

    const onPointerMove = (event: PointerEvent) => pointerTarget.set(event.clientX, window.innerHeight - event.clientY);
    const resize = () => {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.25));
      renderer.setSize(width, height, false);
      renderer.getDrawingBufferSize(drawingBuffer);
      uniforms.uResolution.value.copy(drawingBuffer);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("resize", resize);
    const onVisibility = () => { visible = !document.hidden; };
    document.addEventListener("visibilitychange", onVisibility);
    resize();

    const draw = (now: number) => {
      if (disposed) return;
      if (!visible) {
        frame = window.requestAnimationFrame(draw);
        return;
      }
      const props = propsRef.current;
      const target = props.ready
        ? document.querySelector<HTMLElement>(".journey-start")
        : document.querySelector<HTMLElement>(".loading-mark strong");
      const rect = target?.getBoundingClientRect();
      const centreX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const centreY = rect ? window.innerHeight - (rect.top + rect.height / 2) : window.innerHeight / 2;
      const pixelScaleX = drawingBuffer.x / Math.max(1, window.innerWidth);
      const pixelScaleY = drawingBuffer.y / Math.max(1, window.innerHeight);
      const hovering = props.ready && rect
        ? pointerTarget.x >= rect.left && pointerTarget.x <= rect.right && window.innerHeight - pointerTarget.y >= rect.top && window.innerHeight - pointerTarget.y <= rect.bottom
        : false;

      pointer.lerp(pointerTarget, props.reducedMotion ? 1 : 0.16);
      uniforms.uCentre.value.set(centreX * pixelScaleX, centreY * pixelScaleY);
      uniforms.uPointer.value.set(pointer.x * pixelScaleX, pointer.y * pixelScaleY);
      uniforms.uTime.value = now * 0.001;
      uniforms.uProgress.value += (props.progress / 100 - uniforms.uProgress.value) * 0.075;
      uniforms.uReady.value += ((props.ready ? 1 : 0) - uniforms.uReady.value) * 0.07;
      uniforms.uHover.value += ((hovering ? 1 : 0) - uniforms.uHover.value) * 0.11;
      uniforms.uOpening.value += ((props.opening ? 1 : 0) - uniforms.uOpening.value) * (props.opening ? 0.035 : 0.12);
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="opening-ink-webgl" ref={hostRef} aria-hidden="true" />;
}
