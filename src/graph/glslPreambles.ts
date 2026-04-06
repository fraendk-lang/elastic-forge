/**
 * GLSL utility functions injected into the shader preamble
 * when specific node types are used in the graph.
 */

export const GLSL_PREAMBLES: Record<string, string> = {
  simplex2d: `
// Simplex 2D noise — based on Ashima Arts / Stefan Gustavson (public domain)
vec3 _smod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 _smod289v2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 _spermute(vec3 x) { return _smod289(((x * 34.0) + 10.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = _smod289v2(i);
  vec3 p = _spermute(_spermute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`,

  voronoi2d: `
// Voronoi 2D — cell distance
vec2 _vhash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float voronoi(vec2 uv) {
  vec2 p = floor(uv);
  vec2 f = fract(uv);
  float res = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 b = vec2(float(i), float(j));
      vec2 r = b - f + _vhash(p + b) * 0.5 + 0.5;
      float d = dot(r, r);
      res = min(res, d);
    }
  }
  return sqrt(res);
}
`,
}
