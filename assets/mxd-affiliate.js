// REPLACE WHOLE FILE: /assets/mxd-affiliate.js
(() => {
  // ===== NXPHUONG — Affiliate Rewriter (AccessTrade) =====
  // - BASES giữ sẵn sub4=oneatweb; code KHÔNG ép sub4 mặc định để tránh ghi đè.
  // - Tự bắt merchant từ hostname (đã thêm tiki).
  // - Dùng URLSearchParams để chống trùng param, đảm bảo giá trị cuối cùng hợp lệ.

  const BASES = {
    shopee: "https://go.isclix.com/deep_link/6838562378501577227/4751584435713464237?sub4=oneatweb",
    tiki:   "https://go.isclix.com/deep_link/6838562378501577227/4348614231480407268?sub4=oneatweb",
    lazada: "https://go.isclix.com/deep_link/6838562378501577227/5127144557053758578?sub4=oneatweb",
  };

  const MERCHANT_FROM_HOST = (h) => {
    if (!h) return "";
    const host = h.toLowerCase();
    if (host.includes("shopee")) return "shopee";
    if (host.includes("lazada")) return "lazada";
    if (host.includes("tiktok")) return "tiktok";  // dự phòng
    if (host.includes("tiki"))   return "tiki";     // 🔧 thêm tiki
    return "";
  };

  const isIsclix = (u) => {
    try { return new URL(u).hostname.endsWith("isclix.com"); } catch { return false; }
  };

  const absUrl = (href) => {
    try { return new URL(href, location.origin).href; } catch { return href || "#"; }
  };

  const pickMerchant = (meta, originAbs) => {
    const fromData = (meta.dataset.merchant || "").toLowerCase();
    if (fromData) return fromData;
    try { return MERCHANT_FROM_HOST(new URL(originAbs).hostname); } catch { return ""; }
  };

  const guessSku = (meta, card) => {
    if (meta.dataset.sku) return meta.dataset.sku;
    if (card?.dataset?.sku) return card.dataset.sku;
    const img = card?.querySelector?.('img[src*="/assets/img/products/"]');
    if (img) {
      const m = img.src.match(/\/assets\/img\/products\/([^\/]+)\.webp/i);
      if (m) return m[1];
    }
    try {
      const u = new URL(meta.getAttribute("href") || "#", location.origin);
      const segs = (u.pathname || "").split("/").filter(Boolean);
      return (segs.pop() || "").slice(0, 120);
    } catch { return ""; }
  };

  const buildSubs = (meta, card, merchant) => {
    // Mặc định: KHÔNG đặt sub4 để giữ nguyên trong BASES (oneatweb).
    const dflt = {
      sub1: guessSku(meta, card),
      sub2: merchant || (meta.dataset.merchant || "").toLowerCase(),
      sub3: "tool",
      // sub4: (bỏ trống)
    };
    const subs = { ...dflt };
    ["sub1", "sub2", "sub3", "sub4"].forEach((k) => {
      const v = meta.dataset[k];
      if (v != null && v !== "") subs[k] = v;
    });
    return subs;
  };

  const deepLinkFor = (meta) => {
    const card = meta.closest?.(".product-card") || null;
    const origin = meta.getAttribute("href") || "#";
    const originAbs = absUrl(origin);
    const merchant = pickMerchant(meta, originAbs);
    const base = BASES[merchant];

    // Không có base hoặc đã là isclix → trả nguyên.
    if (!base || isIsclix(originAbs)) return originAbs;

    // Dựng URL an toàn (không trùng param; giữ nguyên sub4 của base nếu không override).
    const u = new URL(base);
    u.searchParams.set("url", originAbs);

    const subs = buildSubs(meta, card, merchant);
    Object.entries(subs).forEach(([k, v]) => {
      if (v != null && v !== "") u.searchParams.set(k, String(v));
    });

    return u.toString();
  };

  const sendGA = (meta, merchant) => {
    try {
      if (typeof window.gtag === "function") {
        window.gtag("event", "aff_click", {
          event_category: "affiliate",
          event_label: merchant || meta.dataset.merchant || "",
          value: Number(meta.dataset.price) || undefined,
          merchant: merchant || meta.dataset.merchant || "",
          sku: meta.dataset.sku || guessSku(meta, meta.closest?.(".product-card") || null),
        });
      }
    } catch {}
  };

  const resolveMeta = (card) => {
    // Ưu tiên anchor “product-meta” theo chuẩn MXD
    return (
      card.querySelector("a.product-meta") ||
      card.querySelector("a[data-merchant]") ||
      card.querySelector("a[href]")
    );
  };

  const rewriteCard = (card) => {
    const meta = resolveMeta(card);
    if (!meta) return;
    const finalUrl = deepLinkFor(meta);
    card.querySelectorAll("a.buy").forEach((a) => {
      if (a.dataset.origin === "keep") return;
      a.href = finalUrl;
      a.rel = "nofollow noopener noreferrer";
    });
  };

  const rewriteAll = () => document.querySelectorAll(".product-card").forEach(rewriteCard);

  document.addEventListener("DOMContentLoaded", () => {
    rewriteAll();

    document.addEventListener("click", (ev) => {
      const btn = ev.target.closest("a.buy");
      if (!btn || btn.dataset.origin === "keep") return;
      const card = btn.closest(".product-card");
      const meta = card && resolveMeta(card);
      if (!meta) return;
      const finalUrl = deepLinkFor(meta);
      const merchant = (meta.dataset.merchant || "").toLowerCase();
      sendGA(meta, merchant);
      ev.preventDefault();
      window.location.assign(finalUrl);
    });

    new MutationObserver((muts) => {
      muts.forEach((m) =>
        m.addedNodes &&
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches?.(".product-card")) rewriteCard(node);
          node.querySelectorAll?.(".product-card").forEach(rewriteCard);
        })
      );
    }).observe(document.body, { childList: true, subtree: true });
  });
})();
