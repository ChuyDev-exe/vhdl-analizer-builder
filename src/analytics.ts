// SPDX-License-Identifier: MIT
const ID = import.meta.env.VITE_ANALYTICS_ID as string | undefined;

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

let inited = false;

export function initAnalytics() {
  if (inited || !ID) return;
  inited = true;
  const s = document.createElement("script");
  s.src = `https://www.googletagmanager.com/gtag/js?id=${ID}`;
  s.async = true;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag(..._: unknown[]) {
    window.dataLayer!.push(arguments as unknown as unknown[]);
  }
  gtag("js", new Date());
  gtag("config", ID);
}

export function trackEvent(action: string, label?: string) {
  if (!ID) return;
  try {
    const gtag = window.gtag;
    if (gtag) gtag("event", action, { event_label: label });
  } catch {
    /* ignore */
  }
}
