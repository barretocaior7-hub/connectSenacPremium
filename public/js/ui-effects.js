(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const interactiveSelector = ".btn, button, [role='button'], .nav-link, .dropdown-item";

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

  // ==========================================================================
  // JANELAS MODAIS ARRASTÁVEIS (DRAGGABLE MODALS)
  // ==========================================================================
  const initDraggableModal = (modalEl) => {
    if (!modalEl || modalEl.dataset.draggableReady === "true") return;
    const dialog = modalEl.querySelector(".modal-dialog");
    const header = modalEl.querySelector(".modal-header, .modal-header-custom, .modal-drag-handle, [data-drag-handle]");
    if (!dialog || !header) return;

    modalEl.dataset.draggableReady = "true";
    header.style.cursor = "grab";

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialX = 0;
    let initialY = 0;

    const onPointerDown = (e) => {
      if (e.target.closest("button, a, input, select, textarea, .btn-close")) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const style = window.getComputedStyle(dialog);
      const matrix = new DOMMatrixReadOnly(style.transform);
      initialX = matrix.m41;
      initialY = matrix.m42;

      header.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      dialog.classList.add("is-dragging");

      const onPointerMove = (moveEvt) => {
        if (!isDragging) return;
        const dx = moveEvt.clientX - startX;
        const dy = moveEvt.clientY - startY;
        dialog.style.transform = `translate(${initialX + dx}px, ${initialY + dy}px)`;
      };

      const onPointerUp = () => {
        isDragging = false;
        header.style.cursor = "grab";
        document.body.style.userSelect = "";
        dialog.classList.remove("is-dragging");
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
        document.removeEventListener("pointercancel", onPointerUp);
      };

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
      document.addEventListener("pointercancel", onPointerUp);
    };

    header.addEventListener("pointerdown", onPointerDown);

    modalEl.addEventListener("hidden.bs.modal", () => {
      dialog.style.transform = "";
    });
  };

  const markDraggableModals = (root = document) => {
    root.querySelectorAll(".modal").forEach(initDraggableModal);
  };

  window.makeModalDraggable = initDraggableModal;

  markInteractiveElements();
  markDraggableModals();

  new MutationObserver((mutations) => {
    mutations.forEach(({ addedNodes }) => addedNodes.forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.matches?.(interactiveSelector)) node.classList.add("ui-clickable");
      if (node.matches?.(".modal")) initDraggableModal(node);
      markInteractiveElements(node);
      markDraggableModals(node);
    }));
  }).observe(document.body, { childList: true, subtree: true });

  requestAnimationFrame(() => document.body.classList.add("ui-page-ready"));
})();
