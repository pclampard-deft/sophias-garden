const fs = require("node:fs");
const path = require("node:path");

module.exports = function () {
  const content = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "resort.json"),
      "utf8"
    )
  );

  const routes = [
    { type: "home", url: "/", data: content.home },
    { type: "rooms", url: "/rooms/", data: content.roomsPage },
    { type: "dining", url: "/dining/", data: content.dining },
    { type: "booking", url: "/book/", data: content.booking },
    { type: "explore", url: "/explore/", data: content.explore },
    { type: "contact", url: "/contact/", data: content.contact },
    { type: "text", url: "/privacy/", data: content.privacy },
    { type: "text", url: "/terms/", data: content.terms },
    { type: "text", url: "/thanks/", data: content.thanks },
    { type: "text", url: "/404.html", data: content.notFound }
  ];

  const seen = new Set();

  for (const room of content.rooms) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(room.slug)) {
      throw new Error(`Invalid room slug: ${room.slug}`);
    }

    if (seen.has(room.slug)) {
      throw new Error(`Duplicate room slug: ${room.slug}`);
    }

    seen.add(room.slug);

    routes.push({
      type: "room",
      url: `/rooms/${room.slug}/`,
      data: room
    });
  }

  return routes;
};