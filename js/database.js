/* =========================================================
DIE IN THE DARK
CHARACTER DATABASE
========================================================= */

/* =========================================================
DATA SOURCES
========================================================= */

const HUMAN_SHEET_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2f5cMJbrxbmOgLn4meuKDPlmN4bTP8sN3oeQIEujQ32f9OSa9YRZqz6xVw4sk4qmoW5FZNKewVRx6/pub?gid=0&single=true&output=csv";

const ANOMALY_SHEET_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2f5cMJbrxbmOgLn4meuKDPlmN4bTP8sN3oeQIEujQ32f9OSa9YRZqz6xVw4sk4qmoW5FZNKewVRx6/pub?gid=1214065682&single=true&output=csv";

let characters = [];

/* =========================================================
DELTA GREEN CONFIGURATION
========================================================= */

const DG_NORMAL_SKILLS = [
["ACCOUNTING", "Accounting"],
["ALERTNESS", "Alertness"],
["ANTHROPOLOGY", "Anthropology"],
["ARCHEOLOGY", "Archeology"],
["ARTILLERY", "Artillery"],
["ATHLETICS", "Athletics"],
["BUREAUCRACY", "Bureaucracy"],
["COMPUTER_SCIENCE", "Computer Science"],
["CRIMINOLOGY", "Criminology"],
["DEMOLITIONS", "Demolitions"],
["DISGUISE", "Disguise"],
["DODGE", "Dodge"],
["DRIVE", "Drive"],
["FIREARMS", "Firearms"],
["FIRST_AID", "First Aid"],
["FORENSICS", "Forensics"],
["HEAVY_MACHINERY", "Heavy Machinery"],
["HEAVY_WEAPONS", "Heavy Weapons"],
["HISTORY", "History"],
["HUMINT", "HUMINT"],
["LAW", "Law"],
["MEDICINE", "Medicine"],
["MELEE_WEAPONS", "Melee Weapons"],
["NAVIGATE", "Navigate"],
["OCCULT", "Occult"],
["PERSUADE", "Persuade"],
["PHARMACY", "Pharmacy"],
["PSYCHOTHERAPY", "Psychotherapy"],
["RIDE", "Ride"],
["SEARCH", "Search"],
["SIGINT", "SIGINT"],
["STEALTH", "Stealth"],
["SURGERY", "Surgery"],
["SURVIVAL", "Survival"],
["SWIM", "Swim"],
["UNARMED_COMBAT", "Unarmed Combat"],
["UNNATURAL", "Unnatural"]
];

const DG_SPECIALIZED_SKILLS = [
["ART", "Art"],
["CRAFT", "Craft"],
["FOREIGN_LANGUAGE", "Foreign Language"],
["MILITARY_SCIENCE", "Military Science"],
["PILOT", "Pilot"],
["SCIENCE", "Science"]
];

/* =========================================================
STATE
========================================================= */

let currentType = "HUMAN";
let currentSearch = "";
let currentFilters = {};
let currentPage = 1;

const recordsPerPage = 10;

/* =========================================================
DOM ELEMENTS
========================================================= */

const characterList =
document.getElementById("character-list");

const searchInput =
document.getElementById("character-search");

const filterContainer =
document.getElementById("filter-container");

const resultCount =
document.getElementById("result-count");

const noResults =
document.getElementById("no-results");

const humanCount =
document.getElementById("human-count");

const anomalyCount =
document.getElementById("anomaly-count");

const tabs =
document.querySelectorAll(".database-tab");

/* =========================================================
INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
await loadCharacters();


updateCounts();
setupTabs();
setupSearch();

document.addEventListener("click", () => {
    document
        .querySelectorAll(".filter-wrapper.open")
        .forEach(wrapper => {
            wrapper.classList.remove("open");
        });
});

renderFilters();
renderCharacters();


});

/* =========================================================
DATA LOADING
========================================================= */

