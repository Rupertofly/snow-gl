#define PASS_DEPOSIT 0
#define PASS_DIFUSE 1
#define PASS_DECAY 2
#define PASS_RENDER 3
#define PASS_PASSTHROUGH 4
#define C_DEPOSIT 5.
#define DECAY_VALUE 0.1

precision mediump float;
uniform sampler2D u_incomingTexture;
uniform sampler2D u_depositTexture;
uniform sampler2D u_baseTexture;
uniform sampler2D u_pallete;
uniform int u_pass;

uniform vec2 u_resolution;
varying vec2 pos;

vec3 deposit(vec2 coords) {
  vec2 uv = coords/u_resolution;
  float depValue = texture2D(u_depositTexture,uv).r;
  float depHeading = texture2D(u_depositTexture,uv).g;
  vec3 existingValue = texture2D(u_incomingTexture,uv).rgb;
  vec3 cl = existingValue+vec3(depValue,0.,0.);
  return vec3(cl.r,depHeading,0.);

}
vec3 diffuse(vec2 coords) {
  vec2 uv = coords/u_resolution;
  vec4 pre = texture2D(u_incomingTexture,uv);
  float majorHeading = pre.g;
  float acc = 0.;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec2 nUV = vec2((coords.x+float(x))/u_resolution.x,(coords.y+float(y))/u_resolution.y);
      vec3 nVal = texture2D(u_incomingTexture,nUV).rgb;
      acc = acc + nVal.r;
    }
  }
  float avgVal = acc/9.;
  float decay = DECAY_VALUE * avgVal;
  return vec3(avgVal - decay,majorHeading,pre.b);

}
vec3 decay(vec2 coords) {
  vec2 uv = coords/u_resolution;
  vec3 incomingValue = texture2D(u_incomingTexture,uv).rgb;
  float newValue = incomingValue.r- DECAY_VALUE *incomingValue.r;
  return vec3(newValue,incomingValue.gb);

}
vec3 passthrough(vec2 coords) {
  vec2 uv = coords/u_resolution;
  vec3 incomingValue = texture2D(u_incomingTexture,uv).rgb;
  return vec3(incomingValue);

}

float hue2rgb(float f1, float f2, float hue) {
    if (hue < 0.0)
        hue += 1.0;
    else if (hue > 1.0)
        hue -= 1.0;
    float res;
    if ((6.0 * hue) < 1.0)
        res = f1 + (f2 - f1) * 6.0 * hue;
    else if ((2.0 * hue) < 1.0)
        res = f2;
    else if ((3.0 * hue) < 2.0)
        res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
    else
        res = f1;
    return res;
}

vec3 hsl2rgb(vec3 hsl) {
    vec3 rgb;

    if (hsl.y == 0.0) {
        rgb = vec3(hsl.z); // Luminance
    } else {
        float f2;

        if (hsl.z < 0.5)
            f2 = hsl.z * (1.0 + hsl.y);
        else
            f2 = hsl.z + hsl.y - hsl.y * hsl.z;

        float f1 = 2.0 * hsl.z - f2;

        rgb.r = hue2rgb(f1, f2, hsl.x + (1.0/3.0));
        rgb.g = hue2rgb(f1, f2, hsl.x);
        rgb.b = hue2rgb(f1, f2, hsl.x - (1.0/3.0));
    }
    return rgb;
}

vec3 hsl2rgb(float h, float s, float l) {
    return hsl2rgb(vec3(h, s, l));
}

vec3 render(vec2 coords) {
  vec2 uv = coords/u_resolution;
  vec3 incomingValue = texture2D(u_incomingTexture,uv).rgb;
  float val = incomingValue.r;

  vec4 colour = texture2D(u_pallete,vec2(val,0.5));
  return colour.rgb;

}
void main() {
  float x = gl_FragCoord.x;
  float y = gl_FragCoord.y;
  vec2 crds = vec2(x,y);
  vec3 color;
  if (u_pass == PASS_DEPOSIT) {
    color = deposit(crds);

  } else if (u_pass == PASS_DIFUSE) {
    color = diffuse(crds);
  } else if (u_pass == PASS_DECAY) {
    color = decay(crds);
  } else if (u_pass == PASS_RENDER){
    color = render(crds);
  } else {
    color = passthrough(crds);
  }
  gl_FragColor = vec4(color,1.);
}