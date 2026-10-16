
(() => {
    "use strict";

    const page = document.querySelector(".tg-page");

    if (!page || page.dataset.initialized === "true") {
        return;
    }

    page.dataset.initialized = "true";

    // Mobile navigation
    const navToggle = document.querySelector(".tg-nav-toggle");
    const navLinks = document.querySelector("#tg-nav-links");

    if (navToggle && navLinks) {
        navToggle.addEventListener("click", () => {
            const isOpen = navToggle.getAttribute("aria-expanded") === "true";

            navToggle.setAttribute("aria-expanded", String(!isOpen));
            navLinks.classList.toggle("is-open", !isOpen);
        });

        navLinks.addEventListener("click", (event) => {
            if (event.target.closest("a")) {
                navToggle.setAttribute("aria-expanded", "false");
                navLinks.classList.remove("is-open");
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                navToggle.setAttribute("aria-expanded", "false");
                navLinks.classList.remove("is-open");
                navToggle.focus();
            }
        });
    }

    // Expand and collapse all custom-working chapters
    const chaptersContainer = document.querySelector(
        "#tg-custom-chapters"
    );

    const expandAll = document.querySelector("#tg-expand-all");
    const collapseAll = document.querySelector("#tg-collapse-all");

    if (chaptersContainer && expandAll && collapseAll) {
        const chapters = () => [
            ...chaptersContainer.querySelectorAll(".tg-chapter")
        ];

        expandAll.addEventListener("click", () => {
            chapters().forEach((chapter) => {
                chapter.open = true;
            });
        });

        collapseAll.addEventListener("click", () => {
            chapters().forEach((chapter) => {
                chapter.open = false;
            });
        });
    }

    // Keep the contents navigation aligned with the current section.
    const sectionLinks = [
        ...page.querySelectorAll(".tg-side-link[href^='#']")
    ];

    const sections = sectionLinks
        .map((link) => page.querySelector(link.getAttribute("href")))
        .filter(Boolean);

    function setActiveSection(id) {
        sectionLinks.forEach((link) => {
            const active = link.getAttribute("href") === `#${id}`;

            link.classList.toggle("is-active", active);

            if (active) {
                link.setAttribute("aria-current", "location");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort(
                        (a, b) =>
                            a.boundingClientRect.top -
                            b.boundingClientRect.top
                    );

                if (visible.length) {
                    setActiveSection(visible[0].target.id);
                }
            },
            {
                rootMargin: "-15% 0px -70% 0px",
                threshold: 0
            }
        );

        sections.forEach((section) => observer.observe(section));
    }

    sectionLinks.forEach((link) => {
        link.addEventListener("click", () => {
            const id = link.getAttribute("href").slice(1);
            setActiveSection(id);
        });
    });
})();
