(async () => {
  const REPOSITORY = "pclampard-deft/sophias-garden";

  const response = await fetch("/content-model.json", {
    cache: "no-store"
  });

  if (!response.ok) {
    document.body.textContent = "The editing configuration could not load.";
    return;
  }

  const data = await response.json();

  const label = key =>
    key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/^./, letter => letter.toUpperCase());

  const sectionLabels = {
    site: "01 — Site settings and navigation",
    theme: "02 — Colors and font",
    ui: "03 — Buttons and form labels",
    home: "04 — Homepage",
    roomsPage: "05 — Rooms overview",
    rooms: "06 — Individual rooms",
    dining: "07 — Restaurant and café",
    booking: "08 — Booking engine",
    explore: "09 — Explore Coron",
    contact: "10 — Contact page",
    privacy: "11 — Privacy notice",
    terms: "12 — Booking information",
    thanks: "13 — Thank-you page",
    notFound: "14 — Not-found page"
  };

  const imageKeys = new Set([
    "logo",
    "favicon",
    "socialImage",
    "image",
    "heroImage",
    "memoryImage",
    "invitationImage"
  ]);

  const markdownKeys = new Set([
    "body",
    "stayBody",
    "invitationBody"
  ]);

  const longTextKeys = new Set([
    "description",
    "summary",
    "answer",
    "note",
    "openingNote",
    "footerText",
    "menuNote",
    "embedNotice",
    "policyText",
    "closedMessage",
    "errorMessage",
    "enquiryConsent",
    "waitlistConsent",
    "formNote",
    "hours"
  ]);

  const optionalKeys = new Set([
    "logo",
    "favicon",
    "socialImage",
    "phone",
    "mapUrl",
    "font",
    "memoryImage",
    "memoryAlt",
    "invitationImage",
    "invitationAlt",
    "menuPdf",
    "propertyCode",
    "bookingUrl",
    "price",
    "alt",
    "heroAlt",
    "imageAlt",
    "caption"
  ]);

  function field(key, value, path = "") {
    const currentPath = path ? `${path}.${key}` : key;

    const result = {
      name: key,
      label: sectionLabels[currentPath] || label(key),
      required: !optionalKeys.has(key)
    };

    if (Array.isArray(value)) {
      result.widget = "list";
      result.required = false;

      // These example schemas must remain available when lists are empty.
      const fallbacks = {
        socialLinks: { label: "", url: "" },
        navigation: { label: "", url: "" },
        footerLinks: { label: "", url: "" },
        highlights: { title: "", body: "", linkLabel: "", url: "" },
        amenities: { text: "" },
        gallery: { image: "", alt: "", caption: "" },
        menuSections: {
          title: "",
          items: [{ name: "", description: "", price: "" }]
        },
        items: { name: "", description: "", price: "" },
        faqs: { question: "", answer: "" }
      };

      const sample = value[0] || fallbacks[key];

      if (!sample || typeof sample !== "object") {
        throw new Error(`No field schema for ${currentPath}`);
      }

      result.fields = Object.entries(sample).map(([name, child]) =>
        field(name, child, currentPath)
      );

      result.collapsed = true;

      if (key === "rooms") {
        result.min = 1;
        result.summary = "{{fields.title}}";
      }

      return result;
    }

    if (value !== null && typeof value === "object") {
      result.widget = "object";
      result.collapsed = true;
      result.fields = Object.entries(value).map(([name, child]) =>
        field(name, child, currentPath)
      );

      return result;
    }

    if (typeof value === "boolean") {
      result.widget = "boolean";
      result.required = false;
      result.default = value;
      return result;
    }

    if (typeof value === "number") {
      result.widget = "number";
      return result;
    }

    if (currentPath === "booking.mode") {
      result.widget = "select";
      result.options = [
        { label: "Direct booking link", value: "link" },
        { label: "Cloudbeds immersive embed", value: "embed" }
      ];
      return result;
    }

    if (currentPath.startsWith("theme.") && key !== "font") {
      result.widget = "color";
      result.allowInput = true;
      return result;
    }

    if (imageKeys.has(key)) {
      result.widget = "image";
      result.hint =
        "Upload a public image. Use WebP/JPG for photos and SVG/PNG for logos.";
      return result;
    }

    if (key === "font" || key === "menuPdf") {
      result.widget = "file";
      result.hint = key === "font"
        ? "Upload a licensed regular-weight WOFF2 webfont, or leave blank for Georgia."
        : "Upload the public menu PDF.";
      return result;
    }

    if (markdownKeys.has(key)) {
      result.widget = "markdown";
      result.modes = ["rich_text", "raw"];
      return result;
    }

    result.widget = longTextKeys.has(key) ? "text" : "string";

    if (key === "slug") {
      result.pattern = [
        "^[a-z0-9]+(?:-[a-z0-9]+)*$",
        "Use lowercase letters, numbers and single hyphens."
      ];
      result.hint =
        "This becomes the room URL. Keep it unique. Avoid changing it after launch.";
    }

    if (key.toLowerCase().endsWith("alt") || key === "alt") {
      result.hint =
        "Describe a meaningful photograph. Leave empty for purely decorative artwork.";
    }

    if (currentPath === "site.url") {
      result.pattern = [
        "^https://[^/]+$",
        "Use an HTTPS origin with no trailing slash, for example https://www.example.com"
      ];
      result.hint =
        "Technical setting: must match the Netlify and GitHub OAuth configuration.";
    }

    if (currentPath === "site.indexingEnabled") {
      result.hint = "Enable only after content and policies are ready.";
    }

    return result;
  }

  const files = [
    {
      name: "content",
      label: "Edit website content",
      file: "src/_data/resort.json",
      format: "json",
      fields: Object.entries(data).map(([key, value]) =>
        field(key, value)
      )
    }
  ];

  CMS.init({
    config: {
      load_config_file: false,
      backend: {
        name: "github",
        repo: REPOSITORY,
        branch: "main",
        base_url: data.site.url,
        auth_endpoint: ".netlify/functions/auth"
      },
      site_url: data.site.url,
      display_url: data.site.url,
      media_folder: "src/uploads",
      public_folder: "/uploads",
      publish_mode: "simple",
      editor: {
        preview: false
      },
      collections: [
        {
          name: "website",
          label: "Website",
          files
        }
      ]
    }
  });
})();