async function loadCharacters() {
try {
const [humanResponse, anomalyResponse] =
await Promise.all([
fetch(HUMAN_SHEET_URL),
fetch(ANOMALY_SHEET_URL)
]);


    if (!humanResponse.ok) {
        throw new Error(
            `HUMAN sheet returned ${humanResponse.status}`
        );
    }

    if (!anomalyResponse.ok) {
        throw new Error(
            `ANOMALY sheet returned ${anomalyResponse.status}`
        );
    }

    const humanCSV =
        await humanResponse.text();

    const anomalyCSV =
        await anomalyResponse.text();

    const humanCharacters =
        parseCSV(humanCSV).map(row => ({
            id: row.id || "",
            name: row.name || "",
            callsign: row.callsign || "",
            image: row.image || "",

            type: "HUMAN",
            class: row.class || "",

            faction: row.faction || "",
            department: row.department || "",
            division: row.division || "",
            rank: row.rank || "",
            clearance: row.clearance || "",
            status: row.status || "",
            location: row.location || "",

            player_id: row.player_id || "",
            description: row.description || "",

            dg_hp: row.dg_hp || "",
            dg_wp: row.dg_wp || "",
            dg_san: row.dg_san || "",

            dg_str: row.dg_str || "",
            dg_con: row.dg_con || "",
            dg_dex: row.dg_dex || "",
            dg_int: row.dg_int || "",
            dg_pow: row.dg_pow || "",
            dg_cha: row.dg_cha || "",

            dg_accounting: row.dg_accounting || "",
            dg_alertness: row.dg_alertness || "",
            dg_anthropology: row.dg_anthropology || "",
            dg_archeology: row.dg_archeology || "",
            dg_artillery: row.dg_artillery || "",
            dg_athletics: row.dg_athletics || "",
            dg_bureaucracy: row.dg_bureaucracy || "",
            dg_computer_science: row.dg_computer_science || "",
            dg_criminology: row.dg_criminology || "",
            dg_demolitions: row.dg_demolitions || "",
            dg_disguise: row.dg_disguise || "",
            dg_dodge: row.dg_dodge || "",
            dg_drive: row.dg_drive || "",
            dg_firearms: row.dg_firearms || "",
            dg_first_aid: row.dg_first_aid || "",
            dg_forensics: row.dg_forensics || "",
            dg_heavy_machinery: row.dg_heavy_machinery || "",
            dg_heavy_weapons: row.dg_heavy_weapons || "",
            dg_history: row.dg_history || "",
            dg_humint: row.dg_humint || "",
            dg_law: row.dg_law || "",
            dg_medicine: row.dg_medicine || "",
            dg_melee_weapons: row.dg_melee_weapons || "",
            dg_navigate: row.dg_navigate || "",
            dg_occult: row.dg_occult || "",
            dg_persuade: row.dg_persuade || "",
            dg_pharmacy: row.dg_pharmacy || "",
            dg_psychotherapy: row.dg_psychotherapy || "",
            dg_ride: row.dg_ride || "",
            dg_search: row.dg_search || "",
            dg_sigint: row.dg_sigint || "",
            dg_stealth: row.dg_stealth || "",
            dg_surgery: row.dg_surgery || "",
            dg_survival: row.dg_survival || "",
            dg_swim: row.dg_swim || "",
            dg_unarmed_combat: row.dg_unarmed_combat || "",
            dg_unnatural: row.dg_unnatural || "",

            dg_art: row.dg_art || "",
            dg_craft: row.dg_craft || "",
            dg_foreign_language: row.dg_foreign_language || "",
            dg_military_science: row.dg_military_science || "",
            dg_pilot: row.dg_pilot || "",
            dg_science: row.dg_science || ""
        }));

    const anomalyCharacters =
        parseCSV(anomalyCSV).map(row => ({
            catalog: row.catalog || "",
            id: row.id || "",
            codename: row.codename || "",

            type: "ANOMALY",

            anomalyType: row.type || "",
            object_class: row.object_class || "",
            clearance: row.clearance || "",
            containment: row.containment || "",
            location: row.location || "",
            status: row.status || "",

            image: row.image || "",
            player_id: row.player_id || "",
            blurb: row.blurb || "",
            tags: row.tags || "",

            dg_hp: row.dg_hp || "",
            dg_wp: row.dg_wp || "",
            dg_san: row.dg_san || "",

            dg_str: row.dg_str || "",
            dg_con: row.dg_con || "",
            dg_dex: row.dg_dex || "",
            dg_int: row.dg_int || "",
            dg_pow: row.dg_pow || "",
            dg_cha: row.dg_cha || "",

            dg_accounting: row.dg_accounting || "",
            dg_alertness: row.dg_alertness || "",
            dg_anthropology: row.dg_anthropology || "",
            dg_archeology: row.dg_archeology || "",
            dg_artillery: row.dg_artillery || "",
            dg_athletics: row.dg_athletics || "",
            dg_bureaucracy: row.dg_bureaucracy || "",
            dg_computer_science: row.dg_computer_science || "",
            dg_criminology: row.dg_criminology || "",
            dg_demolitions: row.dg_demolitions || "",
            dg_disguise: row.dg_disguise || "",
            dg_dodge: row.dg_dodge || "",
            dg_drive: row.dg_drive || "",
            dg_firearms: row.dg_firearms || "",
            dg_first_aid: row.dg_first_aid || "",
            dg_forensics: row.dg_forensics || "",
            dg_heavy_machinery: row.dg_heavy_machinery || "",
            dg_heavy_weapons: row.dg_heavy_weapons || "",
            dg_history: row.dg_history || "",
            dg_humint: row.dg_humint || "",
            dg_law: row.dg_law || "",
            dg_medicine: row.dg_medicine || "",
            dg_melee_weapons: row.dg_melee_weapons || "",
            dg_navigate: row.dg_navigate || "",
            dg_occult: row.dg_occult || "",
            dg_persuade: row.dg_persuade || "",
            dg_pharmacy: row.dg_pharmacy || "",
            dg_psychotherapy: row.dg_psychotherapy || "",
            dg_ride: row.dg_ride || "",
            dg_search: row.dg_search || "",
            dg_sigint: row.dg_sigint || "",
            dg_stealth: row.dg_stealth || "",
            dg_surgery: row.dg_surgery || "",
            dg_survival: row.dg_survival || "",
            dg_swim: row.dg_swim || "",
            dg_unarmed_combat: row.dg_unarmed_combat || "",
            dg_unnatural: row.dg_unnatural || "",

            dg_art: row.dg_art || "",
            dg_craft: row.dg_craft || "",
            dg_foreign_language: row.dg_foreign_language || "",
            dg_military_science: row.dg_military_science || "",
            dg_pilot: row.dg_pilot || "",
            dg_science: row.dg_science || ""
        }));

    characters = [
        ...humanCharacters,
        ...anomalyCharacters
    ];

} catch (error) {
    console.error(
        "Failed to load database:",
        error
    );

    characters = [];
}


}

