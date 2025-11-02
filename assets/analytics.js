// MXD GA4 loader — nxphuong
(() => {
  const GA_ID = "G-2RX0F54604";
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  if (typeof window.gtag !== "function") window.gtag = gtag;

  if (!document.querySelector(`script[data-ga4="{GA_ID}"]`)) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
    s.setAttribute("data-ga4", GA_ID);
    document.head.appendChild(s);
  }
  window.gtag("js", new Date());
  window.gtag("config", GA_ID);
})();