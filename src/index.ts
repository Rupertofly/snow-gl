import regl from 'regl';
import fshader from './frag.frag';
import * as d3 from 'd3';
import { range } from 'd3';
document.getElementsByTagName('h1')[0].innerHTML = 'bae';
const info = document.createElement('pre');
document.body.append(info);
const GL = regl(
  document
    .getElementsByTagName('canvas')[0]
    .getContext('webgl', { preserveDrawingBuffer: false })
);
GL.clear({ color: [0, 0, 0, 1] });
const defaultOpts: regl.DrawConfig = {
  attributes: {
    position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
  },
  count: 6,
  vert: `attribute vec3 position;varying vec2 pos;void main(){gl_Position = vec4(position,1.0);pos = vec2(0.5+position.x/2.,0.5+position.y/2.);}`,
};
const c = d3.randomBates(32);
const d = d3.randomUniform(699);
const tex = GL.texture({ shape: [720, 720] });
const mex = GL.texture({ shape: [720, 720] });
const dr = GL<{}, {}, { fbo: any; tex: any, tick:any }>({
  ...defaultOpts,
  frag: fshader,
  uniforms: { t: (c,p) => p.tick, tex: (c,p) => p.tex},
  framebuffer: (c, p) => p.fbo || null,
});
const mexFBO = GL.framebuffer({ color: mex,depth:false,colorType:'float' });
let fc: any;
const px: Uint8Array = new Uint8Array(720*720*4)
const draw: regl.FrameCallback = (cxt) => {

};
GL.frame(draw);