/* =========================================================
CSV PARSER
========================================================= */

function parseCSV(csv) {
const rows = [];
let row = [];
let value = "";
let insideQuotes = false;


for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const next = csv[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
        value += '"';
        i++;
        continue;
    }

    if (char === '"') {
        insideQuotes = !insideQuotes;
        continue;
    }

    if (char === "," && !insideQuotes) {
        row.push(value);
        value = "";
        continue;
    }

    if (char === "\n" && !insideQuotes) {
        row.push(value);
        rows.push(row);
        row = [];
        value = "";
        continue;
    }

    if (char !== "\r") {
        value += char;
    }
}

if (value !== "" || row.length > 0) {
    row.push(value);
    rows.push(row);
}

if (rows.length === 0) {
    return [];
}

const headers = rows[0].map(header =>
    header.trim()
);

return rows
    .slice(1)
    .filter(row =>
        row.some(value => value.trim() !== "")
    )
    .map(row => {
        const object = {};

        headers.forEach((header, index) => {
            object[header] =
                row[index] !== undefined
                    ? row[index].trim()
                    : "";
        });

        return object;
    });


}

/* =========================================================
TABS
========================================================= */

function setupTabs() {
tabs.forEach(tab => {
tab.addEventListener("click", () => {
currentType = tab.dataset.type;
currentSearch = "";
searchInput.value = "";
currentFilters = {};
currentPage = 1;


        tabs.forEach(item => {
            item.classList.remove("active");
        });

        tab.classList.add("active");

        renderFilters();
        renderCharacters();
    });
});


}

/* =========================================================
SEARCH
========================================================= */

function setupSearch() {
searchInput.addEventListener("input", event => {
currentSearch =
event.target.value
.trim()
.toLowerCase();


    currentPage = 1;

    renderCharacters();
});


}

/* =========================================================
COUNTS
========================================================= */

function updateCounts() {
const humans =
characters.filter(
character => character.type === "HUMAN"
);


const anomalies =
    characters.filter(
        character => character.type === "ANOMALY"
    );

humanCount.textContent =
    String(humans.length).padStart(2, "0");

anomalyCount.textContent =
    String(anomalies.length).padStart(2, "0");


}

/* =========================================================
FILTERS
========================================================= */

