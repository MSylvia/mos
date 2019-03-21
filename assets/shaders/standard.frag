#version 430 core

const float PI = 3.14159265359;

struct Material {
    vec4 albedo;
    vec4 emission;
    float roughness;
    float metallic;
    float opacity;
    float transmission;
    float strength;
    float ambient_occlusion;
    sampler2D albedo_map;
    sampler2D emission_map;
    sampler2D normal_map;
    sampler2D metallic_map;
    sampler2D roughness_map;
    sampler2D ambient_occlusion_map;
};

struct Light {
    vec3 position;
    vec3 color;
    float strength;
    mat4 view;
    mat4 projection;
    float angle;
    vec3 direction;
};

struct Camera {
    vec3 position;
    ivec2 resolution;
};

struct Environment {
    vec3 position;
    vec3 extent;
    float strength;
};

struct Fog {
    vec3 color_near;
    vec3 color_far;
    float attenuation_factor;
};

struct Fragment {
    vec3 position;
    vec3 normal;
    vec2 uv;
    mat3 tbn;
    vec4[4] proj_shadow;
    vec3 camera_to_surface;
    float weight;
};

uniform Material material;
uniform Light[4] lights;
uniform sampler2D[4] shadow_maps;

uniform Environment[2] environments;
uniform samplerCube[2] environment_samplers;

uniform Camera camera;
uniform Fog fog;
uniform mat4 model;
uniform mat4 model_view;
uniform mat4 view;
uniform sampler2D brdf_lut;

in Fragment fragment;

layout(location = 0) out vec4 out_color;

// Defined in functions.frag
float rand(vec2 co);
mat3 rotate(const vec3 axis, const float a);
vec3 box_correct(const vec3 box_extent, const vec3 box_pos, const vec3 dir, const vec3 fragment_position);
float sample_variance_shadow_map(sampler2D shadow_map, vec2 uv, float compare);
float sample_shadow_map(sampler2D shadow_map, const vec2 uv, const float compare);
float distribution_GGX(vec3 N, vec3 H, float roughness);
float geometry_schlick_GGX(float NdotV, float roughness);
float geometry_smith(vec3 N, vec3 V, vec3 L, float roughness);
vec3 fresnel_schlick(float cosTheta, vec3 F0);
vec3 fresnel_schlick_roughness(float cosTheta, vec3 F0, float roughness);
float fog_attenuation(const float dist, const float factor);

