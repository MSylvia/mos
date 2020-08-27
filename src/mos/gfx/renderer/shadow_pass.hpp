#pragma once

class Shadow_pass {
public:
  Shadow_pass();
  void render(Renderer &renderer,
              const Models &models,
              const Spot_lights &lights);

  void render_model(Renderer &renderer,
                    const Model &model,
                    const Camera &camera,
                    const glm::vec2 &resolution,
                    const glm::mat4 &transform = glm::mat4(1.0f));
};

