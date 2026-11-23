(() => {
  const button = document.getElementById("load-booking");
  const container = document.getElementById("cloudbeds-container");
  const error = document.getElementById("booking-error");

  if (!button || !container || !error) return;

  button.addEventListener("click", async () => {
    const propertyCode = button.dataset.property.trim();

    if (!/^[a-zA-Z0-9_-]+$/.test(propertyCode)) {
      error.hidden = false;
      return;
    }

    button.disabled = true;
    error.hidden = true;

    try {
      const component = document.createElement(
        "cb-immersive-experience"
      );

      component.setAttribute("mode", "standard");
      component.setAttribute("property-code", propertyCode);

      container.replaceChildren(component);

      let loader = document.getElementById("cloudbeds-loader");

      if (!loader) {
        loader = document.createElement("script");
        loader.id = "cloudbeds-loader";
        loader.src =
          "https://static1.cloudbeds.com/booking-engine/latest/loader.js";
        loader.dataset.entry = "immersive";
        loader.async = true;

        loader.addEventListener("error", () => {
          error.hidden = false;
          button.disabled = false;
        });

        document.head.appendChild(loader);
      }

      await Promise.race([
        customElements.whenDefined("cb-immersive-experience"),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Timeout")), 20000);
        })
      ]);

      button.hidden = true;
    } catch {
      error.hidden = false;
      button.disabled = false;
    }
  });
})();