function renderFilters() {
const container =
document.getElementById("filter-container");


container.innerHTML = "";

const filterFields =
    currentType === "HUMAN"
        ? [
            { key: "faction", label: "FACTION" },
            { key: "department", label: "DEPARTMENT" },
            { key: "division", label: "DIVISION" },
            { key: "rank", label: "RANK" },
            { key: "clearance", label: "CLEARANCE" },
            { key: "location", label: "LOCATION" },
            { key: "status", label: "STATUS" }
        ]
        : [
            { key: "catalog", label: "CATALOG" },
            { key: "object_class", label: "OBJECT CLASS" },
            { key: "clearance", label: "CLEARANCE" },
            { key: "anomalyType", label: "TYPE" },
            { key: "location", label: "LOCATION" },
            { key: "status", label: "STATUS" }
        ];

filterFields.forEach(field => {
    const values = [
        ...new Set(
            characters
                .filter(
                    character =>
                        character.type === currentType
                )
                .map(
                    character =>
                        character[field.key]
                )
                .filter(
                    value =>
                        value !== null &&
                        value !== undefined &&
                        String(value).trim() !== ""
                )
        )
    ].sort();

    if (values.length === 0) {
        return;
    }

    currentFilters[field.key] =
        currentFilters[field.key] || [];

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "filter-wrapper";

    const selectedCount =
        currentFilters[field.key].length;

    wrapper.innerHTML = `
        <button
            type="button"
            class="filter-select ${
                selectedCount > 0
                    ? "filtered"
                    : ""
            }"
        >
            <span>
                ${field.label}
                ${
                    selectedCount > 0
                        ? ` (${selectedCount})`
                        : ""
                }
            </span>

            <span class="filter-arrow">
                ⌄
            </span>
        </button>

        <div class="filter-dropdown">
            ${
                values
                    .map(
                        value => `
                            <label class="filter-option">
                                <input
                                    type="checkbox"
                                    value="${escapeHTML(value)}"
                                    ${
                                        currentFilters[field.key]
                                            .includes(value)
                                            ? "checked"
                                            : ""
                                    }
                                >

                                <span class="filter-checkbox"></span>

                                <span class="filter-option-text">
                                    ${escapeHTML(value)}
                                </span>
                            </label>
                        `
                    )
                    .join("")
            }
        </div>
    `;

    const select =
        wrapper.querySelector(".filter-select");

    const dropdown =
        wrapper.querySelector(".filter-dropdown");

    select.addEventListener("click", event => {
        event.stopPropagation();

        document
            .querySelectorAll(".filter-wrapper.open")
            .forEach(other => {
                if (other !== wrapper) {
                    other.classList.remove("open");
                }
            });

        wrapper.classList.toggle("open");
    });

    dropdown.addEventListener("click", event => {
        event.stopPropagation();
    });

    wrapper
        .querySelectorAll('input[type="checkbox"]')
        .forEach(input => {
            input.addEventListener("change", () => {
                currentFilters[field.key] = [
                    ...wrapper.querySelectorAll(
                        'input[type="checkbox"]:checked'
                    )
                ].map(
                    checkbox =>
                        checkbox.value
                );

                const count =
                    currentFilters[field.key].length;

                select.classList.toggle(
                    "filtered",
                    count > 0
                );

                select
                    .querySelector("span")
                    .textContent =
                        `${field.label}${
                            count > 0
                                ? ` (${count})`
                                : ""
                        }`;

                currentPage = 1;

                renderCharacters();
            });
        });

    container.appendChild(wrapper);
});

const resetButton =
    document.createElement("button");

resetButton.type = "button";
resetButton.className = "filter-reset";
resetButton.textContent = "RESET";

resetButton.addEventListener("click", () => {
    currentFilters = {};
    currentPage = 1;

    renderFilters();
    renderCharacters();
});

container.appendChild(resetButton);


}

/* =========================================================
FILTER RECORDS
========================================================= */

function getFilteredCharacters() {
return characters.filter(character => {


    if (character.type !== currentType) {
        return false;
    }

    if (currentSearch) {
        const searchableText = [
            character.id,
            character.name,
            character.callsign,
            character.faction,
            character.department,
            character.division,
            character.rank,
            character.status,
            character.location,
            character.player_id,
            character.catalog,
            character.codename,
            character.anomalyType,
            character.object_class,
            character.clearance,
            character.tags,
            character.containment
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        if (!searchableText.includes(currentSearch)) {
            return false;
        }
    }

    for (const key in currentFilters) {
        const selectedValues =
            currentFilters[key];

        if (
            selectedValues.length > 0 &&
            !selectedValues.includes(character[key])
        ) {
            return false;
        }
    }

    return true;
});


}

/* =========================================================
TABLE
========================================================= */

function renderTableHeader() {
const header =
document.getElementById("table-header");


if (currentType === "HUMAN") {
    header.className =
        "table-header human-layout";

    header.innerHTML = `
        <div class="table-cell id-cell">#</div>
        <div class="table-cell name-cell">NAME</div>
        <div class="table-cell faction-cell">FACTION</div>
        <div class="table-cell department-cell">DEPARTMENT</div>
        <div class="table-cell division-cell">DIVISION</div>
        <div class="table-cell rank-cell">RANK</div>
        <div class="table-cell clearance-cell">CLEARANCE</div>
        <div class="table-cell location-cell">LOCATION</div>
    `;

    return;
}

header.className =
    "table-header anomaly-layout";

header.innerHTML = `
    <div class="table-cell catalog-cell">CATALOG</div>
    <div class="table-cell id-cell">ID</div>
    <div class="table-cell codename-cell">CODENAME</div>
    <div class="table-cell object-class-cell">OBJECT CLASS</div>
    <div class="table-cell clearance-cell">CLEARANCE</div>
    <div class="table-cell type-cell">TYPE</div>
    <div class="table-cell containment-cell">CONTAINMENT</div>
    <div class="table-cell location-cell">LOCATION</div>
`;


}

/* =========================================================
PAGINATION
========================================================= */

function renderPagination(totalPages) {
let pagination =
document.getElementById("database-pagination");


if (totalPages <= 1) {
    if (pagination) {
        pagination.remove();
    }

    return;
}

if (!pagination) {
    pagination =
        document.createElement("div");

    pagination.id =
        "database-pagination";

    pagination.className =
        "database-pagination";

    characterList.parentNode.appendChild(
        pagination
    );
}

pagination.innerHTML = "";

const previous =
    document.createElement("button");

previous.className =
    "pagination-button";

previous.textContent =
    "‹";

previous.disabled =
    currentPage === 1;

previous.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        renderCharacters();
    }
});

