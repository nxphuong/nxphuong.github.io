(() => {
  /* =========================================================
   *  NXPHUONG — Affiliate Rewriter (AccessTrade) v2
   *  - Per-link merchant (mỗi nút Buy có thể khác merchant)
   *  - Không đụng link đã là isclix
   *  - Tự bổ sung sub4 = <SITE_ID> nếu BASES chưa có
   *  - Giữ chuẩn MXD: GA4 trước affiliate script
   * ========================================================= */

  // MXD-ANCHOR:AFF.BASES — thay đúng AFF_ID/ADV_ID nếu cần
  const BASES = {
    shopee: "https://go.isclix.com/deep_link/6838562378501577227/4751584435713464237?sub4=oneatweb",
    lazada: "https://go.isclix.com/deep_link/6838562378501577227/5127144557053758578?sub4=oneatweb",
    tiktok: "https://go.isclix.com/deep_link/6838562378501577227/6648523843406889655?sub4=oneatweb",
    tiki:   "https://go.isclix.com/deep_link/6838562378501577227/4348614231480407268?sub4=oneatweb",
  };

  // SITE_ID dùng cho sub4 mặc định khi BASE không có sub4
  const SITE_ID = (() => {
    try {
      const h = (location.hostname || "").toLowerCase();
      const m = h.match(/^([a-z0-9-]+)/);
      return (m ? m[1] : "mxd").replace(/[^a-z0-9-]/g, "") || "mxd";
    } catch { return "mxd"; }
  })();

  const isIsclix = (u) => {
    try { return new URL(u).hostname.endsWith("isclix.com"); }
    catch { return false; }
  };

  const absUrl = (href) => {
    try { return new URL(href, location.origin).href; }
    catch { return href || "#"; }
  };

  // Nhận diện merchant từ hostname (kể cả short links)
  const MERCHANT_FROM_HOST = (h) => {
    if (!h) return "";
    const host = h.toLowerCase();
    if (host.includes("shopee") || host.endsWith("shope.ee")) return "shopee";
    if (host.includes("lazada") || host.endsWith("lzd.co")) return "lazada";
    if (host.includes("tiktok")) return "tiktok";
    if (host.includes("tiki"))   return "tiki";
    return "";
  };

  const pickMerchant = (elWithData, originAbs, override) => {
    // Ưu tiên override → data-merchant → đoán từ origin
    const fromOverride = (override || "").toLowerCase();
    if (fromOverride) return fromOverride;
    const fromData = (elWithData?.dataset?.merchant || "").toLowerCase();
    if (fromData) return fromData;
    try { return MERCHANT_FROM_HOST(new URL(originAbs).hostname); }
    catch { return ""; }
  };

  const guessSku = (meta, card) => {
    if (meta?.dataset?.sku) return meta.dataset.sku;
    if (card?.dataset?.sku) return card.dataset.sku;
    const img = card?.querySelector?.('img[src*="/assets/img/products/"]');
    if (img) {
      const m = img.src.match(/\/assets\/img\/products\/([^\/]+)\.(webp|png|jpg|jpeg|avif)/i);
      if (m) return m[1];
    }
    try {
      const u = new URL(meta?.getAttribute?.("href") || "#", location.origin);
      const segs = (u.pathname || "").split("/").filter(Boolean);
      return (segs.pop() || "").slice(0, 120);
    } catch { return ""; }
  };

  // sub1..sub3 luôn bổ sung; sub4 chỉ set nếu override hoặc BASE không có
  const buildSubs = (meta, card, merchant, baseHasSub4) => {
    const subs = {
      sub1: guessSku(meta, card),
      sub2: merchant || (meta?.dataset?.merchant || "").toLowerCase(),
      sub3: "tool",
    };
    // Cho phép override qua data-*
    ["sub1", "sub2", "sub3", "sub4"].forEach((k) => {
      const v = meta?.dataset?.[k];
      if (v) subs[k] = v;
    });
    // Nếu BASE chưa có sub4 và chưa override → gán SITE_ID
    if (!("sub4" in subs) && !baseHasSub4) subs.sub4 = SITE_ID;
    return subs;
  };

  const resolveMeta = (card) =>
    card?.querySelector?.("a.product-meta") ||
    card?.querySelector?.("a[data-merchant]") ||
    card?.querySelector?.("a[href]") || null;

  // Tạo deeplink từ META (origin nằm ở meta.href), cho phép override merchant theo từng nút Buy
  const deepLinkFor = (meta, card, linkMerchantOverride) => {
    const origin = meta?.getAttribute?.("href") || "#";
    const originAbs = absUrl(origin);
    const merchant = pickMerchant(meta, originAbs, linkMerchantOverride);
    const base = BASES[merchant];

    // Nếu không xác định được merchant hoặc đã là isclix → giữ nguyên origin
    if (!base || isIsclix(originAbs)) return originAbs;

    const u = new URL(base);
    const baseHasSub4 = u.searchParams.has("sub4");
    u.searchParams.set("url", originAbs);

    const subs = buildSubs(meta, card, merchant, baseHasSub4);
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
          event_label: merchant || meta?.dataset?.merchant || "",
          value: Number(meta?.dataset?.price) || undefined,
          merchant: merchant || meta?.dataset?.merchant || "",
          sku: meta?.dataset?.sku || guessSku(meta, meta?.closest?.(".product-card") || null),
        });
      }
    } catch { /* noop */ }
  };

  // Ghi lại href cho từng nút Buy theo đúng merchant của chính nút đó (nếu có)
  const rewriteCard = (card) => {
    const meta = resolveMeta(card);
    if (!meta) return;

    const buyLinks = card.querySelectorAll?.("a.buy");
    if (!buyLinks || !buyLinks.length) return;

    buyLinks.forEach((a) => {
      if (a.dataset.origin === "keep") return; // tôn trọng keep
      const linkMerchant = (a.dataset.merchant || "").toLowerCase();
      const finalUrl = deepLinkFor(meta, card, linkMerchant);
      a.href = finalUrl;
      a.rel = "nofollow noopener noreferrer";
    });
  };

  const rewriteAll = () => {
    document.querySelectorAll(".product-card").forEach(rewriteCard);
  };

  document.addEventListener("DOMContentLoaded", () => {
    rewriteAll();

    // Chặn click trên nút Buy để gửi GA + đảm bảo href cuối cùng
    document.addEventListener("click", (ev) => {
      const btn = ev.target.closest?.("a.buy");
      if (!btn || btn.dataset.origin === "keep") return;

      const card = btn.closest?.(".product-card");
      const meta = resolveMeta(card);
      if (!meta) return;

      const linkMerchant = (btn.dataset.merchant || "").toLowerCase();
      const finalUrl = deepLinkFor(meta, card, linkMerchant);
      sendGA(meta, linkMerchant);

      ev.preventDefault();
      window.location.assign(finalUrl);
    });

    // Tự động áp dụng cho phần tử được thêm động sau này
    new MutationObserver((muts) => {
      muts.forEach((m) => {
        m.addedNodes &&
          m.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            if (node.matches?.(".product-card")) rewriteCard(node);
            node.querySelectorAll?.(".product-card").forEach(rewriteCard);
          });
      });
    }).observe(document.body, { childList: true, subtree: true });
  });
})();
