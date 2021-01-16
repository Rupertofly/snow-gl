precision mediump float;
uniform sampler2D tex;
varying vec2 pos;
void main() {
  float x = gl_FragCoord.x;
  float y = gl_FragCoord.y;
  vec4 color;
  color = vec4(texture2D(tex,pos/1.).rgb,1.);
  gl_FragColor = color;
}