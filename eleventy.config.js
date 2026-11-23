const nunjucks = require("nunjucks");
const MarkdownIt = require("markdown-it");

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false
});

module.exports = function (eleventyConfig) {
  const environment = new nunjucks.Environment(
    new nunjucks.FileSystemLoader("src/_includes"),
    { autoescape: true }
  );

  eleventyConfig.setLibrary("njk", environment);

  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/uploads");
  eleventyConfig.addPassthroughCopy("src/admin");

  eleventyConfig.addPassthroughCopy({
    "src/_data/resort.json": "content-model.json",
    "node_modules/decap-cms/dist/decap-cms.js":
      "admin/decap-cms.js"
  });

  eleventyConfig.addWatchTarget("src/_data/resort.json");

  eleventyConfig.addFilter("markdown", value =>
    md.render(String(value || ""))
  );

  eleventyConfig.addFilter("absolute", (path, origin) =>
    new URL(path || "/", origin).href
  );

  eleventyConfig.addFilter("safeHref", value => {
    const url = String(value || "").trim();

    if (/^\/(?!\/)/.test(url) || url.startsWith("#")) {
      return url;
    }

    if (/^(https:\/\/|mailto:|tel:)/i.test(url)) {
      return url;
    }

    return "#";
  });

  eleventyConfig.addFilter("asset", value => {
    const path = String(value || "");

    // Only locally hosted image/font/document paths.
    // Filenames should use letters, numbers, hyphens and underscores.
    return /^\/(?:uploads|assets)\/[a-zA-Z0-9/_%.~-]+$/.test(path)
      ? path
      : "";
  });

  eleventyConfig.addFilter("hex", value =>
    /^#[0-9a-f]{6}$/i.test(String(value))
      ? value
      : "#15121e"
  );

  eleventyConfig.addFilter("jsonScript", value =>
    JSON.stringify(value)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026")
  );

  eleventyConfig.addFilter("structuredData", (route, content) => {
    const origin = content.site.url.replace(/\/$/, "");
    const absolute = path => new URL(path || "/", origin).href;

    const hotel = {
      "@type": "Hotel",
      "@id": `${origin}/#hotel`,
      "name": content.site.name,
      "url": `${origin}/`,
      "description": content.site.description,
      "email": content.site.email,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": content.site.streetAddress,
        "addressLocality": content.site.locality,
        "addressRegion": content.site.region,
        "postalCode": content.site.postalCode,
        "addressCountry": content.site.countryCode
      }
    };

    if (content.site.phone) hotel.telephone = content.site.phone;
    if (content.site.logo) hotel.logo = absolute(content.site.logo);
    if (content.site.socialImage) {
      hotel.image = absolute(content.site.socialImage);
    }

    const profiles = content.site.socialLinks
      .map(item => item.url)
      .filter(url => /^https:\/\//.test(url));

    if (profiles.length) hotel.sameAs = profiles;

    const webpage = {
      "@type": "WebPage",
      "@id": absolute(route.url) + "#webpage",
      "url": absolute(route.url),
      "name": route.data.seo.title,
      "description": route.data.seo.description,
      "isPartOf": { "@id": `${origin}/#website` },
      "about": { "@id": `${origin}/#hotel` }
    };

    const graph = [
      hotel,
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        "url": `${origin}/`,
        "name": content.site.name
      },
      webpage
    ];

    if (route.type !== "home") {
      graph.push({
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": content.ui.homeLabel,
            "item": `${origin}/`
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": route.data.title,
            "item": absolute(route.url)
          }
        ]
      });
    }

    if (route.type === "dining") {
      graph.push({
        "@type": "Restaurant",
        "@id": `${origin}/dining/#restaurant`,
        "name": content.dining.venueName,
        "url": `${origin}/dining/`,
        "description": content.dining.seo.description,
        "containedInPlace": { "@id": `${origin}/#hotel` },
        "address": hotel.address
      });
    }

    if (route.type === "room") {
      graph.push({
        "@type": "HotelRoom",
        "@id": absolute(route.url) + "#room",
        "name": route.data.title,
        "description": route.data.seo.description,
        "containedInPlace": { "@id": `${origin}/#hotel` }
      });
    }

    if (route.type === "explore" && content.explore.faqs.length) {
      graph.push({
        "@type": "FAQPage",
        "@id": `${origin}/explore/#faq`,
        "mainEntity": content.explore.faqs.map(item => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer
          }
        }))
      });
    }

    return { "@context": "https://schema.org", "@graph": graph };
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};