pagination.appendChild(previous);

const pages = [];

function addPage(page) {
    if (!pages.includes(page)) {
        pages.push(page);
    }
}

addPage(1);
addPage(totalPages);
addPage(currentPage);
addPage(currentPage - 1);
addPage(currentPage + 1);
addPage(currentPage - 2);
addPage(currentPage + 2);

pages.sort((a, b) => a - b);

let previousPage = null;

pages.forEach(page => {
    if (
        page < 1 ||
        page > totalPages
    ) {
        return;
    }

    if (
        previousPage !== null &&
        page > previousPage + 1
    ) {
        const ellipsis =
            document.createElement("span");

        ellipsis.className =
            "pagination-ellipsis";

        ellipsis.textContent =
            "…";

        pagination.appendChild(ellipsis);
    }

    const button =
        document.createElement("button");

    button.className =
        "pagination-button";

    button.textContent =
        String(page).padStart(2, "0");

    if (page === currentPage) {
        button.classList.add("active");
    }

    button.addEventListener("click", () => {
        currentPage = page;
        renderCharacters();
    });

    pagination.appendChild(button);

    previousPage = page;
});

const next =
    document.createElement("button");

next.className =
    "pagination-button";

next.textContent =
    "›";

next.disabled =
    currentPage === totalPages;

next.addEventListener("click", () => {
    if (currentPage < totalPages) {
        currentPage++;
        renderCharacters();
    }
});

pagination.appendChild(next);


}

/* =========================================================
CHARACTER RENDERING
========================================================= */

function renderCharacters() {
renderTableHeader();


const filteredCharacters =
    getFilteredCharacters();

characterList.innerHTML = "";

resultCount.textContent =
    String(filteredCharacters.length)
        .padStart(2, "0");

if (filteredCharacters.length === 0) {
    noResults.classList.add("visible");
    renderPagination(0);
    return;
}

noResults.classList.remove("visible");

const totalPages =
    Math.ceil(
        filteredCharacters.length /
        recordsPerPage
    );

if (currentPage > totalPages) {
    currentPage = totalPages;
}

const start =
    (currentPage - 1) *
    recordsPerPage;

const end =
    start +
    recordsPerPage;

const pageCharacters =
    filteredCharacters.slice(start, end);

pageCharacters.forEach(character => {
    const record =
        createCharacterRecord(character);

    characterList.appendChild(record);
});

renderPagination(totalPages);


}

/* =========================================================
CHARACTER RECORD
========================================================= */

function createCharacterRecord(character) {
const record =
document.createElement("div");


record.className =
    "character-record";

const row =
    document.createElement("div");

if (currentType === "HUMAN") {
    createHumanRow(row, character);
} else {
    createAnomalyRow(row, character);
}

const details =
    createCharacterDetails(character);

row.addEventListener("click", () => {
    const wasExpanded =
        record.classList.contains("expanded");

    document
        .querySelectorAll(".character-record.expanded")
        .forEach(openRecord => {
            openRecord.classList.remove("expanded");

            const openRow =
                openRecord.querySelector(
                    ".character-row"
                );

            if (openRow) {
                openRow.classList.remove("expanded");
            }
        });

    if (!wasExpanded) {
        record.classList.add("expanded");
        row.classList.add("expanded");
    }
});

record.appendChild(row);
record.appendChild(details);

return record;


}

/* =========================================================
HUMAN ROW
========================================================= */

