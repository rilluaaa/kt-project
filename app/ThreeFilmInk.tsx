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
  uniform vec2 uOrigin;
  uniform float uTime;
  uniform float uTransition;
  uniform float uHold;
  uniform float uBurst;
  uniform float uScene;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amp = 0.54;
    for (int i = 0; i < 6; i++) {
      value += noise(p) * amp;
      p = p * mat2(1.68, -1.08, 1.08, 1.68) + vec2(7.3, 4.8);
      amp *= 0.5;
    }
    return value;
  }

  float ridge(vec2 p) {
    return 1.0 - abs(fbm(p) * 2.0 - 1.0);
  }

  float paperFibres(vec2 frag) {
    float horizontal = noise(vec2(frag.x * 0.027, frag.y * 0.39));
    float vertical = noise(vec2(frag.y * 0.034, frag.x * 0.3));
    return horizontal * 0.48 + vertical * 0.3 + fbm(frag * 0.007) * 0.22;
  }

  void main() {
    vec2 frag = gl_FragCoord.xy;
    float shortest = min(uResolution.x, uResolution.y);
    vec2 p = (frag - uOrigin) / shortest;
    vec2 uv = frag / uResolution;
    float t = uTime * 0.09;
    float paper = paperFibres(frag);
    vec2 advection = vec2(
      fbm(p * 4.1 + vec2(t * 0.32, 3.7)),
      fbm(p * 4.5 + vec2(-6.2, -t * 0.24))
    ) - 0.5;
    vec2 flow = p + advection * 0.043 + vec2(0.0, -length(p) * 0.014);
    float radius = length(flow);
    float angle = atan(flow.y, flow.x);
    float fibres = fbm(vec2(uv.x * 7.0 - t, uv.y * 10.0 + t * 0.7) + advection * 1.8);
    float veins = ridge(vec2(angle * 7.2 + fibres * 2.0, radius * 74.0 - t + paper * 2.0));
    float pigment = fbm(flow * 25.0 + advection * 4.0);
    float granulation = ridge(flow * 61.0 + vec2(paper * 3.2));

    float holdRadius = mix(0.006, 0.075, pow(uHold, 0.68));
    float surfaceTension = sin(angle * 8.0 + veins * 3.8) * 0.006 + sin(angle * 17.0 - pigment * 2.2) * 0.0025;
    float holdEdge = holdRadius + surfaceTension * uHold + (fibres - 0.5) * 0.055 + (veins - 0.5) * 0.017;
    float holdInk = smoothstep(holdEdge + 0.014, holdEdge - 0.012, radius);
    float absorption = smoothstep(holdEdge + 0.022 + paper * 0.006, holdEdge + 0.002, radius);
    float wetEdge = max(0.0, absorption - holdInk * 0.82);
    float pigmentRing = smoothstep(0.009, 0.0015, abs(radius - holdEdge + 0.001)) * (0.5 + granulation * 0.5);
    float sediment = holdInk * smoothstep(0.61, 0.9, pigment) * (0.46 + granulation * 0.54);

    float capillary = 0.0;
    for (int branch = 0; branch < 20; branch++) {
      float fi = float(branch);
      float branchAngle = fi * 2.39996 + hash(vec2(fi, 7.2));
      float reach = holdRadius * (1.18 + hash(vec2(fi, 2.4)) * 0.82);
      float wander = sin(radius * (54.0 + fi * 1.3) + fi * 0.8) * 0.03;
      float rayDistance = abs(sin(angle - branchAngle + wander)) * radius;
      float width = mix(0.0009, 0.0028, hash(vec2(fi, 5.1)));
      float ray = smoothstep(width, width * 0.16, rayDistance);
      float segment = smoothstep(holdRadius * 0.62, holdRadius * 0.94, radius)
        * (1.0 - smoothstep(reach, reach + 0.04, radius));
      capillary += ray * segment;
    }
    capillary *= uHold * (0.42 + paper * 0.58);

    float burstLife = 1.0 - smoothstep(0.56, 1.0, uBurst);
    float burstRadius = pow(uBurst, 0.62) * 1.42;
    float burstRoughness = (fbm(flow * 3.35 - t) - 0.5) * (0.13 + uBurst * 0.25);
    float burstEdge = burstRadius + burstRoughness + surfaceTension * 2.2;
    float burst = smoothstep(burstEdge + 0.095, burstEdge - 0.075, radius);
    float burstFront = smoothstep(0.07, 0.006, abs(radius - burstEdge)) * burstLife;

    float satellite = 0.0;
    for (int drop = 0; drop < 30; drop++) {
      float fi = float(drop);
      float seed = hash(vec2(fi, 11.8));
      float dropAngle = fi * 2.39996 + seed * 1.7;
      float travel = burstRadius * (0.68 + seed * 0.78);
      vec2 dropCentre = vec2(cos(dropAngle), sin(dropAngle)) * travel
        + advection * (0.018 + seed * 0.038);
      float dropRadius = mix(0.0013, 0.009, pow(hash(vec2(fi, 3.7)), 2.3));
      float body = smoothstep(dropRadius, dropRadius * 0.22, length(flow - dropCentre));
      float rim = smoothstep(dropRadius * 1.38, dropRadius * 0.76, length(flow - dropCentre));
      satellite += (body + rim * 0.22) * step(seed * 0.38, uBurst);
    }

    float transitionPeak = clamp(uTransition, 0.0, 1.0);
    float transitionInk = smoothstep(0.08, 0.78,
      transitionPeak + (fibres - 0.5) * 0.46 + sin(uv.y * 8.0 + t) * 0.025);
    float fog = smoothstep(0.34, 0.86, fibres) * transitionPeak;

    vec3 ink = vec3(0.018, 0.034, 0.026);
    vec3 green = vec3(0.055, 0.24, 0.16);
    vec3 amber = vec3(0.72, 0.46, 0.14);
    float sceneWarmth = uScene > 3.5 ? 0.72 : (uScene > 1.5 ? 0.18 : 0.48);
    vec3 colour = mix(ink, green, 0.24 + (1.0 - sceneWarmth) * 0.12);
    colour = mix(colour, amber, sceneWarmth * (wetEdge * 0.23 + burstFront * 0.1));
    colour = mix(colour, vec3(0.018, 0.068, 0.044), wetEdge * 0.38 + burstFront * 0.22);

    float holdPresence = smoothstep(0.012, 0.075, uHold);
    float alpha = (holdInk * (0.27 + uHold * 0.48 + sediment * 0.13)
      + wetEdge * 0.2 + pigmentRing * 0.2 + capillary * 0.34) * holdPresence;
    alpha = max(alpha, burst * burstLife * (0.78 + granulation * 0.12));
    alpha = max(alpha, burstFront * 0.32 + satellite * burstLife * 0.72);
    alpha = max(alpha, transitionInk * 0.9 + fog * 0.24);
    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 0.91));
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

    const scene3d = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uOrigin: { value: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2) },
      uTime: { value: 0 },
      uTransition: { value: 0 },
      uHold: { value: 0 },
      uBurst: { value: 1 },
      uScene: { value: 0 },
    };
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthTest: false, depthWrite: false });
    scene3d.add(new THREE.Mesh(geometry, material));

    const buffer = new THREE.Vector2();
    let frame = 0;
    let seenBurst = propsRef.current.burstKey;
    let burstStarted = performance.now() - 5000;
    let disposed = false;
    const resize = () => {
      const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.25));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderer.getDrawingBufferSize(buffer);
      uniforms.uResolution.value.copy(buffer);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (now: number) => {
      if (disposed) return;
      const current = propsRef.current;
      if (current.burstKey !== seenBurst) {
        seenBurst = current.burstKey;
        burstStarted = now;
      }
      const scaleX = buffer.x / Math.max(1, window.innerWidth);
      const scaleY = buffer.y / Math.max(1, window.innerHeight);
      uniforms.uOrigin.value.set(current.origin.x * scaleX, (window.innerHeight - current.origin.y) * scaleY);
      uniforms.uTime.value = now * 0.001;
      uniforms.uTransition.value += (current.transition - uniforms.uTransition.value) * (current.reducedMotion ? 1 : 0.095);
      uniforms.uHold.value += (current.holdProgress - uniforms.uHold.value) * (current.reducedMotion ? 1 : 0.12);
      uniforms.uScene.value += (current.scene - uniforms.uScene.value) * 0.07;
      uniforms.uBurst.value = Math.min(1, (now - burstStarted) / (current.reducedMotion ? 120 : 2500));
      renderer.render(scene3d, camera);
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="film-ink-field" ref={hostRef} aria-hidden="true" />;
}
