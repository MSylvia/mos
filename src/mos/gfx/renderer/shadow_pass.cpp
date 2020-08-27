#include <mos/gfx/renderer.hpp>
#include <glm/gtc/type_ptr.hpp>

namespace mos::gfx {

Renderer::Shadow_pass::Shadow_pass() {}

void Renderer::Shadow_pass::render(Renderer &renderer,
                                   const Models &models,
                                   const Spot_lights &lights) {
  for (size_t i = 0; i < renderer.shadow_maps_.size(); i++) {
    if (lights.at(i).strength > 0.0f) {
      auto frame_buffer = renderer.shadow_maps_.at(i).frame_buffer;
      glBindFramebuffer(GL_FRAMEBUFFER, frame_buffer);
      glClear(GL_DEPTH_BUFFER_BIT);
      auto resolution = renderer.shadow_maps_render_buffer_.resolution();
      glUseProgram(renderer.depth_program_.program);
      glViewport(0, 0, resolution.x, resolution.y);

      glUniform1i(renderer.depth_program_.albedo_sampler, 0);

      for (auto &model : models) {
        render_model(renderer, model, lights.at(i).camera,
                           resolution, glm::mat4(1.0f));
      }
      glBindFramebuffer(GL_FRAMEBUFFER, 0);

      glViewport(0, 0, renderer.shadow_maps_render_buffer_.resolution().x,
                 renderer.shadow_maps_render_buffer_.resolution().y);

      renderer.blur(renderer.shadow_maps_.at(i).texture,
                    renderer.shadow_map_blur_target_.frame_buffer,
                    renderer.shadow_map_blur_target_.texture,
                    renderer.shadow_maps_.at(i).frame_buffer,
                    renderer.shadow_maps_.at(i).texture,
                    renderer.shadow_map_blur_target_.resolution,
                    4);
    }
  }
}
void Renderer::Shadow_pass::render_model(Renderer &renderer,
                                         const Model &model,
                                         const Camera &camera,
                                         const glm::vec2 &resolution,
                                         const glm::mat4 &transform)
{
  if (camera.in_frustum(glm::vec3(transform[3]) + model.centroid(),
                        model.radius())) {
    const glm::mat4 mvp =
        camera.projection() * camera.view() * transform * model.transform;

    if (model.mesh) {
      glBindVertexArray(renderer.vertex_arrays_.at(model.mesh->id()).id);

      glActiveTexture(GL_TEXTURE0);
      glBindTexture(
          GL_TEXTURE_2D,
          model.material.albedo.texture
              ? renderer.textures_.at(model.material.albedo.texture->id()).texture
              : renderer.black_texture_.texture);

      glUniformMatrix4fv(renderer.depth_program_.model_view_projection, 1, GL_FALSE,
                         &mvp[0][0]);

      glUniform3fv(renderer.depth_program_.albedo, 1,
                   glm::value_ptr(model.material.albedo.value));
      glUniform3fv(renderer.depth_program_.emission, 1,
                   glm::value_ptr(model.material.emission.value));
      const int num_elements =
          model.mesh ? model.mesh->triangles.size() * 3 : 0;
      glDrawElements(GL_TRIANGLES, num_elements, GL_UNSIGNED_INT, nullptr);
    }
  }
  for (const auto &child : model.models) {
    render_model(renderer,child, camera, resolution, transform * model.transform);
  }
}

} // namespace mos::gfx


