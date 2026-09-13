/*!
 * 图合 PDF 首页环境背景：流体玻璃（WebGL）+ 流云粒子（Canvas 2D）。
 *
 * 流体着色器与渲染核心改编自 fluidglass-ui
 *   https://github.com/csuyincs-creator/fluidglass-ui
 * Copyright 2026 csuyincs-creator
 * Licensed under the Apache License, Version 2.0
 * （许可证全文见 vendor/fluidglass-ui/LICENSE.fluidglass-ui）
 *
 * 本项目改动：逐字保留 canonical 顶点/片元着色器与编译流程；
 * 将「固定 144px 指标卡片」形态改造为单张全屏环境背景画布，
 * 新增双主题调色板、流云粒子层、工作台首页可见性暂停；
 * 移除原项目的卡片配置、设置面板、localStorage 持久化与导出功能。
 */

interface AmbientPalette {
  a: string;
  b: string;
  c: string;
  intensity: number;
  speed: number;
  surface: number;
  particles: string[];
  clouds: string[];
}

/** 深色主题（默认）：深绿底 + 品牌绿流体，克制的环境光。 */
const PALETTE_DARK: AmbientPalette = {
  a: '#0e3527',
  b: '#46c68f',
  c: '#07130e',
  intensity: 1.18,
  speed: 0.5,
  surface: 0.1,
  particles: ['#7fd6ab', '#8fd8c8', '#c9b09a'],
  clouds: ['#2e8b6a', '#3fa88c', '#77b9c4'],
};

/** 亮色主题：浅底上用「白瓷水洗」——低饱和浅绿 + 低 intensity，
 *  让合成后的背景落在 canvas 附近的亮区，浅色主题的正文 token 才能保持 AA。 */
const PALETTE_LIGHT: AmbientPalette = {
  a: '#dfeee7',
  b: '#bcdccb',
  c: '#f2f7f4',
  intensity: 1.05,
  speed: 0.45,
  surface: 0.05,
  particles: ['#4f8f74', '#5c9a86', '#5a93a3'],
  clouds: ['#bfe0cd', '#a9d2bd', '#c7e2e8'],
};

interface QualityProfile {
  name: 'high' | 'balanced' | 'eco' | 'static';
  fps: number;
  dpr: number;
}

/** 与 fluidglass-ui qualityProfile 同源的分档逻辑（去掉 URL 参数入口）。 */
function resolveQuality(): QualityProfile {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return { name: 'static', fps: 0, dpr: 1 };
  const conn = (navigator as { connection?: { saveData?: boolean } })
    .connection;
  const saveData = Boolean(conn && conn.saveData);
  const lowCpu = (navigator.hardwareConcurrency || 8) <= 4;
  const lowMemory =
    ((navigator as { deviceMemory?: number }).deviceMemory || 8) <= 4;
  if (saveData || lowCpu || lowMemory)
    return { name: 'eco', fps: 24, dpr: Math.min(devicePixelRatio || 1, 1) };
  return {
    name: 'balanced',
    fps: 45,
    dpr: Math.min(devicePixelRatio || 1, 1.35),
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
}

function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(
    b * 255
  )},${alpha})`;
}

function clamp(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, n));
}

/* ===== 以下为 fluidglass-ui canonical 着色器，逐字保留，不得修改 ===== */
const VERTEX_SHADER = `    attribute vec2 a_position;
    varying vec2 v_uv;
    void main(){
      v_uv=a_position*.5+.5;
      gl_Position=vec4(a_position,0.0,1.0);
    }

