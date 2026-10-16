
document.addEventListener("DOMContentLoaded", async () => {
    const placeholder = document.querySelector("[data-include-navbar]");

    if (!placeholder) return;

    try {
        const response = await fetch("components/navbar.html");

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        placeholder.innerHTML = await response.text();

        const navToggle = placeholder.querySelector(".tg-nav-toggle");
        const navLinks = placeholder.querySelector("#tg-nav-links");

        // Highlight the current page
        const currentPage = window.location.pathname
            .split("/")
            .pop() || "index.html";

        placeholder.querySelectorAll("a[href]").forEach((link) => {
            const href = link.getAttribute("href");

            if (href === currentPage) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });

        // Mobile navigation
        if (navToggle && navLinks) {
            const closeMenu = () => {
                navToggle.setAttribute("aria-expanded", "false");
                navLinks.classList.remove("is-open");
            };

            navToggle.addEventListener("click", () => {
                const isOpen =
                    navToggle.getAttribute("aria-expanded") === "true";

                navToggle.setAttribute("aria-expanded", String(!isOpen));
                navLinks.classList.toggle("is-open", !isOpen);
            });

            navLinks.addEventListener("click", (event) => {
                if (event.target.closest("a")) {
                    closeMenu();
                }
            });

            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    closeMenu();
                    navToggle.focus();
                }
            });
        }
    } catch (error) {
        console.error("Could not load the navbar:", error);
    }
});
