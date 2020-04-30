#pragma once
#include <vector>
#include <atomic>
#include <chrono>
#include <mos/core/tracked_container.hpp>
#include <mos/core/container.hpp>
#include <mos/gfx/texture_2d.hpp>
#include <mos/gfx/shape.hpp>
#include <mos/gfx/point.hpp>

namespace mos::gfx {

/** Collection of particles for rendering, uses same texture. */
class Cloud final : public Shape {
public:
  enum class Blending{Additive, Transparent};
  using Points = Tracked_container<Point>;
  Cloud(Shared_texture_2D texture, Points particles);
  Cloud() = default;

  /** Sort points relative to a position. */
  auto sort(const glm::vec3 &position) -> void;

  /** Texture for all particles. */
  Shared_texture_2D texture;

  /** Points. */
  Points points;

  Blending blending = Blending::Additive;
};
}

