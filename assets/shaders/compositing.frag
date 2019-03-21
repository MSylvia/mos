#version 430 core

layout(location = 0) out vec4 color;
in vec2 frag_uv;

uniform sampler2D direct_sampler;
uniform sampler2D bloom_sampler;
uniform sampler2DMS ambient_sampler;
uniform sampler2D ambient_occlusion_sampler;
uniform float strength;

float rand(vec2 co) {
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
  vec3 bloom = texture(bloom_sampler, frag_uv).rgb;
  color = vec4(texture(direct_sampler, frag_uv).rgb + bloom * strength, 1.0);

  vec2 texture_size = textureSize(ambient_sampler);
  ivec2 pixel_uv = ivec2(floor(texture_size * frag_uv));

  float ambient_occlusion = texture(ambient_occlusion_sampler, frag_uv).r;

  color.rgb *= ambient_occlusion;

  float r = rand(frag_uv * color.rg);
  color.rgb *= (1.0 - r * 0.1);
}
