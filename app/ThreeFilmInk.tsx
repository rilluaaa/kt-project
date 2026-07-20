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

  void main() {
    vec2 frag = gl_FragCoord.xy;
    float shortest = min(uResolution.x, uResolution.y);
    vec2 p = (frag - uOrigin) / shortest;
    vec2 uv = frag / uResolution;
    float t = uTime * 0.09;
    float fibres = fbm(vec2(uv.x * 7.0 - t, uv.y * 10.0 + t * 0.7));
    float veins = fbm(vec2(atan(p.y, p.x) * 5.0, length(p) * 46.0 - t));

    float holdRadius = mix(0.018, 0.19, pow(uHold, 0.68));
    float holdEdge = holdRadius + (fibres - 0.5) * 0.052 + (veins - 0.5) * 0.018;
    float holdInk = smoothstep(holdEdge + 0.018, holdEdge - 0.015, length(p));
    float wetEdge = smoothstep(holdEdge + 0.065, holdEdge + 0.006, length(p)) * (1.0 - holdInk * 0.55);

    float burstRadius = uBurst * 1.35;
    float burstEdge = burstRadius + (fbm(p * 3.2 - t) - 0.5) * 0.3 * uBurst;
    float burst = smoothstep(burstEdge + 0.11, burstEdge - 0.08, length(p));

    float transitionPeak = sin(uTransition * 3.14159265);
    float sweep = uv.x + (fibres - 0.5) * 0.34 + sin(uv.y * 5.0 + t) * 0.035;
    float entering = smoothstep(uTransition - 0.22, uTransition + 0.08, sweep);
    float leaving = 1.0 - smoothstep(uTransition + 0.12, uTransition + 0.42, sweep);
    float transitionInk = entering * leaving * transitionPeak;
    float fog = smoothstep(0.42, 0.88, fibres) * transitionPeak;

    vec3 ink = vec3(0.018, 0.034, 0.026);
    vec3 green = vec3(0.055, 0.24, 0.16);
    vec3 amber = vec3(0.72, 0.46, 0.14);
    vec3 colour = mix(ink, green, 0.2 + (1.0 - uScene) * 0.16);
    colour = mix(colour, amber, uScene * (wetEdge * 0.34 + burst * 0.16));

    float alpha = holdInk * (0.3 + uHold * 0.52) + wetEdge * 0.24;
    alpha = max(alpha, burst * (1.0 - uBurst) * 0.9);
    alpha = max(alpha, transitionInk * 0.84 + fog * 0.18);
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
