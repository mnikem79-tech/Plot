/* ============================================================
   ЕДИНЫЙ ШАБЛОН САЙТОВ КИПРОЛ (ac / tnaw / tngeo / tnaa / tnpool).
   Сайт определяется по домену (или параметру ?site=... в предпросмотре).
   Наполнение подгружается из site/<site>/site.json и catalog.json.
   ============================================================ */
(function () {
  "use strict";

  var SITES = ["ac", "tnaw", "tngeo", "tnaa", "tnpool"];
  var ORDER_URL = "/order";   // Caddy проксирует на бэкенд (127.0.0.1:8080)

  /* ---------- определение текущего сайта ---------- */
  function detectSite() {
    var q = new URLSearchParams(window.location.search).get("site");
    if (q && SITES.indexOf(q) !== -1) return q;
    var host = window.location.hostname.toLowerCase();
    var label = host.split(".")[0];
    if (SITES.indexOf(label) !== -1) return label;
    return "ac"; // по умолчанию (для локального предпросмотра)
  }
  var SITE = detectSite();
  // Содержимое каждого сайта — в своей папке site/<имя>/ (site.json, catalog.json, img/)
  var SITE_DIR = SITE;

  var state = { site: null, products: [], filter: null };

  /* ---------- утилиты ---------- */
  function el(id) { return document.getElementById(id); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0"); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* ---------- meta / SEO ---------- */
  function setMeta(s) {
    document.title = s.title;
    document.documentElement.style.setProperty("--accent", s.accent || "#0284c7");
    document.documentElement.style.setProperty("--accent-2", s.accent2 || "#0ea5e9");

    var set = function (name, content) {
      var m = document.querySelector('meta[name="' + name + '"]');
      if (m) m.setAttribute("content", content);
    };
    var setProp = function (prop, content) {
      var m = document.querySelector('meta[property="' + prop + '"]');
      if (m) m.setAttribute("content", content);
    };

    set("description", s.metaDescription || "");
    set("keywords", s.metaKeywords || "");
    var t = document.querySelector('meta[name="theme-color"]');
    if (t) t.setAttribute("content", s.accent || "#0284c7");

    var url = "https://" + SITE + ".kiprol.ru/";
    var canon = document.querySelector('link[rel="canonical"]');
    if (canon) canon.setAttribute("href", url);

    var ogImage = s.ogImage
      ? SITE_DIR + "/img/" + s.ogImage
      : (s.heroBg ? "https://" + SITE + ".kiprol.ru/" + SITE_DIR + "/img/" + s.heroBg : "");
    setProp("og:site_name", "НПО КИПРОЛ — " + (s.heroTitle || "климатическое оборудование"));
    setProp("og:title", s.title);
    setProp("og:description", s.metaDescription || "");
    setProp("og:url", url);
    if (ogImage) setProp("og:image", "https://" + SITE + ".kiprol.ru/" + ogImage.replace(/^\//, ""));
  }

  /* ---------- рендер страницы из site.json ---------- */
  function renderSite(s) {
    el("brand-sub").textContent = s.brandSub || "";
    el("crumb").textContent = s.heroTitle || "Каталог";

    // hero
    el("hero-kicker").textContent = s.heroKicker || "";
    el("hero-title").textContent = s.heroTitle || "";
    el("hero-lead").textContent = s.heroLead || "";
    el("hero-price-label").textContent = s.heroPriceLabel || "";
    el("hero-price-value").textContent = s.heroPriceValue || "";
    el("hero-stats").innerHTML = (s.heroStats || []).map(function (x) {
      return "<li><strong>" + esc(x.value) + "</strong><span>" + esc(x.label) + "</span></li>";
    }).join("");
    if (s.heroBg) {
      el("hero-bg").style.backgroundImage = 'url("' + SITE_DIR + "/img/" + s.heroBg + '")';
      el("hero-bg").setAttribute("aria-label", s.heroTitle || "");
    }
    if (s.ctaBg) {
      el("cta-bg").style.backgroundImage = 'url("' + SITE_DIR + "/img/" + s.ctaBg + '")';
    }

    // promo
    el("promo-emoji").textContent = s.promoEmoji || "🎁";
    el("promo-text").textContent = s.promoText || "";
    el("promo-button").textContent = s.promoButton || "Получить расчёт";

    // catalog section
    el("catalog-kicker").textContent = s.catalogKicker || "Каталог";
    el("catalog-title").textContent = s.catalogTitle || "";
    var cn = el("catalog-note");
    cn.textContent = s.catalogNote || "";
    cn.style.display = s.catalogNote ? "" : "none";

    // why
    el("why-kicker").textContent = s.whyKicker || "Почему мы";
    el("why-title").textContent = s.whyTitle || "";
    el("why-cards").innerHTML = (s.whyCards || []).map(function (c) {
      return '<div class="card"><div class="ic">' + esc(c.icon) + "</div><h3>" + esc(c.title) + "</h3><p>" + esc(c.text) + "</p></div>";
    }).join("");

    // steps
    el("steps-kicker").textContent = s.stepsKicker || "Процесс";
    el("steps-title").textContent = s.stepsTitle || "";
    el("steps").innerHTML = (s.steps || []).map(function (c, i) {
      return '<div class="step"><span class="step-num">' + (i + 1) + "</span><h3>" + esc(c.title) + "</h3><p>" + esc(c.text) + "</p></div>";
    }).join("");

    // cta
    el("cta-title").textContent = s.ctaTitle || "";
    el("cta-text").textContent = s.ctaText || "";

    // faq
    el("faq-kicker").textContent = s.faqKicker || "Вопросы и ответы";
    el("faq-title").textContent = s.faqTitle || "";
    el("faq").innerHTML = (s.faq || []).map(function (f) {
      return "<details><summary>" + esc(f.q) + "</summary><p>" + esc(f.a) + "</p></details>";
    }).join("");

    // order
    el("order-title").textContent = s.orderTitle || "Оставить заявку";
    el("order-text").textContent = s.orderText || "";

    // footer
    el("footer-about").textContent = s.footerAbout || "";
    el("footer-catalog").innerHTML = (s.footerLinks || []).map(function (l) {
      return '<li><a href="#catalog">' + esc(l) + "</a></li>";
    }).join("");
    el("footer-copy").textContent = "© 2026 НПО КИПРОЛ · " + SITE + ".kiprol.ru";
    var fs = el("footer-site");
    if (fs) fs.textContent = SITE + ".kiprol.ru";

    if (s.faq && s.faq.length) injectFaqJsonLd(s.faq);
  }

  /* ---------- каталог ---------- */
  function priceHTML(p) {
    var cur = p._currency || "₽";
    var h = '<span class="now">' + fmt(p.price) + ' <span class="cur">' + cur + "</span></span>";
    if (p.old_price) h += '<span class="old">' + fmt(p.old_price) + " " + cur + "</span>";
    return h;
  }

  function imgSrc(p) {
    return /^https?:\/\//.test(p.image) ? p.image : SITE_DIR + "/img/" + p.image;
  }

  function cardHTML(p) {
    var specs = (p.specs || []).map(function (s) {
      return '<li><span class="lbl">' + esc(s.label) + '</span><span class="val">' + esc(s.value) + "</span></li>";
    }).join("");
    var badge = p.badge ? '<span class="pbadge">' + esc(p.badge) + "</span>" : "";
    return (
      '<article class="pcard" data-id="' + esc(p.id) + '">' +
        '<div class="pcard-img">' + badge + '<img src="' + imgSrc(p) + '" alt="' + esc(p.name) + ' — купить в НПО КИПРОЛ" loading="lazy"></div>' +
        '<div class="pcard-body">' +
          '<span class="pcard-type">' + esc(p.type) + "</span>" +
          "<h3>" + esc(p.name) + "</h3>" +
          "<p>" + esc(p.description) + "</p>" +
          '<ul class="pcard-specs">' + specs + "</ul>" +
          '<div class="pcard-foot">' +
            '<div class="price">' + priceHTML(p) + "</div>" +
            '<button class="btn btn-primary" data-order="' + esc(p.id) + '">Заказать</button>' +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function renderFilters() {
    var types = [];
    state.products.forEach(function (p) {
      if (types.indexOf(p.type) === -1) types.push(p.type);
    });
    var box = el("filters");
    if (!types.length) { box.innerHTML = ""; return; }
    box.innerHTML =
      '<button class="chip active" data-type="">Все</button>' +
      types.map(function (t) {
        return '<button class="chip" data-type="' + esc(t) + '">' + esc(t) + "</button>";
      }).join("");
    box.querySelectorAll(".chip").forEach(function (c) {
      c.addEventListener("click", function () {
        state.filter = c.getAttribute("data-type");
        box.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("active"); });
        c.classList.add("active");
        renderGrid();
      });
    });
  }

  function renderGrid() {
    var grid = el("catalog-grid");
    if (!state.products.length) {
      grid.innerHTML = "";
      return;
    }
    var list = state.filter
      ? state.products.filter(function (p) { return p.type === state.filter; })
      : state.products;
    grid.innerHTML = list.map(cardHTML).join("");
    grid.querySelectorAll("[data-order]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        el("product").value = btn.getAttribute("data-order");
        el("order").scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  function fillSelect() {
    var sel = el("product");
    if (!state.products.length) {
      sel.innerHTML = '<option value="consult">Консультация / подбор оборудования</option>';
      return;
    }
    sel.innerHTML = state.products.map(function (p) {
      return '<option value="' + esc(p.id) + '">' + esc(p.name) + "</option>";
    }).join("");
  }

  function injectCatalogJsonLd() {
    var items = state.products.map(function (p, i) {
      return {
        "@type": "Product",
        "name": p.name,
        "description": p.description,
        "image": "https://" + SITE + ".kiprol.ru/" + imgSrc(p).replace(/^\//, ""),
        "position": i + 1,
        "offers": {
          "@type": "Offer",
          "priceCurrency": "RUB",
          "price": String(p.price),
          "availability": "https://schema.org/InStock",
          "url": "https://" + SITE + ".kiprol.ru/#catalog"
        }
      };
    });
    if (!items.length) return;
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": state.site.catalogTitle || "Каталог",
      "itemListElement": items
    });
    document.head.appendChild(s);
  }

  function injectFaqJsonLd(faq) {
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faq.map(function (f) {
        return {
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": { "@type": "Answer", "text": f.a }
        };
      })
    });
    document.head.appendChild(s);
  }

  /* ---------- форма заказа ---------- */
  function initForm() {
    var form = el("order-form");
    var status = el("form-status");
    var btn = el("submit-btn");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.className = "form-status";
      status.textContent = "";
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var sel = el("product");
      var product = sel.options[sel.selectedIndex].text;

      var payload = {
        site: SITE,
        product: product,
        quantity: el("quantity").value,
        name: el("name").value.trim(),
        phone: el("phone").value.trim(),
        email: el("email").value.trim(),
        comment: el("comment").value.trim()
      };

      btn.disabled = true;
      btn.textContent = "Отправка…";
      fetch(ORDER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (data) {
          if (data && data.ok) {
            status.className = "form-status ok";
            status.textContent = data.message || "Заявка отправлена. Мы свяжемся с вами.";
            form.reset();
            fillSelect();
          } else {
            status.className = "form-status err";
            status.textContent = (data && data.error) || "Не удалось отправить. Позвоните +7 (927) 212-39-34 или напишите info@kiprol.ru";
          }
        })
        .catch(function () {
          status.className = "form-status err";
          status.textContent = "Сервер недоступен. Позвоните +7 (927) 212-39-34 или напишите info@kiprol.ru";
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = "Отправить заявку";
        });
    });
  }

  /* ---------- загрузка ---------- */
  Promise.all([
    fetch(SITE_DIR + "/site.json").then(function (r) { return r.json(); }),
    fetch(SITE_DIR + "/catalog.json").then(function (r) { return r.json(); }).catch(function () { return { products: [] }; })
  ])
    .then(function (res) {
      state.site = res[0];
      state.products = res[1].products || [];
      state.products.forEach(function (p) { p._currency = (res[1].currency) || "₽"; });
      setMeta(state.site);
      renderSite(state.site);
      fillSelect();
      renderFilters();
      renderGrid();
      injectCatalogJsonLd();
    })
    .catch(function () {
      el("catalog-grid").innerHTML = '<p class="catalog-note">Не удалось загрузить данные сайта (site/' + SITE + '/site.json).</p>';
    });

  /* ---------- мобильное меню (бургер) + поведение шапки ---------- */
  var menuOpen = false;

  function showHeader() {
    var h = document.querySelector(".site-header");
    if (h) h.classList.remove("header-hide");
  }

  function setMenuOpen(open) {
    menuOpen = open;
    var burger = document.getElementById("burger");
    var panel = document.getElementById("header-panel");
    if (burger && panel) {
      panel.classList.toggle("open", open);
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    }
    if (open) showHeader();
  }

  /* точная высота шапки для расчёта hero (100vh) */
  function syncHeaderH() {
    var h = document.querySelector(".site-header");
    if (h) document.documentElement.style.setProperty("--header-h", h.offsetHeight + "px");
  }

  /* шапка уезжает при прокрутке вниз, появляется при прокрутке вверх.
     Работает на всех устройствах (десктоп и телефон) — слушаем обычный скролл. */
  function initHeaderScroll() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var last = window.scrollY || 0;
    var ticking = false;
    function update() {
      ticking = false;
      var y = window.scrollY || 0;
      var d = y - last;
      if (!menuOpen) {
        if (y <= 60) header.classList.remove("header-hide");
        else if (d > 6) header.classList.add("header-hide");
        else if (d < -6) header.classList.remove("header-hide");
      }
      last = y;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
  }

  function initBurger() {
    var burger = document.getElementById("burger");
    var panel = document.getElementById("header-panel");
    if (!burger || !panel) return;

    burger.addEventListener("click", function (e) {
      e.stopPropagation();
      setMenuOpen(!menuOpen);
    });
    // закрытие по клику на пункт меню
    panel.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenuOpen(false);
    });
    // закрытие по клику вне шапки
    document.addEventListener("click", function (e) {
      if (!menuOpen) return;
      if (!e.target.closest(".site-header")) setMenuOpen(false);
    });
    // при возврате к десктопу сбрасываем состояние
    window.addEventListener("resize", function () {
      if (window.innerWidth > 820) setMenuOpen(false);
      syncHeaderH();
    });

    // логотип — прокрутка к началу страницы (вместо перехода на kiprol.ru)
    var brand = document.getElementById("brand-top");
    if (brand) {
      brand.addEventListener("click", function (e) {
        e.preventDefault();
        setMenuOpen(false);
        showHeader();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    var logoImg = document.querySelector(".logo-img");
    if (logoImg) {
      if (logoImg.complete) syncHeaderH();
      else logoImg.addEventListener("load", syncHeaderH);
    }
    window.addEventListener("load", syncHeaderH);
    syncHeaderH();
  }

  initForm();
  initBurger();
  initHeaderScroll();
})();
