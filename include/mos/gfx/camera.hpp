#pragma once

#include <glm/glm.hpp>
#include <array>
#include <map>

namespace mos {
namespace gfx {

/** Rendering camera view. */
class Camera final {
public:
  using Planes = std::array<glm::vec4, 6>;
  Camera(const glm::vec3 &position = glm::vec3(0.0f),
               const glm::vec3 &center = glm::vec3(0.0f),
               const glm::mat4 &projection = glm::mat4(1.0f),
               const glm::vec3 &up = glm::vec3(0.0f, 0.0f, 1.0f));

  Camera(const glm::vec3 &position,
         const glm::mat4 &projection,
         const float &focus_distance,
         const glm::vec3 &up = glm::vec3(0.0f, 0.0f, 1.0f));

  Camera(const std::string &directory,
        const std::string &path,
        const glm::mat4 &parent_transform = glm::mat4(1.0f));

  auto up() const -> glm::vec3;

  /** Set up vector. */
  auto up(const glm::vec3 &up) -> void;

  auto position() const -> glm::vec3;

  /** Set position. */
  auto position(const glm::vec3 &position) -> void;

  auto center() const -> glm::vec3;

  /** Set center/focus point. */
  auto center(const glm::vec3 &center) -> void;

  /** Forward direction. **/
  auto direction() const -> glm::vec3;

  auto right() const -> glm::vec3;

  /** Set direction. */
  auto direction(const glm::vec3 &direction) -> void;

  auto aspect_ratio() const -> float;

  /** Check if sphere with a radius is within camera frustum. */
  auto in_frustum(const glm::vec3 & point, float radius) const -> bool;
  
  /** Get near clip plane. */
  auto near_plane() const -> float;

  /** Get far clip plane. */
  auto far_plane() const -> float;

  /** Get projection matrix. */
  auto projection() const -> glm::mat4;

  /** Set projection matrix. */
  auto projection(const glm::mat4 &proj) -> void;

  /** Get view matrix */
  auto view() const -> glm::mat4;

private:
  auto calculate_view() -> void;
  auto calculate_frustum() -> void;
  auto calculate_near_far() -> void;
  glm::mat4 projection_{};
  glm::mat4 view_{};
  Planes frustum_planes_;
  glm::vec3 up_{};
  glm::vec3 center_{};
  glm::vec3 position_{};
  float near_{0.1f};
  float far_{100.0f};
};
}
}