function createHumanRow(row, character) {
row.className =
"character-row human-layout";


if (
    character.status === "DECEASED" ||
    character.status === "INACTIVE"
) {
    row.classList.add("is-muted");
}

row.innerHTML = `
    <div class="table-cell character-id">
        ${escapeHTML(
            String(character.id)
                .replace(/^POI-/i, "")
        )}
    </div>

    <div class="table-cell character-name">
        <span class="name-primary">
            ${escapeHTML(character.name)}
        </span>

        ${
            character.callsign
                ? `
                    <span class="name-callsign">
                        ${escapeHTML(character.callsign)}
                    </span>
                `
                : ""
        }
    </div>

    <div class="table-cell character-faction">
        ${escapeHTML(character.faction)}
    </div>

    <div class="table-cell character-department">
        ${escapeHTML(character.department)}
    </div>

    <div class="table-cell character-division">
        ${escapeHTML(character.division)}
    </div>

    <div class="table-cell character-rank">
        ${escapeHTML(character.rank)}
    </div>

    <div class="table-cell character-clearance">
        ${escapeHTML(character.clearance)}
    </div>

    <div class="table-cell character-location">
        ${escapeHTML(character.location)}
    </div>
`;


}

/* =========================================================
ANOMALY ROW
========================================================= */

function createAnomalyRow(row, character) {
row.className =
"character-row anomaly-layout";


if (
    character.status === "DECEASED" ||
    character.status === "INACTIVE"
) {
    row.classList.add("is-muted");
}

const containment =
    getContainmentPercent(character.containment);

row.innerHTML = `
    <div class="table-cell anomaly-catalog">
        ${escapeHTML(character.catalog)}
    </div>

    <div class="table-cell anomaly-id">
        ${escapeHTML(character.id)}
    </div>

    <div class="table-cell anomaly-codename">
        ${escapeHTML(character.codename)}
    </div>

    <div class="table-cell anomaly-object-class">
        ${escapeHTML(character.object_class)}
    </div>

    <div class="table-cell anomaly-clearance">
        ${escapeHTML(character.clearance)}
    </div>

    <div class="table-cell anomaly-type">
        ${escapeHTML(character.anomalyType)}
    </div>

    <div
        class="table-cell anomaly-containment"
        style="color: ${getContainmentColor(containment)}"
    >
        ${containment}%
    </div>

    <div class="table-cell anomaly-location">
        ${escapeHTML(character.location)}
    </div>
`;


}

/* =========================================================
CHARACTER DETAILS
========================================================= */

function createCharacterDetails(character) {
const details =
document.createElement("div");


details.className =
    "character-details";

details.innerHTML = `
    <div class="details-header">

        <span class="details-designation">
            ${
                currentType === "HUMAN"
                    ? `POI-${escapeHTML(
                        String(character.id)
                            .replace(/^POI-/i, "")
                    )}`
                    : escapeHTML(
                        getAnomalyDesignation(character)
                    )
            }
        </span>

        <span class="details-classification">
            ${
                character.player_id
                    ? `SWANN ENTITY ${escapeHTML(
                        character.player_id
                    )}`
                    : ""
            }
        </span>

    </div>

    <div class="details-body">

        <div class="details-main">

            <div class="details-identity">

                <div class="details-name">
                    ${
                        currentType === "HUMAN"
                            ? escapeHTML(character.name)
                            : escapeHTML(
                                character.codename ||
                                getAnomalyDesignation(character)
                            )
                    }
                </div>

                ${
                    currentType === "HUMAN" &&
                    character.callsign
                        ? `
                            <div class="details-callsign">
                                ${escapeHTML(
                                    character.callsign
                                )}
                            </div>
                        `
                        : ""
                }

            </div>

            ${
                currentType === "HUMAN"
                    ? createHumanDetails(character)
                    : createAnomalyDetails(character)
            }

        </div>

        ${
            character.image
                ? `
                    <div class="details-portrait">
                        <img
                            src="${escapeHTML(character.image)}"
                            alt="${escapeHTML(
                                character.name ||
                                character.codename ||
                                getAnomalyDesignation(character)
                            )}"
                            loading="lazy"
                        >
                    </div>
                `
                : ""
        }

        ${createDeltaGreenPanel(character)}

    </div>
`;

return details;


}

/* =========================================================
HUMAN DETAILS
========================================================= */

function createHumanDetails(character) {
return ` <div class="details-meta">


        ${createDetailsField(
            "DEPARTMENT",
            character.department
        )}

        ${createDetailsField(
            "DIVISION",
            character.division
        )}

        ${createDetailsField(
            "RANK",
            character.rank
        )}

        ${createDetailsField(
            "CLASS",
            character.class
        )}

        ${createDetailsField(
            "CLEARANCE",
            character.clearance
        )}

        ${createDetailsField(
            "LOCATION",
            character.location
        )}

        ${createDetailsField(
            "STATUS",
            character.status
        )}

    </div>

    ${
        character.status &&
        character.status !== "ACTIVE"
            ? `
                <div class="details-status">
                    STATUS // ${escapeHTML(character.status)}
                </div>
            `
            : ""
    }

    <div class="details-blurb">

        <div class="details-blurb-label">
            PERSONNEL SUMMARY
        </div>

        <p>
            ${escapeHTML(character.description)}
        </p>

    </div>
`;


}

