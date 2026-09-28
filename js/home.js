fetch("json/announcements.json")
    .then(response => response.json())
    .then(announcements => {

        const track = document.querySelector(".announcement-track");

        announcements.forEach(text => {
            const item = document.createElement("span");
            item.textContent = text;
            track.appendChild(item);
        });

        // Duplicate the announcements automatically
        announcements.forEach(text => {
            const item = document.createElement("span");
            item.textContent = text;
            track.appendChild(item);
        });

    })
    .catch(error => {
        console.error("Failed to load announcements:", error);
    });