void main() {
    vec3 normal = fragment.normal;

    vec3 normal_from_map = texture(material.normal_map, fragment.uv).rgb * 2.0 - vec3(1.0);
    normal_from_map = normalize(fragment.tbn * normal_from_map);

    float amount = texture(material.normal_map, fragment.uv).a;

    if (amount > 0.0f){
        normal = normalize(mix(normal, normal_from_map, amount));
    }

    vec4 albedo_from_map = texture(material.albedo_map, fragment.uv);
    //TODO: Mix nicer
    vec3 albedo = vec3(0.0, 0.0, 0.0);
    if (albedo_from_map.a > 0.0){
        albedo = albedo_from_map.rgb;
    }
    else {
        albedo = mix(material.albedo.rgb, albedo_from_map.rgb, albedo_from_map.a);
    }

    vec4 metallic_from_map = texture(material.metallic_map, fragment.uv);
    float metallic = mix(material.metallic, metallic_from_map.r, metallic_from_map.a);

    vec4 roughnesss_from_map = texture(material.roughness_map, fragment.uv);
    float roughness = mix(material.roughness, roughnesss_from_map.r, roughnesss_from_map.a);

    float ambient_occlusion_from_map = texture(material.ambient_occlusion_map, fragment.uv).r;
    float ambient_occlusion = material.ambient_occlusion * ambient_occlusion_from_map;

    vec4 emission_from_map = texture(material.emission_map, fragment.uv);
    vec3 emission = mix(material.emission.rgb, emission_from_map.rgb, emission_from_map.a);

    if (material.opacity * (albedo_from_map.a + emission_from_map.a + material.emission.a + material.albedo.a) < 0.1 && emission == vec3(0,0,0)) {
        discard;
    }

    const vec3 V = normalize(camera.position - fragment.position);

    vec3 F0 = vec3(0.04);
    F0 = mix(F0, albedo, metallic);

    vec3 direct = vec3(0.0, 0.0, 0.0);

    for(int i = 0; i < lights.length(); i++) {
        Light light = lights[i];
        if (light.strength > 0.0) {
            const vec3 L = normalize(light.position - fragment.position);
            const vec3 H = normalize(V + L);

            const float NdotL = max(dot(normal, L), 0.0);
            const float cos_dir = dot(L, -light.direction);
            const float spot_effect = smoothstep(cos(light.angle / 2.0), cos(light.angle / 2.0 - 0.1), cos_dir);

            const vec3 shadow_map_uv = fragment.proj_shadow[i].xyz / fragment.proj_shadow[i].w;
            const vec2 texel_size = 1.0 / textureSize(shadow_maps[i], 0);
            const float shadow = sample_variance_shadow_map(shadow_maps[i], shadow_map_uv.xy + texel_size, shadow_map_uv.z) * spot_effect;

            const float light_fragment_distance = distance(light.position, fragment.position);
            const float attenuation = 1.0 / (light_fragment_distance * light_fragment_distance);
            const vec3 radiance = light.strength * 0.09 * light.color * attenuation;

            // Cook-Torrance BRDF
            const float NDF = distribution_GGX(normal, H, roughness);
            const float G = geometry_smith(normal, V, L, roughness);
            const vec3 F = fresnel_schlick(clamp(dot(H, V), 0.0, 1.0), F0);

            const vec3 nominator = NDF * G * F;
            const float denominator = 4 * max(dot(normal, V), 0.0) * max(dot(normal, L), 0.0) + 0.001;
            const vec3 specular = nominator / denominator;

            const vec3 kS = F;
            const vec3 kD = (vec3(1.0) - kS) * (1.0 - metallic);

            direct += (kD * albedo / PI + specular) * radiance * NdotL * spot_effect * shadow * (1.0 - material.transmission);
        }
    }

    vec3 ambient = vec3(0.0, 0.0, 0.0);

    for (int i = 0; i < environments.length(); i++) {
      if (environments[i].strength > 0.0) {
        vec3 corrected_normal = box_correct(environments[i].extent, environments[i].position,normal, fragment.position);
        vec3 r = -reflect(fragment.camera_to_surface, normal);
        vec3 corrected_r = box_correct(environments[i].extent, environments[i].position, r, fragment.position);

        vec2 environment_texture_size = textureSize(environment_samplers[i], 0);
        float maxsize = max(environment_texture_size.x, environment_texture_size.x);
        float num_levels = 1 + floor(log2(maxsize));
        float mip_level = clamp(pow(roughness, 0.25) * num_levels, 0.0, 10.0);

        vec3 F_env = fresnel_schlick_roughness(max(dot(normal, V), 0.0), F0, roughness);
        vec3 kS_env = F_env;
        vec3 kD_env = (1.0 - kS_env) * (1.0 - metallic);

        vec3 filtered = textureLod(environment_samplers[i], corrected_r, mip_level).rgb;
        vec2 brdf  = texture(brdf_lut, vec2(max(dot(normal, V), 0.0), roughness)).rg;

        float refractive_index = 1.5;
        vec3 refracted_direction = refract(V, normal, 1.0 / refractive_index);
        vec3 corrected_refract_direction = box_correct(environments[i].extent, environments[i].position, refracted_direction, fragment.position);
        vec3 refraction = textureLod(environment_samplers[i], corrected_refract_direction, mip_level).rgb * material.transmission;

        vec3 specular_environment = mix(refraction, filtered, F_env * brdf.x + brdf.y) * environments[i].strength;
        //specular_environment = filtered * F_env * brdf.x + brdf.y;

        vec3 irradiance = vec3(0.0, 0.0, 0.0);

        const float m = 0.5;
        for(float x = -m; x <= m; x += 1.0) {
            for(float y = -m; y <= m; y += 1.0) {
              for(float z = -m; z <= m; z += 1.0) {
                  mat3 rotx = rotate(vec3(1.0, 0.0, 0.0), x);
                  mat3 roty = rotate(vec3(0.0, 1.0, 0.0), y);
                  mat3 rotz = rotate(vec3(0.0, 0.0, 1.0), z);
                  irradiance += textureLod(environment_samplers[i], rotx * roty * rotz * corrected_normal, num_levels - 1.5).rgb;
                }
            }
        }
        irradiance /= 8.0;

        vec3 diffuse_environment = irradiance * albedo * environments[i].strength;

        float fragment_environment_distance = distance(fragment.position, environments[i].position);
        float environment_attenuation_x = 1.0 - (distance(fragment.position.x, environments[i].position.x) / environments[i].extent.x);
        float environment_attenuation_y = 1.0 - (distance(fragment.position.y, environments[i].position.y) / environments[i].extent.y);
        float environment_attenuation_z = 1.0 - (distance(fragment.position.z, environments[i].position.z) / environments[i].extent.z);

        float environment_attenuation = ceil(min(environment_attenuation_x, min(environment_attenuation_y, environment_attenuation_z)));

        ambient += clamp((kD_env * diffuse_environment * (1.0 - material.transmission) + specular_environment) * ambient_occlusion * environment_attenuation, vec3(0.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0));
      }
    }
    out_color.rgb = (direct + ambient + emission) * material.strength;
    out_color.a = clamp(material.opacity * (albedo_from_map.a + emission_from_map.a + material.emission.a + material.albedo.a), 0.0, 1.0);

    //Fog
    float distance = distance(fragment.position, camera.position);
    float fog_att = fog_attenuation(distance, fog.attenuation_factor);
    vec3 fog_color = mix(fog.color_far, fog.color_near, fog_att);
    out_color.rgb = mix(fog_color, out_color.rgb, clamp(fog_att, 0.45, 1.0));
}
