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

  float ridge(vec2 point) {
    return 1.0 - abs(fbm(point) * 2.0 - 1.0);
  }

  float paperFibres(vec2 frag) {
    float longFibres = noise(vec2(frag.x * 0.028, frag.y * 0.42));
    float crossFibres = noise(vec2(frag.y * 0.035, frag.x * 0.31));
    float pulp = fbm(frag * 0.008);
    return longFibres * 0.42 + crossFibres * 0.28 + pulp * 0.3;
  }

  void main() {
    vec2 frag = gl_FragCoord.xy;
    float shortest = min(uResolution.x, uResolution.y);
    vec2 point = (frag - uCentre) / shortest;
    float aspect = uResolution.x / uResolution.y;
    float paper = paperFibres(frag);
    vec2 flowWarp = vec2(
      fbm(point * 4.2 + vec2(8.1, uTime * 0.018)),
      fbm(point * 4.6 + vec2(-5.4, -uTime * 0.014))
    ) - 0.5;
    vec2 warpedPoint = point + flowWarp * 0.036 + vec2(0.0, -length(point) * 0.012);
    float distanceToCentre = length(warpedPoint);
    float angle = atan(warpedPoint.y, warpedPoint.x);

    float paperGrain = noise(frag * 0.52) * 0.36 + noise(frag * 1.17) * 0.24 + paper * 0.4;
    float fibres = fbm(vec2(angle * 2.4 - uTime * 0.012, distanceToCentre * 38.0 + paper * 2.4));
    float veins = ridge(vec2(angle * 9.6 + fibres * 2.7, distanceToCentre * 108.0 + paper * 3.0));
    float pigment = fbm(warpedPoint * 24.0 + flowWarp * 5.0);
    float granulation = ridge(warpedPoint * 58.0 + vec2(paper * 4.0));

    float loadingRadius = mix(0.052, 0.205, pow(uProgress, 0.72));
    float readyRadius = 0.104 + sin(uTime * 0.72) * 0.004 + uHover * 0.022;
    float radius = mix(loadingRadius, readyRadius, uReady);
    float roughness = mix(0.024, 0.058, uReady + uProgress * 0.34);
    float edge = radius + (fibres - 0.5) * roughness + (veins - 0.5) * 0.016 + (paper - 0.5) * 0.014;

    float core = smoothstep(edge + 0.01, edge - 0.014, distanceToCentre);
    float absorption = smoothstep(edge + 0.067 + paper * 0.012, edge + 0.004, distanceToCentre);
    float wetHalo = max(0.0, absorption - core * 0.84);
    float wetFront = smoothstep(0.027, 0.003, abs(distanceToCentre - edge - 0.018));
    float sediment = smoothstep(0.6, 0.9, pigment) * core;
    float pigmentRing = smoothstep(0.025, 0.002, abs(distanceToCentre - edge + 0.004)) * (0.45 + granulation * 0.55);

    float capillary = 0.0;
    for (int branch = 0; branch < 21; branch++) {
      float fi = float(branch);
      float branchAngle = fi * 2.39996 + hash(vec2(fi, 4.7)) * 0.8;
      float branchLength = radius * (1.16 + hash(vec2(fi, 8.1)) * 0.76);
      float branchWander = sin(distanceToCentre * (58.0 + fi * 1.7) + fi) * 0.025;
      float rayDistance = abs(sin(angle - branchAngle + branchWander)) * distanceToCentre;
      float branchWidth = mix(0.0021, 0.006, hash(vec2(fi, 3.2)));
      float ray = smoothstep(branchWidth, branchWidth * 0.18, rayDistance);
      float segment = smoothstep(radius * 0.72, radius * 0.96, distanceToCentre)
        * (1.0 - smoothstep(branchLength, branchLength + 0.035, distanceToCentre));
      float subBranch = smoothstep(branchWidth * 1.2, branchWidth * 0.18,
        abs(sin(angle - branchAngle - 0.12 * sin(fi))) * distanceToCentre);
      capillary += (ray + subBranch * 0.34) * segment;
    }
    capillary *= (0.26 + uProgress * 0.74);

    float droplets = 0.0;
    for (int drop = 0; drop < 32; drop++) {
      float fi = float(drop);
      float seed = hash(vec2(fi, 13.2));
      float dropAngle = fi * 2.39996 + seed * 1.3;
      float dropDistance = radius * (1.2 + seed * 1.18);
      vec2 dropCentre = vec2(cos(dropAngle), sin(dropAngle)) * dropDistance
        + flowWarp * (0.02 + seed * 0.025);
      float dropRadius = mix(0.0012, 0.0064, pow(hash(vec2(fi, 2.9)), 2.0));
      float dropBody = smoothstep(dropRadius, dropRadius * 0.28, length(warpedPoint - dropCentre));
      float dropRim = smoothstep(dropRadius * 1.32, dropRadius * 0.82, length(warpedPoint - dropCentre));
      droplets += dropBody + dropRim * 0.28;
    }

    vec2 pointerPoint = (frag - uPointer) / shortest;
    float pointerWet = smoothstep(0.035, 0.0, length(pointerPoint)) * uHover;

    float openingRadius = uOpening * (0.38 + aspect * 0.52);
    float openingNoise = fbm(warpedPoint * 3.8 - vec2(uTime * 0.045, uTime * 0.022));
    float openingLobes = sin(angle * 7.0 + fibres * 4.0) * 0.045 + sin(angle * 13.0 - pigment * 3.0) * 0.018;
    float openingEdge = openingRadius + (openingNoise - 0.5) * mix(0.05, 0.28, uOpening) + openingLobes * uOpening;
    float openingWash = smoothstep(openingEdge + 0.085, openingEdge - 0.065, distanceToCentre);
    float openingFront = smoothstep(0.06, 0.006, abs(distanceToCentre - openingEdge)) * uOpening;
    float openingGranules = openingWash * smoothstep(0.57, 0.88, pigment) * (0.35 + granulation * 0.65);

    vec3 dryInk = vec3(0.016, 0.023, 0.019);
    vec3 wetInk = vec3(0.025, 0.078, 0.052);
    vec3 colour = mix(dryInk, wetInk, wetHalo * 0.72 + paperGrain * 0.09 + openingFront * 0.22);
    float alpha = core * (0.68 + sediment * 0.2 + granulation * 0.08)
      + wetHalo * 0.2 + wetFront * 0.16 + pigmentRing * 0.22
      + capillary * 0.34 + droplets * 0.58 + pointerWet * 0.25;
    vec2 digitPoint = point * vec2(0.58, 1.42);
    float digitReserve = 1.0 - smoothstep(0.035, 0.115, length(digitPoint));
    alpha *= 1.0 - digitReserve * (1.0 - uReady) * 0.88;
    float openingAlpha = openingWash * mix(0.0, 0.91, uOpening)
      + openingFront * 0.16 + openingGranules * 0.13;
    alpha = max(alpha, openingAlpha);
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