`;
const FRAGMENT_SHADER = `    precision highp float;
    varying vec2 v_uv;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform vec2 u_mouseVelocity;
    uniform float u_mouseMix;
    uniform float u_time;
    uniform float u_speed;
    uniform float u_intensity;
    uniform float u_pointer;
    uniform float u_seed;
    uniform float u_surfaceOpacity;
    uniform vec3 u_colorA;
    uniform vec3 u_colorB;
    uniform vec3 u_colorC;

    float hash(vec2 p){
      p=fract(p*vec2(123.34,456.21));
      p+=dot(p,p+45.32);
      return fract(p.x*p.y);
    }
    float noise(vec2 p){
      vec2 i=floor(p),f=fract(p);
      f=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);
    }
    float fbm(vec2 p){
      float value=0.0;
      float amp=.53;
      mat2 rot=mat2(.80,-.60,.60,.80);
      for(int i=0;i<5;i++){
        value+=amp*noise(p);
        p=rot*p*2.02+vec2(17.13,9.27);
        amp*=.49;
      }
      return value;
    }
    float softBlob(vec2 p,vec2 center,float radius,float softness){
      return 1.0-smoothstep(radius-softness,radius+softness,length(p-center));
    }
    void main(){
      vec2 uv=v_uv;
      float aspect=u_resolution.x/max(1.0,u_resolution.y);
      vec2 p=(uv-.5)*vec2(aspect,1.0);
      vec2 mouse=(u_mouse-.5)*vec2(aspect,1.0);
      vec2 delta=p-mouse;
      float dist=length(delta);
      float mouseField=exp(-dist*dist*7.2)*u_mouseMix*u_pointer;
      vec2 normal=delta/max(dist,.035);
      vec2 tangent=vec2(-normal.y,normal.x);
      p+=normal*mouseField*.115+tangent*mouseField*(u_mouseVelocity.x-u_mouseVelocity.y)*.045;

      float t=u_time*u_speed;
      vec2 seedVec=vec2(u_seed*1.713,u_seed*.937);
      float w1=fbm(p*1.22+seedVec+vec2(t*.075,-t*.052));
      float w2=fbm(p*1.54-seedVec*.37+vec2(-t*.057,t*.064)+w1*.82);
      vec2 q=p+(vec2(w1,w2)-.5)*(.58*u_intensity);
      float broad=fbm(q*1.12+vec2(t*.041,-t*.033));
      float detail=fbm(q*2.18+vec2(-t*.083,t*.057)+broad*.95);
      float ribbon=.5+.5*sin(q.x*3.15+q.y*.76+detail*5.0+t*.25+u_seed);
      float colorMix=smoothstep(.16,.88,broad*.61+ribbon*.39);
      vec3 fluid=mix(u_colorA,u_colorB,colorMix);
      float shadow=smoothstep(.43,.84,detail*.69+(.5+.5*sin(q.y*4.2-q.x*.8-t*.17))*.31);
      fluid=mix(fluid,u_colorC,shadow*.74);

      float plume1=softBlob(p,vec2(aspect*.23+.12*sin(t*.08+u_seed),.16*cos(t*.11+u_seed)),.52,.38);
      float plume2=softBlob(p,vec2(aspect*.39+.10*cos(t*.07-u_seed),-.24+.11*sin(t*.09)),.43,.34);
      float haze=clamp(plume1*.72+plume2*.58,0.0,1.0);
      float reveal=smoothstep(.055,.735,uv.x+(.5-broad)*.27+.070*sin(uv.y*4.0+t*.12));
      reveal*=mix(.70,1.0,haze);
      reveal=clamp(reveal*u_intensity,0.0,1.0);

      float spec=pow(clamp(1.0-abs(detail-.52)*2.0,0.0,1.0),5.0)*reveal;
      float caustic=pow(clamp(.52+.48*sin((q.x-q.y)*5.2+detail*7.0-t*.18),0.0,1.0),7.0)*reveal;
      vec3 cyanGlow=mix(fluid,vec3(.34,1.0,.90),spec*.18+caustic*.09);
      cyanGlow*=.78+.25*haze;
      cyanGlow=mix(cyanGlow,cyanGlow*.70,u_surfaceOpacity*.34);
      float filament=smoothstep(.48,.86,detail)*reveal;
      float density=clamp(reveal*(.36+.48*haze)+filament*.22+mouseField*.28,0.0,1.0);
      float alpha=clamp(.035*haze+density*(.24+.50*u_intensity)+spec*.08+u_surfaceOpacity*density*.14,0.0,.92);
      float edgeFade=smoothstep(1.08,.70,length((uv-.5)*vec2(1.0,.92)));
      alpha*=edgeFade;
      cyanGlow=pow(max(cyanGlow,0.0),vec3(.94));
      gl_FragColor=vec4(cyanGlow,alpha);
    }

