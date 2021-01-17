import regl from 'regl';
import fshader from './frag.frag';
import * as d3 from 'd3';
import { range } from 'd3';
import * as C from './constants';
import Phy from './PhysarumParticle';
import ns from 'open-simplex-noise';
import rubyCapture from '@rupertofly/capture-client';
import { loadImage } from './loadImage';
const { PI, floor, round, ceil, sin, cos } = Math;
const noise = ns.makeNoise2D(Math.random());
const info = document.createElement('pre');
const centralRand = d3.randomUniform(50);
const moss = loadImage('moss.jpg');
const road = loadImage('road.jpg');
const GL = regl(
  (document.getElementById('glcanvas') as HTMLCanvasElement).getContext(
    'webgl',
    { preserveDrawingBuffer: false }
  )!
);
let mossTex: regl.Texture;
let roadTex: regl.Texture;
const lolCanvas = document.createElement('canvas');
lolCanvas.width = 1080;
lolCanvas.height = 1080;
const cx = lolCanvas.getContext('2d');
cx.clearRect(0, 0, 1080, 1080);
cx.scale(1, -1);
cx.translate(0, -1080);
cx.fillStyle = `#020000`;
cx.font = 'bold 64pt "Marker Felt"';
cx.fillText('Slimy Friends', 100, 300);
GL.clear({ color: [0, 0, 0, 1] });
const defaultOpts: regl.DrawConfig = {
  depth: { enable: false },
  attributes: {
    position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
  },
  count: 6,
  vert: `attribute vec3 position;varying vec2 pos;void main(){gl_Position = vec4(position,1.0);pos = vec2(0.5+position.x/2.,0.5+position.y/2.);}`,
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
const noiseData = new Uint8Array(1080 * 1080 * 4);
for (let i = 0; i < noiseData.length; i += 4) {
  const ai = floor(i / 4);
  const x = ai % 1080;
  const y = Math.floor(ai / 1080);
  const n = noise(x / scale, y / scale);
  noiseData[i] = round(3 * (n + 1));
}
const BTexture = GL.texture({ shape: [C.RADIUS, C.RADIUS] });
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
const particles = new Set<Phy>();
const cSpec = new Uint8Array(4 * 255);
for (let i = 0; i < 4 * 255; i += 4) {
  const mgma = d3.rgb(d3.interpolateMagma(i / (255 * 4)));
  cSpec[i] = mgma.r;
  cSpec[i + 1] = mgma.g;
  cSpec[i + 2] = mgma.b;
  cSpec[i + 3] = 255;
}
const cTexture = GL.texture({ width: 255, height: 1, data: cSpec });

const drawFunction = GL<Uniforms, {}, Props>({
  ...defaultOpts,
  uniforms: {
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
let px: Uint8Array = new Uint8Array(1080 * 1080 * 4);
const cap = new rubyCapture(
  4646,
  document.getElementById('glcanvas') as HTMLCanvasElement
);
cap.start({
  frameRate: 60,
  lengthIsFrames: false,
  maxLength: 30,
  name: 'slime',
});
let cX = 500;
let cY = 500;
let frameCount = 0;
const draw = async () => {
  cX = 500 + 300 * cos(frameCount / 600);
  cY = 500 + 300 * sin(frameCount / 400);
  d3.range(floor(200)).map(() => {
    let x = cX + (100 - Math.random() * 200);
    let y = cY + (100 - Math.random() * 200);
    particles.add(new Phy(x, y, PI + Math.atan2(y - cY, x - cX)));
  });
  depositArray.fill(0);
  particles.forEach((pcl) => {
    if (pcl.lifeSpan <= 0) particles.delete(pcl);
  });
  particles.forEach((pcl) => {
    pcl.senseAndTurn(px);
  });
  particles.forEach((pcl) => {
    pcl.attemptMove(depositArray);
  });
  depositTexture({ shape: [1080, 1080], data: depositArray });
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

  drawFunction({
    action: ACTIONS.DECAY,
    deposit: depositTexture,
    inputTexture: BTexture,
    outputFBO: AFBO,
  });

  px = GL.read({ framebuffer: AFBO }) as any;
  // let cp = 0;
  // for (let i = 0; i < px.length; i = i + 4) cp = cp + px[i];
  // console.log(cp);

  drawFunction({
    action: ACTIONS.PASSTHROUGH,
    deposit: depositTexture,
    inputTexture: ATexture,
    outputFBO: BFBO,
  });
  drawFunction({
    action: ACTIONS.RENDER,
    deposit: mossTex,
    bT: roadTex,
    inputTexture: ATexture,
    outputFBO: null,
  });
  GL._gl.flush();
  await cap.capture();
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
