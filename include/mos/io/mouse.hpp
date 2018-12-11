#pragma once

#include <glm/glm.hpp>
#include <vector>
#include <array>

namespace mos {
namespace io {

class Mouse {
public:
  Mouse();
  enum class Event {
    Button_press_0,
    Button_release_0,
  };

  glm::vec2 position;
  std::vector<Event> events;
  std::array<bool, 2> buttons;
};

}
}