`;
/* ===== canonical 着色器结束 ===== */

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Shader allocation failed');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Shader compile failed';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function buildProgram(gl: WebGLRenderingContext): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('Program allocation failed');
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(program) || 'Program link failed');
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  return program;
}

const UNIFORM_NAMES = [
  'u_resolution',
  'u_mouse',
  'u_mouseVelocity',
  'u_mouseMix',
  'u_time',
  'u_speed',
  'u_intensity',
  'u_pointer',
  'u_seed',
  'u_surfaceOpacity',
  'u_colorA',
  'u_colorB',
  'u_colorC',
] as const;

/** 全屏流体玻璃背景渲染器（改编自 FluidGlassRenderer，单画布、监听窗口指针）。 */
class FluidBackground {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private uniforms: Partial<
    Record<(typeof UNIFORM_NAMES)[number], WebGLUniformLocation | null>
  > = {};
  private profile: QualityProfile;
  private palette: AmbientPalette;
  private lastFrame = 0;
  private mouse: [number, number] = [0.72, 0.55];
  private mouseTarget: [number, number] = [0.72, 0.55];
  private mouseVelocity: [number, number] = [0, 0];
  private mouseMix = 0;
  private pointerActive = false;
  running = true;
  failed = false;

  constructor(canvas: HTMLCanvasElement, profile: QualityProfile) {
    this.canvas = canvas;
    this.profile = profile;
    this.palette = currentPalette();
    let last: [number, number] = [0, 0];
    let lastT = 0;
    window.addEventListener(
      'pointermove',
      (event) => {
        const x = clamp(event.clientX / Math.max(innerWidth, 1), 0, 1);
        const y = clamp(1 - event.clientY / Math.max(innerHeight, 1), 0, 1);
        const now = performance.now();
        const dt = Math.max(8, now - lastT || 16);
        this.mouseTarget = [x, y];
        this.mouseVelocity = [
          clamp((x - last[0]) / (dt / 16.67), -0.12, 0.12),
          clamp((y - last[1]) / (dt / 16.67), -0.12, 0.12),
        ];
        last = [x, y];
        lastT = now;
        this.pointerActive = true;
        this.mouseMix = Math.max(this.mouseMix, 0.9);
      },
      { passive: true }
    );
    document.addEventListener('pointerleave', () => {
      this.pointerActive = false;
    });
    this.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.fallback();
    });
    window.addEventListener('resize', () => this.resize());
  }

  init(): boolean {
    try {
      const gl = this.canvas.getContext('webgl', {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference:
          this.profile.name === 'eco' ? 'low-power' : 'high-performance',
      });
      if (!gl) throw new Error('WebGL context unavailable');
      this.gl = gl;
      gl.clearColor(0, 0, 0, 0);
      this.program = buildProgram(gl);
      gl.useProgram(this.program);
      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );
      const pos = gl.getAttribLocation(this.program, 'a_position');
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
      UNIFORM_NAMES.forEach((name) => {
        this.uniforms[name] = gl.getUniformLocation(this.program!, name);
      });
      this.resize();
      return true;
    } catch (error) {
      console.warn(
        '[TuHe ambient-bg] WebGL 初始化失败，已降级为静态渐变',
        error
      );
      this.fallback();
      return false;
    }
  }

  private fallback(): void {
    this.failed = true;
    this.destroyGl();
    this.canvas.classList.add('is-fallback');
  }

  private destroyGl(): void {
    const gl = this.gl;
    if (gl) {
      try {
        if (this.program) gl.deleteProgram(this.program);
        if (this.buffer) gl.deleteBuffer(this.buffer);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      } catch (_) {
        /* 忽略销毁异常 */
      }
    }
    this.gl = null;
    this.program = null;
    this.buffer = null;
  }

  setPalette(palette: AmbientPalette): void {
    this.palette = palette;
    if (this.profile.name === 'static') this.renderFrame(4800);
  }

  private resize(): void {
    if (!this.gl) return;
    const dpr = this.profile.dpr;
    const width = Math.max(2, Math.round(innerWidth * dpr));
    const height = Math.max(2, Math.round(innerHeight * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.gl.viewport(0, 0, width, height);
    }
  }

  /** 渲染单帧；now 为毫秒时间戳。 */
  private renderFrame(now: number): void {
    const gl = this.gl;
    if (!gl || !this.program) return;
    this.mouse[0] += (this.mouseTarget[0] - this.mouse[0]) * 0.105;
    this.mouse[1] += (this.mouseTarget[1] - this.mouse[1]) * 0.105;
    this.mouseVelocity[0] *= 0.9;
    this.mouseVelocity[1] *= 0.9;
    this.mouseMix += ((this.pointerActive ? 1 : 0) - this.mouseMix) * 0.075;
    if (!this.pointerActive) this.mouseMix *= 0.945;
    const p = this.palette;
    gl.useProgram(this.program);
    gl.uniform2f(
      this.uniforms.u_resolution!,
      this.canvas.width,
      this.canvas.height
    );
    gl.uniform2f(this.uniforms.u_mouse!, this.mouse[0], this.mouse[1]);
    gl.uniform2f(
      this.uniforms.u_mouseVelocity!,
      this.mouseVelocity[0],
      this.mouseVelocity[1]
    );
    gl.uniform1f(this.uniforms.u_mouseMix!, clamp(this.mouseMix, 0, 1.2));
    gl.uniform1f(this.uniforms.u_time!, now * 0.001);
    gl.uniform1f(this.uniforms.u_speed!, p.speed);
    gl.uniform1f(this.uniforms.u_intensity!, p.intensity);
    gl.uniform1f(this.uniforms.u_pointer!, 0.8);
    gl.uniform1f(this.uniforms.u_seed!, 1.7);
    gl.uniform1f(this.uniforms.u_surfaceOpacity!, p.surface);
    gl.uniform3fv(this.uniforms.u_colorA!, hexToRgb(p.a));
    gl.uniform3fv(this.uniforms.u_colorB!, hexToRgb(p.b));
    gl.uniform3fv(this.uniforms.u_colorC!, hexToRgb(p.c));
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /** RAF 驱动；返回 false 表示本帧跳过（限帧/暂停）。 */
  render(now: number): boolean {
    if (!this.gl || !this.running || document.hidden) return false;
    if (this.profile.fps <= 0) return false;
    const interval = 1000 / this.profile.fps;
    if (now - this.lastFrame < interval) return false;
    this.lastFrame = now;
    this.renderFrame(now);
    return true;
  }

  /** 静态模式（prefers-reduced-motion）：只渲染一帧固定时间的画面。 */
  renderStatic(): void {
    this.renderFrame(4800);
  }
}

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  phase: number;
}

interface Cloud {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
}

/** 流云粒子层：少量大半径低透明度「流云」+ 漂浮微光粒子。 */
class ParticleField {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private particles: Particle[] = [];
  private clouds: Cloud[] = [];
  private palette: AmbientPalette;
  running = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.palette = currentPalette();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.max(2, Math.round(innerWidth * dpr));
    this.canvas.height = Math.max(2, Math.round(innerHeight * dpr));
    this.seed();
  }

  setPalette(palette: AmbientPalette): void {
    this.palette = palette;
    this.recolor();
  }

  private seed(): void {
    const area = this.canvas.width * this.canvas.height;
    const count = clamp(Math.round(area / 42000), 24, 56);
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    this.particles = Array.from({ length: count }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      r: rand(0.9, 2.6),
      vx: rand(-0.08, 0.08),
      vy: rand(-0.16, -0.04),
      color: '',
      alpha: rand(0.14, 0.42),
      phase: Math.random() * Math.PI * 2,
    }));
    this.clouds = Array.from({ length: 5 }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      r: rand(140, 320),
      vx: rand(-0.05, 0.05),
      vy: rand(-0.03, 0.03),
      color: '',
      alpha: rand(0.035, 0.07),
    }));
    this.recolor();
  }

  private recolor(): void {
    this.particles.forEach(
      (p, i) =>
        (p.color = this.palette.particles[i % this.palette.particles.length])
    );
    this.clouds.forEach(
      (c, i) => (c.color = this.palette.clouds[i % this.palette.clouds.length])
    );
  }

  render(now: number): boolean {
    const ctx = this.ctx;
    if (!ctx || !this.running || document.hidden) return false;
    const { width, height } = this.canvas;
    ctx.clearRect(0, 0, width, height);
    for (const cloud of this.clouds) {
      cloud.x += cloud.vx;
      cloud.y += cloud.vy;
      if (cloud.x < -cloud.r) cloud.x = width + cloud.r;
      if (cloud.x > width + cloud.r) cloud.x = -cloud.r;
      if (cloud.y < -cloud.r) cloud.y = height + cloud.r;
      if (cloud.y > height + cloud.r) cloud.y = -cloud.r;
      const gradient = ctx.createRadialGradient(
        cloud.x,
        cloud.y,
        0,
        cloud.x,
        cloud.y,
        cloud.r
      );
      gradient.addColorStop(0, hexToRgba(cloud.color, cloud.alpha));
      gradient.addColorStop(1, hexToRgba(cloud.color, 0));
      ctx.fillStyle = gradient;
      ctx.fillRect(
        cloud.x - cloud.r,
        cloud.y - cloud.r,
        cloud.r * 2,
        cloud.r * 2
      );
    }
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -8) {
        p.y = height + 8;
        p.x = Math.random() * width;
      }
      if (p.x < -8) p.x = width + 8;
      if (p.x > width + 8) p.x = -8;
      const twinkle = 0.72 + 0.28 * Math.sin(now * 0.0011 + p.phase);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(p.color, p.alpha * twinkle);
      ctx.fill();
    }
    return true;
  }
}

function currentPalette(): AmbientPalette {
  return document.documentElement.dataset.theme === 'light'
    ? PALETTE_LIGHT
    : PALETTE_DARK;
}

function initAmbientBackground(): void {
  const home = document.getElementById('tuhe-home');
  const glCanvas = document.getElementById(
    'tuhe-ambient-gl'
  ) as HTMLCanvasElement | null;
  const fxCanvas = document.getElementById(
    'tuhe-ambient-fx'
  ) as HTMLCanvasElement | null;
  if (!home || !glCanvas || !fxCanvas) return;

  const profile = resolveQuality();
  const container = glCanvas.parentElement;
  container?.classList.toggle('is-static', profile.name === 'static');

  let fluid: FluidBackground | null = null;
  if (profile.name !== 'static') {
    fluid = new FluidBackground(glCanvas, profile);
    if (!fluid.init()) fluid = null;
  } else {
    // 减少动态偏好：仍用 WebGL 画一帧静止流体，画不了就留在 CSS 渐变兜底。
    const still = new FluidBackground(glCanvas, profile);
    if (still.init()) {
      fluid = still;
      fluid.renderStatic();
    }
  }
  const particles =
    profile.name === 'static' ? null : new ParticleField(fxCanvas);
  if (!particles) fxCanvas.classList.add('is-hidden');

  // 主题切换：跟随 <html data-theme>（由 theme-init.js / theme.ts 维护）。
  new MutationObserver(() => {
    const palette = currentPalette();
    fluid?.setPalette(palette);
    particles?.setPalette(palette);
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  // 工具标签页打开时首页隐藏，背景整体暂停，不浪费 GPU。
  let homeVisible = !home.classList.contains('hidden-home');
  new MutationObserver(() => {
    homeVisible = !home.classList.contains('hidden-home');
    if (fluid) fluid.running = homeVisible;
    if (particles) particles.running = homeVisible;
  }).observe(home, { attributes: true, attributeFilter: ['class'] });

  if (fluid) fluid.running = homeVisible;
  if (particles) particles.running = homeVisible;

  if (profile.name !== 'static') {
    const loop = (now: number) => {
      fluid?.render(now);
      particles?.render(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAmbientBackground);
} else {
  initAmbientBackground();
}
