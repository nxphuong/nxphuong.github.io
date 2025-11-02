// MXD Affiliate Rewriter v2 — nxphuong
(() => {
  const BASES = {"shopee": "https://go.isclix.com/deep_link/6838562378501577227/4751584435713464237?sub4=oneatweb", "tiki": "https://go.isclix.com/deep_link/6838562378501577227/4348614231480407268?sub4=oneatweb", "lazada": "https://go.isclix.com/deep_link/6838562378501577227/5127144557053758578?sub4=oneatweb"};

  const MERCHANT_FROM_HOST = (h) => {
    if (!h) return "";
    const host = h.toLowerCase();
    if (host.includes("shopee")) return "shopee";
    if (host.includes("lazada")) return "lazada";
    if (host.includes("tiktok")) return "tiktok";
    if (host.includes("tiki")) return "tiki";
    return "";
  };

  const resolveMeta = (card) => card?.querySelector?.(".product-meta");

  const guessSku = (meta, card) => {
    if (!meta) return "";
    const sku = meta.dataset.sku || "";
    if (sku) return sku;
    const href = meta.getAttribute("href")||"";
    try { const u = new URL(href, location.origin); return (u.pathname.split("/").filter(Boolean).pop()||""); } catch { return ""; }
  };

  const buildSubs = (meta, card, merchant) => {
    const dflt = {
      sub1: guessSku(meta, card),
      sub2: merchant || (meta.dataset.merchant||"").toLowerCase(),
      sub3: "tool",
      sub4: "oneatweb",
    };
    const subs = { ...dflt };
    ["sub1","sub2","sub3","sub4"].forEach(k=>{ const v=meta.dataset[k]; if(v) subs[k]=v; });
    return subs;
  };

  const deepLinkFor = (meta) => {
    const card = meta.closest?.(".product-card") || null;
    let origin = meta.getAttribute("href") || "#";
    let merchant = (meta.dataset.merchant||"").toLowerCase();
    if (!merchant) {
      try { merchant = MERCHANT_FROM_HOST(new URL(origin, location.origin).hostname); } catch { merchant=""; }
    }
    const base = BASES[merchant];
    if (!base) return origin;

    const subs = buildSubs(meta, card, merchant);
    const u = new URL(base);
    Object.keys(subs).forEach(k=>u.searchParams.set(k, subs[k]));
    u.searchParams.set("url", origin);
    return u.toString();
  };

  const sendGA = (meta) => {
    try {
      const sku = meta?.dataset?.sku || "";
      const merchant = (meta?.dataset?.merchant||"").toLowerCase();
      window.gtag && window.gtag("event","click_buy",{ sku, merchant });
    } catch { }
  };

  const rewriteCard = (card) => {
    const meta = resolveMeta(card);
    if (!meta) return;
    const finalUrl = deepLinkFor(meta);
    card.querySelectorAll("a.buy").forEach(a=>{
      if (a.dataset.origin==="keep") return;
      a.href = finalUrl;
      a.rel = "nofollow noopener noreferrer";
    });
  };

  const rewriteAll = () => document.querySelectorAll(".product-card").forEach(rewriteCard);

  document.addEventListener("DOMContentLoaded", () => {
    rewriteAll();
    document.addEventListener("click",(ev)=>{
      const btn = ev.target.closest("a.buy");
      if (!btn || btn.dataset.origin==="keep") return;
      const card = btn.closest(".product-card");
      const meta = card && resolveMeta(card);
      if (!meta) return;
      const finalUrl = deepLinkFor(meta);
      btn.href = finalUrl;
      sendGA(meta);
      ev.preventDefault();
      window.location.assign(finalUrl);
    });
    new MutationObserver((muts)=>{
      muts.forEach(m => m.addedNodes && m.addedNodes.forEach(node=>{
        if (!(node instanceof Element)) return;
        if (node.matches?.(".product-card")) rewriteCard(node);
        node.querySelectorAll?.(".product-card").forEach(rewriteCard);
      }));
    }).observe(document.body, { childList:true, subtree:true });
  });
})();