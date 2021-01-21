import regl from 'regl';
import fshader from './frag.frag';
import * as d3 from 'd3';
import { range } from 'd3';
import * as C from './constants';
import Phy from './PhysarumParticle';
import ns from 'open-simplex-noise';
import rubyCapture from '@rupertofly/capture-client';
import { loadImage } from './loadImage';
const { PI, floor, round, ceil, sin, cos, random: rnd } = Math;
const TAU = PI * 2;
const noise = ns.makeNoise2D(Math.random());
const info = document.createElement('pre');
const centralRand = d3.randomUniform(50);
const moss = loadImage('moss.jpg');
const road = loadImage('road.jpg');
const glCanvas = document.getElementById('glcanvas') as HTMLCanvasElement;
glCanvas.width = C.RADIUS;
glCanvas.height = C.RADIUS;
const GL = regl(
  glCanvas.getContext('webgl', { preserveDrawingBuffer: false })!
);
let mossTex: regl.Texture;
let roadTex: regl.Texture;
const particleEnv = document.createElement('canvas');
particleEnv.width = C.RADIUS;
particleEnv.height = C.RADIUS;
const envCxt = particleEnv.getContext('2d');
envCxt.clearRect(0, 0, C.RADIUS, C.RADIUS);
envCxt.scale(1, -1);
envCxt.translate(0, -1 * C.RADIUS);
envCxt.fillStyle = `#020000`;
envCxt.font = 'bold 64pt "Marker Felt"';
envCxt.fillText('Slimy Friends', 100, 300);
GL.clear({ color: [0, 0, 0, 1] });
const defaultREGLOptions: regl.DrawConfig = {
  depth: { enable: false },
  attributes: {
    position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
  },
  count: 6,
  vert: `attribute vec3 position;varying vec2 pos;void main(){gl_Position = vec4(position,1.0);pos = vec2(0.5+position.x/2.,0.5+position.y/2.);}`,
};
const palleteData = new Uint8Array(4 * 255);
const palInterpolator = d3.interpolateLab('#fd9761', '#4a4083');
for (let i = 0; i < 4 * 255; i += 4) {
  const amount = i / (255 * 4);
  const mgma = d3.rgb(palInterpolator(d3.easeCubicOut(amount)));
  palleteData[i] = mgma.r;
  palleteData[i + 1] = mgma.g;
  palleteData[i + 2] = mgma.b;
  palleteData[i + 3] = 255;
}
const palleteTexture = GL.texture({ width: 255, height: 1, data: palleteData });

const defaultUniforms = {
  u_size: [C.RADIUS, C.RADIUS],
  u_pallete: palleteTexture,
};
const depositArray = new Uint8Array(C.RADIUS * C.RADIUS * 4).fill(0);
const depositTexture = GL.texture({
  width: C.RADIUS,
  height: C.RADIUS,
  data: depositArray,
});
const ATexture = GL.texture({ shape: [C.RADIUS, C.RADIUS] });
const AFBO = GL.framebuffer({
  color: ATexture,
  colorType: 'uint8',
  depth: false,
});
const scale = 20;
const noiseData = new Uint8Array(C.RADIUS * C.RADIUS * 4);
for (let i = 0; i < noiseData.length; i += 4) {
  const ai = floor(i / 4);
  const x = ai % C.RADIUS;
  const y = Math.floor(ai / C.RADIUS);
  const n = noise(x / scale, y / scale);
  noiseData[i] = round(20 * (n + 1));
}
const BTexture = GL.texture({
  shape: [C.RADIUS, C.RADIUS],
  data: noiseData,
});
const BaseTexture = GL.texture({
  shape: [C.RADIUS, C.RADIUS],
  data: noiseData,
});
const BFBO = GL.framebuffer({
  color: BTexture,
  colorType: 'uint8',
  depth: false,
});

