(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const interactiveSelector = ".btn, button, [role='button'], .nav-link, .dropdown-item";

  const initMobileSidebar = () => {
    const sidebar = document.querySelector(".dashboard-page .navbar-custom .navbar-collapse");
    const toggler = document.querySelector(".dashboard-page .navbar-custom .navbar-toggler");
    if (!sidebar || !toggler || typeof bootstrap === "undefined") return;

    sidebar.classList.add("mobile-nav-sidebar");
    toggler.classList.add("mobile-sidebar-toggle");
    toggler.setAttribute("aria-label", "Abrir menu lateral");

    if (!sidebar.querySelector(".mobile-sidebar-header")) {
      sidebar.insertAdjacentHTML("afterbegin", `
        <div class="mobile-sidebar-header">
          <div><span>Connect Senac</span><small>Menu de navegação</small></div>
          <button type="button" class="mobile-sidebar-close" aria-label="Fechar menu lateral"><i class="bi bi-x-lg"></i></button>
        </div>`);
    }

    const backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "mobile-sidebar-backdrop";
    backdrop.setAttribute("aria-label", "Fechar menu lateral");
    document.body.appendChild(backdrop);

    const collapse = bootstrap.Collapse.getOrCreateInstance(sidebar, { toggle: false });
    const closeSidebar = () => collapse.hide();

    sidebar.addEventListener("show.bs.collapse", () => {
      document.body.classList.add("mobile-sidebar-open");
      toggler.setAttribute("aria-label", "Fechar menu lateral");
    });
    sidebar.addEventListener("hidden.bs.collapse", () => {
      document.body.classList.remove("mobile-sidebar-open");
      toggler.setAttribute("aria-label", "Abrir menu lateral");
    });
    sidebar.querySelector(".mobile-sidebar-close")?.addEventListener("click", closeSidebar);
    backdrop.addEventListener("click", closeSidebar);
    sidebar.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 991.98px)").matches) closeSidebar();
    }));
    window.addEventListener("resize", () => {
      if (window.innerWidth >= 992) {
        document.body.classList.remove("mobile-sidebar-open");
        collapse.hide();
      }
    });
  };

  const markInteractiveElements = (root = document) => {
    root.querySelectorAll(interactiveSelector).forEach((element) => {
      element.classList.add("ui-clickable");
    });
  };

  const showRipple = (element, event) => {
    if (reduceMotion.matches || element.disabled || element.classList.contains("disabled")) return;

    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.35;
    const ripple = document.createElement("span");
    ripple.className = "ui-ripple";
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    element.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  };

  document.addEventListener("pointerdown", (event) => {
    const element = event.target.closest(interactiveSelector);
    if (!element) return;
    element.classList.add("ui-clickable", "ui-pressing");
    showRipple(element, event);
  });

  ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
    document.addEventListener(eventName, (event) => {
      event.target.closest?.(".ui-pressing")?.classList.remove("ui-pressing");
    });
  });

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || reduceMotion.matches || event.defaultPrevented || event.button !== 0 ||
        event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
        link.target === "_blank" || link.hasAttribute("download")) return;

    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin ||
        (destination.pathname === window.location.pathname && destination.search === window.location.search && destination.hash)) return;

    event.preventDefault();
    document.body.classList.add("ui-page-leaving");
    window.setTimeout(() => { window.location.href = destination.href; }, 230);
  });

  markInteractiveElements();
  initMobileSidebar();
  new MutationObserver((mutations) => {
    mutations.forEach(({ addedNodes }) => addedNodes.forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.matches?.(interactiveSelector)) node.classList.add("ui-clickable");
      markInteractiveElements(node);
    }));
  }).observe(document.body, { childList: true, subtree: true });

  requestAnimationFrame(() => document.body.classList.add("ui-page-ready"));
})();