/* =========================================================
ANOMALY DETAILS
========================================================= */

function createAnomalyDetails(character) {
return ` <div class="details-meta">


        ${createDetailsField(
            "OBJECT TYPE",
            character.object_class
        )}

        ${createDetailsField(
            "CLEARANCE LEVEL",
            character.clearance
        )}

        ${createDetailsField(
            "TYPE",
            character.anomalyType
        )}

        ${createDetailsField(
            "LOCATION",
            character.location
        )}

        ${createDetailsField(
            "CONTAINMENT%",
            `${getContainmentPercent(
                character.containment
            )}%`
        )}

        ${createDetailsField(
            "STATUS",
            character.status
        )}

    </div>

    ${
        character.status &&
        character.status !== "ACTIVE"
            ? `
                <div class="details-status">
                    STATUS // ${escapeHTML(character.status)}
                </div>
            `
            : ""
    }

    <div class="details-blurb">

        <div class="details-blurb-label">
            ANOMALOUS SUMMARY
        </div>

        <p>
            ${escapeHTML(character.blurb)}
        </p>

    </div>

    ${
        character.tags
            ? `
                <div class="details-blurb">

                    <div class="details-blurb-label">
                        TAGS
                    </div>

                    <p>
                        ${escapeHTML(character.tags)}
                    </p>

                </div>
            `
            : ""
    }
`;


}

/* =========================================================
DETAIL FIELDS
========================================================= */

function createDetailsField(label, value) {
if (
value === null ||
value === undefined ||
String(value).trim() === ""
) {
return "";
}


return `
    <div class="details-field">

        <span class="details-label">
            ${escapeHTML(label)}
        </span>

        <span class="details-value">
            ${escapeHTML(String(value))}
        </span>

    </div>
`;


}

/* =========================================================
DELTA GREEN PANEL
========================================================= */

function createDeltaGreenPanel(character) {
if (!hasDeltaGreenData(character)) {
return ` <div class="delta-green-panel no-dice-sheet">


            <div class="delta-green-no-sheet">
                <span class="delta-green-indicator"></span>
                NO APPROVED DICE SHEET
            </div>

        </div>
    `;
}

return `
    <details class="delta-green-panel">

        <summary>
            <span class="delta-green-indicator"></span>
            SHOW DICE SHEET
            <span class="delta-green-arrow">+</span>
        </summary>

        <div class="delta-green-content">

            <div class="dg-core">

                <div class="dg-stat">
                    <span class="dg-label">HP MAX</span>

                    <span class="dg-value ${getDGAttributeClass(character.dg_hp)}">
                        ${escapeHTML(
                            String(character.dg_hp || "—")
                        )}
                    </span>
                </div>

                <div class="dg-stat">
                    <span class="dg-label">WP MAX</span>

                    <span class="dg-value ${getDGAttributeClass(character.dg_wp)}">
                        ${escapeHTML(
                            String(character.dg_wp || "—")
                        )}
                    </span>
                </div>

                <div class="dg-stat">
                    <span class="dg-label">SAN MAX</span>

                    <span
                        class="dg-value"
                        style="--stat-value: ${
                            Number(character.dg_san) || 0
                        };"
                    >
                        ${escapeHTML(
                            String(character.dg_san || "—")
                        )}
                    </span>
                </div>

            </div>

            <div class="dg-attributes">

                ${createDGAttribute(
                    "STR",
                    character.dg_str
                )}

                ${createDGAttribute(
                    "CON",
                    character.dg_con
                )}

                ${createDGAttribute(
                    "DEX",
                    character.dg_dex
                )}

                ${createDGAttribute(
                    "INT",
                    character.dg_int
                )}

                ${createDGAttribute(
                    "POW",
                    character.dg_pow
                )}

                ${createDGAttribute(
                    "CHA",
                    character.dg_cha
                )}

            </div>

            <div class="dg-skills">
                ${createDeltaGreenSkills(character)}
            </div>

        </div>

    </details>
`;


}

function createDGAttribute(label, value) {
return ` <div class="dg-stat">


        <span class="dg-label">
            ${label}
        </span>

        <span class="dg-value ${getDGAttributeClass(value)}">
            ${escapeHTML(String(value || "—"))}
        </span>

    </div>
`;


}

/* =========================================================
DELTA GREEN SKILLS
========================================================= */

function createDGNormalSkill(column, label, character) {
const value =
character[`dg_${column.toLowerCase()}`];


const percentage =
    Number(value) || 0;

const skillClass =
    getDGSkillClass(percentage);

return `
    <div class="dg-skill">

        <span>
            ${escapeHTML(label)}
        </span>

        <strong class="dg-percentage ${skillClass}">
            ${escapeHTML(String(value || "0"))}%
        </strong>

    </div>
`;


}