enum ACTIONS {
  DEPOSIT = 0,
  DIFUSE = 1,
  DECAY = 2,
  RENDER = 3,
  PASSTHROUGH = 4,
}
type Uniforms = {
  u_resolution: [number, number];
  u_incomingTexture: regl.Texture;
  u_depositTexture: regl.Texture;
  u_baseTexture: regl.Texture;
  u_pass: number;
};
type Props = {
  deposit: regl.Texture;
  inputTexture: regl.Texture;
  outputFBO: regl.Framebuffer | null;
  action: ACTIONS;
  bT?: regl.Texture;
};
let particles: Phy[] = [];
const positionMatrix = new Uint8Array(Math.pow(C.RADIUS, 2));
const drawFunction = GL<Uniforms, {}, Props>({
  ...defaultREGLOptions,
  uniforms: {
    ...defaultUniforms,
    u_baseTexture: (c, p) => p.bT || BaseTexture,
    u_depositTexture: (c, p) => p.deposit,
    u_incomingTexture: (c, p) => p.inputTexture,
    u_pass: (c, p) => p.action,
    u_resolution: (c) => [c.drawingBufferWidth, c.drawingBufferHeight],
  },
  frag: fshader,
  framebuffer: (c, p) => p.outputFBO,
});
let fc: any;
let px: Uint8Array = new Uint8Array(C.RADIUS * C.RADIUS * 4);
// const cap = new rubyCapture(
//   4646,
//   document.getElementById('glcanvas') as HTMLCanvasElement
// );
// cap.start({
//   frameRate: 60,
//   lengthIsFrames: false,
//   maxLength: 30,
//   name: 'slime',
// });
let cX = C.RADIUS / 2;
let cY = C.RADIUS / 2;
let frameCount = 0;
const radius = C.RADIUS / 4;

d3.range(floor(Math.pow(C.RADIUS, 2) * 0.15)).map(() => {
  const ang = rnd() * TAU;
  let x = rnd() * C.RADIUS;
  let y = rnd() * C.RADIUS;
  particles.push(new Phy(x, y, positionMatrix, rnd() * PI * 2));
});
const draw = async () => {
  // cX = C.RADIUS / 2 + 300 * cos(frameCount / 600);
  // cY = C.RADIUS / 2 + 300 * sin(frameCount / 400);

  depositArray.fill(0);
  particles.forEach((pcl) => {
    if (pcl.lifeSpan <= 0) particles.splice(particles.indexOf(pcl), 1);
  });
  particles.forEach((pcl) => {
    pcl.senseAndTurn(px);
  });
  particles.forEach((pcl) => {
    pcl.attemptMove(depositArray);
  });
  particles = d3.shuffle(particles);
  depositTexture({ shape: [C.RADIUS, C.RADIUS], data: depositArray });
  drawFunction({
    action: ACTIONS.DEPOSIT,
    deposit: depositTexture,
    inputTexture: BTexture,
    outputFBO: AFBO,
  });

  drawFunction({
    action: ACTIONS.DIFUSE,
    deposit: depositTexture,
    inputTexture: ATexture,
    outputFBO: BFBO,
  });

  px = GL.read({ framebuffer: BFBO }) as any;
  // let cp = 0;
  // for (let i = 0; i < px.length; i = i + 4) cp = cp + px[i];
  // console.log(cp);

  drawFunction({
    action: ACTIONS.RENDER,
    deposit: mossTex,
    bT: roadTex,
    inputTexture: BTexture,
    outputFBO: null,
  });
  GL._gl.flush();
  // await cap.capture();
  frameCount = frameCount + 1;
  requestAnimationFrame(draw);
};
const startup = async () => {
  await Promise.all([moss, road]);
  mossTex = GL.texture({
    data: await moss,
    wrap: 'repeat',
  });
  roadTex = GL.texture({
    data: await road,
    wrap: 'repeat',
  });

  requestAnimationFrame(draw);
};
startup();
