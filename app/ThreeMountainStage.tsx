"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type MountainStageProps = {
  opacity: number;
  cameraPhase: number;
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
  uniform sampler2D uMap;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uPhase;

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
    vec2 baseUv = coverUv(vUv);
    float phase = smoothstep(0.0, 1.0, uPhase);
    vec3 base = texture2D(uMap, baseUv).rgb;
    float darkness = 1.0 - dot(base, vec3(0.299, 0.587, 0.114));

    float zoom = 1.0 + phase * 0.038;
    vec2 drift = vec2(phase * 0.013, -phase * 0.006);
    vec2 movedUv = (baseUv - 0.5) / zoom + 0.5 + drift;
    movedUv += vec2(darkness * phase * 0.006, -darkness * phase * 0.0025);
    vec3 colour = texture2D(uMap, movedUv).rgb;

    float motion = smoothstep(0.025, 0.14, phase);
    float mist = fbm(vec2(vUv.x * 3.8 + uTime * 0.018, vUv.y * 2.8 - uTime * 0.012));
    float fineMist = fbm(vec2(vUv.x * 8.0 - uTime * 0.025, vUv.y * 5.4 + uTime * 0.016));
    float cityBand = smoothstep(0.88, 0.38, vUv.y) * smoothstep(0.08, 0.34, vUv.y);
    float mistAlpha = smoothstep(0.48, 0.78, mist) * cityBand * 0.2 * motion;
    mistAlpha += smoothstep(0.62, 0.84, fineMist) * 0.055 * motion;
    colour = mix(colour, vec3(0.88, 0.86, 0.81), mistAlpha);

    float fibre = noise(gl_FragCoord.xy * 0.38) - 0.5;
    colour += fibre * 0.012;

    float edgeDistance = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float closing = smoothstep(0.74, 1.0, phase);
    float inkNoise = fbm(vUv * 4.6 + vec2(uTime * 0.015, -uTime * 0.01));
    float inkEdge = smoothstep(0.16 + inkNoise * 0.12, 0.0, edgeDistance) * closing;
    colour = mix(colour, vec3(0.025, 0.032, 0.027), inkEdge * 0.72);

    gl_FragColor = vec4(colour, 1.0);
  }
`;

export default function ThreeMountainStage({ opacity, cameraPhase, reducedMotion }: MountainStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ cameraPhase, reducedMotion });

  useEffect(() => {
    propsRef.current = { cameraPhase, reducedMotion };
  }, [cameraPhase, reducedMotion]);

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
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const texture = new THREE.TextureLoader().load("/ink/scene-01-mountain-city.webp");
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const uniforms = {
      uMap: { value: texture },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uPhase: { value: 0 },
    };
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
    scene.add(new THREE.Mesh(geometry, material));

    const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
    let disposed = false;
    let frame = 0;
    let visible = !document.hidden;

    const resize = () => {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.25));
      renderer.setSize(width, height, false);
      renderer.getDrawingBufferSize(uniforms.uResolution.value);
    };
    const onVisibility = () => { visible = !document.hidden; };
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    resize();

    const draw = (now: number) => {
      if (disposed) return;
      if (visible) {
        const props = propsRef.current;
        const targetPhase = props.reducedMotion ? 0 : Math.min(1, Math.max(0, props.cameraPhase / 2.95));
        uniforms.uPhase.value += (targetPhase - uniforms.uPhase.value) * 0.085;
        uniforms.uTime.value = now * 0.001;
        renderer.render(scene, camera);
      }
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="mountain-webgl" style={{ opacity }} ref={hostRef} aria-hidden="true" />;
}