function createDGSpecializedSkill(column, label, character) {
const value =
character[`dg_${column.toLowerCase()}`];


if (
    value === null ||
    value === undefined ||
    value === ""
) {
    return "";
}

return String(value)
    .split(";")
    .map(entry => entry.trim())
    .filter(entry => entry)
    .map(entry => {
        const separator =
            entry.lastIndexOf(":");

        if (separator === -1) {
            return "";
        }

        const specialization =
            entry.slice(0, separator).trim();

        const percentage =
            entry
                .slice(separator + 1)
                .trim()
                .replace(/%$/, "");

        if (
            !specialization ||
            !percentage
        ) {
            return "";
        }

        return `
            <div class="dg-skill">

                <span>
                    ${escapeHTML(label)}
                    (${escapeHTML(specialization)})
                </span>

                <strong class="dg-percentage ${getDGSkillClass(percentage)}">
                    ${escapeHTML(percentage)}%
                </strong>

            </div>
        `;
    })
    .join("");


}

function createDeltaGreenSkills(character) {
const allSkills = [
...DG_NORMAL_SKILLS,
...DG_SPECIALIZED_SKILLS
];


allSkills.sort((a, b) =>
    a[1].localeCompare(b[1])
);

let skills = "";

allSkills.forEach(([column, label]) => {
    if (
        DG_SPECIALIZED_SKILLS.some(
            skill => skill[0] === column
        )
    ) {
        skills += createDGSpecializedSkill(
            column,
            label,
            character
        );
    } else {
        skills += createDGNormalSkill(
            column,
            label,
            character
        );
    }
});

const skillElements =
    skills.match(
        /<div class="dg-skill">[\s\S]*?<\/div>/g
    ) || [];

const columnCount = 3;

const perColumn =
    Math.ceil(
        skillElements.length /
        columnCount
    );

let columns = "";

for (let i = 0; i < columnCount; i++) {
    const start =
        i * perColumn;

    const end =
        start + perColumn;

    columns += `
        <div class="dg-skill-column">
            ${skillElements
                .slice(start, end)
                .join("")}
        </div>
    `;
}

return columns;


}

function hasDeltaGreenData(character) {
const fields = [
"dg_hp",
"dg_wp",
"dg_san",
"dg_str",
"dg_con",
"dg_dex",
"dg_int",
"dg_pow",
"dg_cha",


    ...DG_NORMAL_SKILLS.map(
        ([column]) =>
            `dg_${column.toLowerCase()}`
    ),

    ...DG_SPECIALIZED_SKILLS.map(
        ([column]) =>
            `dg_${column.toLowerCase()}`
    )
];

return fields.some(key => {
    const value =
        character[key];

    return (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
    );
});


}

/* =========================================================
DELTA GREEN UTILITIES
========================================================= */

function getDGSkillClass(value) {
const percentage =
Number(value) || 0;


if (percentage === 0) {
    return "skill-0";
}

if (percentage < 40) {
    return "skill-low";
}

if (percentage < 60) {
    return "skill-medium";
}

if (percentage < 80) {
    return "skill-high";
}

if (percentage < 100) {
    return "skill-very-high";
}

return "skill-max";


}

function getDGAttributeClass(value) {
const attribute =
Number(value) || 0;


if (attribute === 0) {
    return "attribute-0";
}

if (attribute < 8) {
    return "attribute-low";
}

if (attribute < 12) {
    return "attribute-medium";
}

if (attribute < 16) {
    return "attribute-high";
}

if (attribute < 20) {
    return "attribute-very-high";
}

return "attribute-max";


}

/* =========================================================
ANOMALY UTILITIES
========================================================= */

function getAnomalyDesignation(character) {
const catalog =
String(character.catalog || "").trim();


const id =
    String(character.id || "").trim();

if (!catalog) {
    return id;
}

if (!id) {
    return catalog;
}

return `${catalog}-${id}`;


}

function getContainmentPercent(value) {
const percent =
parseFloat(
String(value ?? "")
.replace("%", "")
.trim()
);


if (Number.isNaN(percent)) {
    return 0;
}

return Math.max(
    0,
    Math.min(100, percent)
);


}

function getContainmentColor(value) {
const percent =
getContainmentPercent(value) / 100;


const r =
    Math.round(
        51 + (255 - 51) * percent
    );

const g =
    Math.round(
        51 + (69 - 51) * percent
    );

const b =
    Math.round(
        51 + (69 - 51) * percent
    );

return `rgb(${r}, ${g}, ${b})`;


}

/* =========================================================
HTML SAFETY
========================================================= */

function escapeHTML(value) {
if (
value === null ||
value === undefined
) {
return "";
}


return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");


}
