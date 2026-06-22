import { useEffect } from "react";

interface MetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

export default function MetaTags({ title, description, image, url, type }: MetaTagsProps) {
  useEffect(() => {
    const tags: Array<{ name?: string; property?: string; content: string }> = [];

    if (title) {
      document.title = title;
      tags.push({ property: "og:title", content: title });
      tags.push({ name: "twitter:title", content: title });
    }
    if (description) {
      tags.push({ name: "description", content: description });
      tags.push({ property: "og:description", content: description });
      tags.push({ name: "twitter:description", content: description });
    }
    if (image) {
      tags.push({ property: "og:image", content: image });
      tags.push({ name: "twitter:image", content: image });
    }
    if (url) {
      tags.push({ property: "og:url", content: url });
    }
    if (type) {
      tags.push({ property: "og:type", content: type });
    }

    const originals: Array<{ el: HTMLElement; content: string }> = [];

    for (const tag of tags) {
      const selector = tag.property
        ? `meta[property="${tag.property}"]`
        : tag.name
          ? `meta[name="${tag.name}"]`
          : null;
      if (!selector) continue;
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        originals.push({ el, content: el.getAttribute(tag.property ? "property" : "name") || "" });
        el.setAttribute("content", tag.content);
      }
    }

    const origTitle = document.title;

    return () => {
      for (const orig of originals) {
        orig.el.setAttribute("content", orig.content);
      }
      document.title = origTitle;
    };
  }, [title, description, image, url, type]);

  return null;
}
