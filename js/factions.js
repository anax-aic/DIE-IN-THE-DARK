const FACTIONS_DATA_URL = "json/factions.json";
const FACTION_STRUCTURE_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2f5cMJbrxbmOgLn4meuKDPlmN4bTP8sN3oeQIEujQ32f9OSa9YRZqz6xVw4sk4qmoW5FZNKewVRx6/pub?gid=389952926&single=true&output=csv";
const HUMAN_ROSTER_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2f5cMJbrxbmOgLn4meuKDPlmN4bTP8sN3oeQIEujQ32f9OSa9YRZqz6xVw4sk4qmoW5FZNKewVRx6/pub?gid=0&single=true&output=csv";

const factionList = document.getElementById("faction-list");
const factionSearch = document.getElementById("faction-search");
const factionResults = document.getElementById("faction-results");
const factionEmpty = document.getElementById("faction-empty");
const factionFilters = document.querySelector(".faction-filter-group");

let factionRecords = [];
let factionGroups = [];
let factionStructureRows = [];
let humanRoster = [];
let humanRosterLoaded = false;
let activeFactionFilter = "all";

const PLAYABILITY_LABELS = {
    playable: "PLAYABLE",
    "coming-soon": "COMING SOON",
    "non-playable": "NON-PLAYABLE"
};


document.addEventListener("DOMContentLoaded", loadFactions);


async function loadFactions() {

    try {

        const [response, structureResponse, humanResponse] = await Promise.all([
            fetch(FACTIONS_DATA_URL),
            fetch(FACTION_STRUCTURE_CSV_URL).catch(error => {
                console.warn("Could not load faction structure sheet:", error);
                return null;
            }),
            fetch(HUMAN_ROSTER_CSV_URL).catch(error => {
                console.warn("Could not load human roster for unit limits:", error);
                return null;
            })
        ]);

        if (!response.ok) {
            throw new Error(`Faction data returned ${response.status}`);
        }

        const data = await response.json();
        factionRecords = Array.isArray(data.factions) ? data.factions : [];
        factionGroups = Array.isArray(data.groups) ? data.groups : [];

        if (structureResponse?.ok) {
            factionStructureRows = parseFactionStructureCSV(
                await structureResponse.text()
            );
        } else {
            factionStructureRows = [];
            console.warn("Faction structure sheet is unavailable; using local structure data.");
        }

        humanRosterLoaded = Boolean(humanResponse?.ok);
        humanRoster = humanRosterLoaded
            ? parseHumanRosterCSV(await humanResponse.text())
            : [];

        if (!humanRosterLoaded) {
            console.warn("Human roster is unavailable; unit limits will not be auto-closed.");
        }

        updateFactionCounts();
        renderFactions();

    } catch (error) {

        console.error("Could not load faction data:", error);
        factionResults.textContent = "FACTION INDEX UNAVAILABLE";
        factionEmpty.hidden = false;
        factionEmpty.querySelector("strong").textContent = "INDEX UNAVAILABLE";
        factionEmpty.querySelector("span:last-child").textContent =
            "Faction records could not be loaded.";

    }

}


function parsePublishedCSVRows(csv) {

    const rows = [];
    let row = [];
    let field = "";
    let insideQuotes = false;

    for (let index = 0; index < csv.length; index++) {
        const character = csv[index];
        const nextCharacter = csv[index + 1];

        if (character === '"' && insideQuotes && nextCharacter === '"') {
            field += '"';
            index++;
            continue;
        }

        if (character === '"') {
            insideQuotes = !insideQuotes;
            continue;
        }

        if (character === "," && !insideQuotes) {
            row.push(field);
            field = "";
            continue;
        }

        if ((character === "\n" || character === "\r") && !insideQuotes) {
            if (character === "\r" && nextCharacter === "\n") index++;
            row.push(field);
            if (row.some(value => value.trim() !== "")) rows.push(row);
            row = [];
            field = "";
            continue;
        }

        field += character;
    }

    if (field !== "" || row.length) {
        row.push(field);
        if (row.some(value => value.trim() !== "")) rows.push(row);
    }

    if (!rows.length) return [];

    const headers = rows.shift().map(header =>
        header.replace(/^\uFEFF/, "").trim().toLowerCase()
    );

    return rows.map(values => {
        const record = {};

        headers.forEach((header, columnIndex) => {
            record[header] = String(values[columnIndex] ?? "").trim();
        });

        return record;
    });

}


function parseFactionStructureCSV(csv) {

    return parsePublishedCSVRows(csv)
        .map(record => ({
            id: record.id || "",
            faction: record.faction || "",
            parent: record.parent || "",
            unitType: record.unittype || "",
            name: record.name || "",
            description: record.description || "",
            availability: record.availability || "",
            requirements: record.requirements || "",
            logoUrl: record.logourl || "",
            limit: record.limit || ""
        }))
        .filter(record => record.id && record.faction && record.name);

}


function parseHumanRosterCSV(csv) {

    return parsePublishedCSVRows(csv)
        .filter(record => record.name)
        .map(record => ({
            id: record.id || "",
            faction: record.faction || "",
            department: record.department || "",
            division: record.division || "",
            rank: record.rank || "",
            status: record.status || "",
            playerId: record.player_id || ""
        }));

}


function escapeFactionText(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function displayValue(value) {

    if (Array.isArray(value)) {
        return value.length
            ? value.map(item => escapeFactionText(item)).join(", ")
            : "Not set";
    }

    const text = String(value ?? "").trim();

    return text
        ? escapeFactionText(text)
        : "Not set";

}


function availabilityLabel(value) {

    const labels = {
        open: "OPEN",
        closed: "CLOSED",
        "not-set": "NOT SET",
        "not-applicable": "NOT APPLICABLE"
    };

    const normalized = String(value ?? "").trim().toLowerCase();

    return labels[normalized] || (normalized ? normalized.toUpperCase() : "NOT SET");

}


function availabilityClass(value) {

    const normalized = String(value ?? "").trim().toLowerCase();

    if (normalized === "open") return "is-open";
    if (normalized === "closed") return "is-closed";
    if (normalized === "promotion") return "is-promotion";
    if (normalized && !["not-set", "not-applicable"].includes(normalized)) {
        return "is-defined";
    }

    return "is-unspecified";

}


function hasFactionValue(value) {

    if (Array.isArray(value)) {
        return value.some(item => String(item ?? "").trim() !== "");
    }

    return value !== null &&
        value !== undefined &&
        String(value).trim() !== "";

}


function renderAccessRows(fields, emptyMessage) {

    const populatedFields =
        fields.filter(field => hasFactionValue(field.value));

    if (!populatedFields.length) {
        return `<p class="faction-access-pending">${escapeFactionText(emptyMessage)}</p>`;
    }

    return `
        <dl class="faction-access-list">
            ${populatedFields.map(field => `
                <div>
                    <dt>${escapeFactionText(field.label)}</dt>
                    <dd>${field.availability
                        ? `<span class="availability-state ${availabilityClass(field.availability)}">${escapeFactionText(field.value)}</span>`
                        : displayValue(field.value)
                    }</dd>
                </div>
            `).join("")}
        </dl>
    `;

}


function updateFactionCounts() {

    const countFor = playability =>
        factionRecords.filter(record => record.playability === playability).length;

    document.getElementById("count-playable").textContent =
        String(countFor("playable")).padStart(2, "0");

    document.getElementById("count-coming-soon").textContent =
        String(countFor("coming-soon")).padStart(2, "0");

    document.getElementById("count-non-playable").textContent =
        String(countFor("non-playable")).padStart(2, "0");

}


function renderFactions() {

    const query = factionSearch.value.trim().toLowerCase();

    const matches = factionRecords.filter(record => {
        const matchesFilter =
            activeFactionFilter === "all" ||
            record.playability === activeFactionFilter;

        const matchesQuery =
            !query ||
            JSON.stringify(record).toLowerCase().includes(query);

        return matchesFilter && matchesQuery;
    });

    const assignedFactionIds = new Set();
    let factionIndex = 0;

    const groupMarkup = factionGroups.map(group => {
        const groupOrder = Array.isArray(group.factionIds)
            ? group.factionIds
            : [];

        const orderedRecords = groupOrder
            .map(id => matches.find(record => record.id === id))
            .filter(Boolean);

        const orderedIds = new Set(orderedRecords.map(record => record.id));
        const additionalRecords = matches.filter(record =>
            record.directoryGroup === group.id &&
            !orderedIds.has(record.id)
        );

        const groupRecords = [...orderedRecords, ...additionalRecords];

        groupRecords.forEach(record => assignedFactionIds.add(record.id));

        if (
            !groupRecords.length &&
            !(group.showWhenEmpty && activeFactionFilter === "all" && !query)
        ) {
            return "";
        }

        const markup = renderFactionGroup(group, groupRecords, factionIndex);
        factionIndex += groupRecords.length;
        return markup;
    }).join("");

    const unassignedRecords = matches.filter(record =>
        !assignedFactionIds.has(record.id)
    );

    const unassignedMarkup = unassignedRecords.length
        ? renderFactionGroup(
            {
                id: "unassigned",
                name: "UNASSIGNED",
                description: "These faction records do not yet have a directory group."
            },
            unassignedRecords,
            factionIndex
        )
        : "";

    factionList.innerHTML = groupMarkup + unassignedMarkup;

    factionEmpty.hidden = matches.length > 0;
    factionResults.textContent =
        `${String(matches.length).padStart(2, "0")} RECORDS // ${PLAYABILITY_LABELS[activeFactionFilter] || "ALL FACTIONS"}`;

}


function renderFactionGroup(group, records, startingIndex) {

    return `
        <section class="faction-directory-group faction-directory-group--${escapeFactionText(group.id)}">
            <header class="faction-group-heading">
                <div class="faction-group-heading-copy">
                    <span class="faction-group-marker" aria-hidden="true"></span>
                    <h2>${escapeFactionText(group.name)}</h2>
                    ${group.description ? `<p>${escapeFactionText(group.description)}</p>` : ""}
                </div>
                <span class="faction-group-count">${String(records.length).padStart(2, "0")}</span>
            </header>
            <div class="faction-group-records">
                ${records.length
                    ? records.map((record, index) => renderFaction(record, startingIndex + index)).join("")
                    : `<p class="faction-group-empty">${escapeFactionText(group.emptyMessage || "No records yet.")}</p>`
                }
            </div>
        </section>
    `;

}


function renderFactionIcon(source) {
    const escapedSource = escapeFactionText(source);
    const maskSource = new URL(source, document.baseURI).href;
    const maskImage = escapeFactionText(`url(${JSON.stringify(maskSource)})`);
    return `<img class="faction-icon-base" src="${escapedSource}" alt="" loading="lazy"><span class="faction-icon-tint" style="--faction-icon-mask: ${maskImage}" aria-hidden="true"></span>`;
}


function renderFaction(record, index) {

    const logo = record.logo
        ? renderFactionIcon(record.logo)
        : `<span class="faction-monogram">${escapeFactionText(record.mark || record.name.slice(0, 2))}</span>`;
    const briefingText = String(record.lore || record.summary || "").trim();
    const briefing = briefingText && briefingText.toLowerCase() !== "placeholder"
        ? `<section class="faction-briefing">
                <div class="faction-section-label">FIELD BRIEFING</div>
                <p>${escapeFactionText(briefingText)}</p>
            </section>`
        : "";

    return `
        <article class="faction-record faction-record--${escapeFactionText(record.id)}" data-playability="${escapeFactionText(record.playability)}">
            <details class="faction-disclosure">
                <summary class="faction-summary">
                    <span class="faction-mark" aria-hidden="true">${logo}</span>
                    <span class="faction-summary-copy">
                        <span class="faction-summary-meta">
                            <span class="faction-index">${String(index + 1).padStart(2, "0")}</span>
                            <span>${escapeFactionText(record.classification || "FACTION")}</span>
                        </span>
                        <span class="faction-summary-title">
                            <span class="faction-name">${escapeFactionText(record.name)}</span>
                            <span class="faction-status faction-status--${escapeFactionText(record.playability)}">${PLAYABILITY_LABELS[record.playability] || "STATUS NOT SET"}</span>
                        </span>
                        <span class="faction-summary-text">${escapeFactionText(record.summary)}</span>
                    </span>
                    <span class="faction-toggle" aria-hidden="true"></span>
                </summary>

                <div class="faction-detail">
                    <div class="faction-detail-overview">
                        ${[briefing, ...renderFactionInfo(record)].filter(Boolean).join(renderSectionDivider(record))}
                    </div>
                    ${renderSectionDivider(record)}
                    ${renderFactionStructure(record)}
                </div>
            </details>
        </article>
    `;

}


function renderInfoContent(section) {

    const paragraphs = String(section.body || "")
        .split(/\n{2,}/)
        .filter(text => text.trim())
        .map(text => `<p>${escapeFactionText(text)}</p>`)
        .join("");

    const items = Array.isArray(section.items) && section.items.length
        ? `<dl class="faction-info-list${section.layout === "stack" ? " faction-info-list--stack" : ""}${section.layout === "grid" ? " faction-info-list--grid" : ""}">${section.items.map(item => `
            <div class="faction-info-item${item.tone ? ` faction-info-item--${escapeFactionText(item.tone)}` : ""}${item.icon ? " faction-info-item--icon" : ""}">
                ${item.icon ? `<span class="faction-info-icon" aria-hidden="true" style="--info-icon: ${escapeFactionText(`url(${JSON.stringify(new URL(item.icon, document.baseURI).href)})`)}"></span>` : ""}
                ${item.badge ? `<span class="faction-info-badge" aria-hidden="true">${escapeFactionText(item.badge)}</span>` : ""}
                <dt>${escapeFactionText(item.term)}</dt>
                <dd>${escapeFactionText(item.text || "NOT YET RECORDED")}</dd>
            </div>`).join("")}</dl>`
        : "";

    return paragraphs + items ||
        `<p class="faction-access-pending">NOT YET RECORDED</p>`;

}


function renderSectionDivider(record) {

    const style = record.id !== "foundation" && record.logo
        ? ` style="--divider-logo: ${escapeFactionText(`url(${JSON.stringify(new URL(record.logo, document.baseURI).href)})`)}"`
        : "";

    return `
        <div class="section-divider" aria-hidden="true"${style}>
            <span class="divider-line"></span>
            <span class="divider-logo"></span>
            <span class="divider-line"></span>
        </div>
    `;

}


function renderFactionInfo(record) {

    if (!Array.isArray(record.info)) {
        return [];
    }

    return record.info.map(section => {
        const content = Array.isArray(section.columns)
            ? `<div class="faction-info-columns">${section.columns.map(column => `
                <div class="faction-info-column">
                    <h4 class="faction-info-subtitle">${escapeFactionText(column.title)}</h4>
                    ${renderInfoContent(column)}
                </div>`).join("")}</div>`
            : renderInfoContent(section);

        return `
            <section class="faction-info">
                <div class="faction-section-label">${escapeFactionText(String(section.title).toUpperCase())}</div>
                ${content}
            </section>
        `;
    });

}


function renderFactionStructure(record) {

    const structureRows = factionStructureRows.filter(unit =>
        normalizeStructureReference(unit.faction) === normalizeStructureReference(record.id) ||
        normalizeStructureReference(unit.faction) === normalizeStructureReference(record.name)
    );

    const rootStructure =
        renderRootOrganizationUnits(record, structureRows);


    if (record.offices) {
        return `${renderOffices(record.offices, structureRows)}${rootStructure}`;
    }

    if (record.cells) return `${renderCells(record.cells)}${rootStructure}`;
    if (record.departments || record.ranks) {
        return `${renderDepartmentsAndRanks(record)}${rootStructure}`;
    }

    if (rootStructure) return rootStructure;

    return `
        <section class="faction-structure faction-structure--pending">
            <div class="faction-section-label">ORGANIZATIONAL DETAILS</div>
            <p>Structure and role details are still in development.</p>
        </section>
    `;

}


function normalizeStructureReference(value) {

    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

}


function rosterFieldForUnit(unitType) {

    const type = normalizeStructureReference(unitType);

    if (["office", "department", "cell"].includes(type)) {
        return "department";
    }

    if (["division", "task-force", "taskforce"].includes(type)) {
        return "division";
    }

    if (type === "rank") {
        return "rank";
    }

    return "";

}


function getUnitCapacity(unit) {

    const limitText =
        String(unit.limit ?? "").trim();

    const limit = Number(limitText);

    if (!limitText || !Number.isFinite(limit) || limit <= 0) {
        return null;
    }


    const rosterField =
        rosterFieldForUnit(unit.unitType);

    if (!humanRosterLoaded || !rosterField) {
        return { limit, count: null, isFull: false };
    }


    const factionKey =
        normalizeStructureReference(unit.faction);

    const unitKey =
        normalizeStructureReference(unit.name);

    const count =
        humanRoster.filter(person =>
            String(person.status ?? "").trim().toUpperCase() === "ACTIVE" &&
            String(person.playerId ?? "").trim() !== "" &&
            normalizeStructureReference(person.faction) === factionKey &&
            normalizeStructureReference(person[rosterField]) === unitKey
        ).length;


    return {
        limit,
        count,
        isFull: count >= limit
    };

}


function renderOrganizationUnits(parentReferences, units, ancestors = new Set()) {

    const parentKeys = new Set(
        parentReferences
            .map(normalizeStructureReference)
            .filter(Boolean)
    );

    const children = units.filter(unit =>
        parentKeys.has(normalizeStructureReference(unit.parent))
    );

    return children
        .map(unit => renderOrganizationUnit(unit, units, ancestors))
        .join("");

}


function renderRequirementsChecklist(value) {

    const requirements = (Array.isArray(value) ? value : String(value ?? "").split(/[,;]/))
        .map(requirement => String(requirement ?? "").trim())
        .filter(Boolean);

    if (!requirements.length) return "";

    return `
        <div class="faction-sheet-requirements">
            <div class="faction-sheet-requirements-label">REQUIREMENTS</div>
            <ul>
                ${requirements.map(requirement => `
                    <li>
                        <div class="faction-requirement-row">
                            <span class="faction-requirement-box" aria-hidden="true"></span>
                            <span>${escapeFactionText(requirement)}</span>
                        </div>
                    </li>
                `).join("")}
            </ul>
        </div>
    `;

}


function renderOrganizationUnit(unit, units, ancestors = new Set()) {

    const unitKey = normalizeStructureReference(unit.id || unit.name);

    if (!unitKey || ancestors.has(unitKey)) return "";

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(unitKey);

    const children = renderOrganizationUnits(
        [unit.id, unit.name],
        units,
        nextAncestors
    );

    const logoUrl = String(unit.logoUrl ?? "").trim();
    const hasLogo = /^https:\/\//i.test(logoUrl) || /^images\//i.test(logoUrl);
    const unitType = String(unit.unitType ?? "").trim();
    const availability = String(unit.availability ?? "").trim();
    const capacity = getUnitCapacity(unit);
    const isFull = Boolean(capacity?.isFull);
    const effectiveAvailability = isFull ? "closed" : availability;
    const hasAvailability =
        isFull ||
        availability !== "" &&
        !["not-set", "not-applicable"].includes(availability.toLowerCase());
    const capacityMarkup = capacity
        ? `<div class="faction-sheet-capacity">${capacity.count === null
            ? `CAPACITY ${capacity.limit} // ROSTER COUNT UNAVAILABLE`
            : `ACTIVE PLAYERS ${capacity.count} / ${capacity.limit}`
        }</div>`
        : "";
    const hasDescription = hasFactionValue(unit.description);
    const hasRequirements = hasFactionValue(unit.requirements);
    const requirementMarkup = hasRequirements
        ? renderRequirementsChecklist(unit.requirements)
        : "";
    const emptyDetails = !hasDescription && !hasRequirements && !children
        ? `<p class="faction-access-pending">UNIT DETAILS NOT RECORDED</p>`
        : "";

    return `
        <details class="faction-sheet-unit">
            <summary>
                <span class="faction-sheet-unit-mark" aria-hidden="true">
                    ${hasLogo ? renderFactionIcon(logoUrl) : `<span class="faction-sheet-unit-placeholder"></span>`}
                </span>
                <span class="faction-sheet-unit-copy">
                    <span class="faction-sheet-unit-type">${escapeFactionText(unitType || "ORGANIZATIONAL UNIT")}</span>
                    <span class="faction-sheet-unit-title">
                        <strong>${escapeFactionText(unit.name)}</strong>
                        ${hasAvailability ? `<span class="availability-state ${availabilityClass(effectiveAvailability)}">${escapeFactionText(availabilityLabel(effectiveAvailability))}</span>` : ""}
                    </span>
                </span>
                <span class="faction-unit-toggle" aria-hidden="true"></span>
            </summary>
            <div class="faction-sheet-unit-details">
                ${hasDescription ? `<p class="faction-sheet-unit-description">${escapeFactionText(unit.description)}</p>` : ""}
                ${requirementMarkup}
                ${capacityMarkup}
                ${children}
                ${emptyDetails}
            </div>
        </details>
    `;

}


function renderRootOrganizationUnits(record, units) {

    const factionReferences = [record.id, record.name]
        .map(normalizeStructureReference)
        .filter(Boolean);

    const rootUnits = units.filter(unit => {
        const parent = normalizeStructureReference(unit.parent);
        return !parent || factionReferences.includes(parent);
    });

    if (!rootUnits.length) return "";

    return `
        <section class="faction-structure faction-sheet-structure">
            <div class="faction-structure-heading">
                <div>
                    <div class="faction-section-label">ORGANIZATIONAL STRUCTURE</div>
                    <h3>Published unit directory</h3>
                </div>
                <span class="faction-structure-count">${String(rootUnits.length).padStart(2, "0")}</span>
            </div>
            <div class="faction-sheet-units">
                ${rootUnits.map(unit => renderOrganizationUnit(unit, units)).join("")}
            </div>
        </section>
    `;

}


function renderOffices(offices, structureRows = []) {

    return `
        <section class="faction-structure faction-office-structure">
            <div class="faction-structure-heading">
                <div>
                    <div class="faction-section-label">OFFICE DIRECTORY</div>
                </div>
                <span class="faction-structure-count">${String(offices.length).padStart(2, "0")}</span>
            </div>

            <div class="faction-unit-list">
                ${offices.map((office, index) => renderOffice(office, index, structureRows)).join("")}
            </div>
        </section>
    `;

}


function renderOrganizationEntry({ index, name, logo = "", availability = "not-set", details, emptyMessage }) {

    const number = String(index + 1).padStart(2, "0");
    const detailsMarkup = String(details ?? "").trim() ||
        `<p class="faction-access-pending">${escapeFactionText(emptyMessage)}</p>`;
    const availabilityMarkup = availability !== "not-set"
        ? `<span class="availability-state ${availabilityClass(availability)}">${availabilityLabel(availability)}</span>`
        : "";

    return `
        <details class="faction-unit">
            <summary>
                <span class="faction-unit-index">${number}</span>
                <span class="faction-unit-mark" aria-hidden="true">${logo}</span>
                <span class="faction-unit-name">${escapeFactionText(name)}</span>
                ${availabilityMarkup}
                <span class="faction-unit-toggle" aria-hidden="true"></span>
            </summary>
            <div class="faction-unit-details">
                ${detailsMarkup}
            </div>
        </details>
    `;

}


function renderOffice(office, index, structureRows = []) {

    const logo = office.logo
        ? renderFactionIcon(office.logo)
        : "";

    const divisions = Array.isArray(office.divisions) && office.divisions.length
        ? office.divisions.map(division => division.name || division).join(", ")
        : office.divisionNote === "Sub-division details are not documented."
            ? ""
            : office.divisionNote || "";

    const ranks = Array.isArray(office.ranks) && office.ranks.length
        ? office.ranks.map(rank => rank.name || rank).join(" / ")
        : "";

    const officeFields = [
        { label: "Discord role", value: office.discordRole },
        { label: "Entry requirements", value: office.joinRequirements },
        { label: "Promotion requirements", value: office.promotionRequirements },
        { label: "Divisions", value: divisions }
    ];

    const availability = office.availability || "not-set";
    const officeReferences = new Set(
        [office.id, office.name]
            .map(normalizeStructureReference)
            .filter(Boolean)
    );
    const officeStructureRows = structureRows.filter(unit =>
        officeReferences.has(normalizeStructureReference(unit.parent))
    );
    const rankRows = officeStructureRows.filter(unit =>
        normalizeStructureReference(unit.unitType) === "rank"
    );
    const otherRows = officeStructureRows.filter(unit =>
        normalizeStructureReference(unit.unitType) !== "rank"
    );
    const renderOfficeUnits = units => units
        .map(unit => renderOrganizationUnit(unit, structureRows))
        .join("");
    const rankAccess = hasFactionValue(ranks)
        ? renderAccessRows([{ label: "Ranks", value: ranks }], "RANKS NOT RECORDED")
        : "";
    const officeDetails = officeFields.some(field => hasFactionValue(field.value))
        ? renderAccessRows(officeFields, "OFFICE DETAILS NOT RECORDED")
        : "";
    const rankUnits = renderOfficeUnits(rankRows);
    const otherUnits = renderOfficeUnits(otherRows);
    const officeDescription = hasFactionValue(office.description)
        ? `<p class="faction-unit-description">${escapeFactionText(office.description)}</p>`
        : "";
    const rankContent = [
        rankAccess,
        rankUnits ? `<div class="faction-office-units">${rankUnits}</div>` : ""
    ].filter(Boolean).join("") || `<p class="faction-access-pending">RANKS NOT RECORDED</p>`;
    const otherContent = [
        officeDetails,
        otherUnits ? `<div class="faction-office-units">${otherUnits}</div>` : ""
    ].filter(Boolean).join("") || `<p class="faction-access-pending">OFFICE DETAILS NOT RECORDED</p>`;

    return renderOrganizationEntry({
        index,
        name: office.name,
        logo,
        availability,
        details: `${officeDescription}<div class="faction-office-columns"><section class="faction-office-column"><div class="faction-section-label">RANKS</div>${rankContent}</section><section class="faction-office-column"><div class="faction-section-label">DIVISIONS &amp; UNITS</div>${otherContent}</section></div>`,
        emptyMessage: "OFFICE DETAILS NOT RECORDED"
    });

}


function renderCells(cellStructure) {

    const playable = new Set(cellStructure.playable || []);
    const nonPlayable = new Set(cellStructure.nonPlayable || []);
    const leadership = cellStructure.leadership;
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

    const cells = letters.map(letter => {
        const isPlayable = playable.has(letter);
        const isLeadership = letter === leadership;
        const status = isLeadership
            ? "LEADERSHIP // NON-PLAYABLE"
            : isPlayable
                ? "PLAYABLE"
                : nonPlayable.has(letter)
                    ? "NON-PLAYABLE"
                    : "STATUS NOT SET";

        return `
            <span class="insurgency-cell ${isPlayable ? "is-playable" : "is-unplayable"} ${isLeadership ? "is-leadership" : ""}"
                  title="${escapeFactionText(`${letter}-CELL // ${status}`)}">
                <span>${letter}</span>
            </span>
        `;
    }).join("");

    const regions = (cellStructure.regions || []).map((region, index) => `
        <div class="insurgency-region">
            <span class="faction-unit-index">${String(index + 1).padStart(2, "0")}</span>
            <strong>${escapeFactionText(region.name || `REGION ${String(index + 1).padStart(2, "0")}`)}</strong>
            <span>${region.cells?.length ? `${region.cells.length} CELLS ASSIGNED` : "CELL ASSIGNMENTS NOT SET"}</span>
        </div>
    `).join("");

    return `
        <section class="faction-structure">
            <div class="faction-structure-heading">
                <div>
                    <div class="faction-section-label">CELL NETWORK</div>
                </div>
                <span class="faction-structure-count">26</span>
            </div>

            <div class="insurgency-cells" aria-label="Insurgency cells A through Z">${cells}</div>

            <div class="insurgency-legend">
                <span><i class="is-playable"></i> PLAYABLE</span>
                <span><i class="is-unplayable"></i> NOT PLAYABLE</span>
                <span>A-CELL // LEADERSHIP</span>
            </div>

            <div class="faction-section-label faction-regions-label">FOUR U.S. REGIONS</div>
            <div class="insurgency-regions">${regions}</div>
            <p class="faction-structure-note">Task forces and Discord cell roles: ${displayValue(cellStructure.taskForces)}</p>
        </section>
    `;

}


function renderDepartmentsAndRanks(record) {

    const departments = record.departments || [];
    const ranks = record.ranks || [];
    const departmentLabel = record.departmentLabel || "DEPARTMENTS";
    const renderDepartment = (department, index) => {
        const number = String(index + 1).padStart(2, "0");
        const name = hasFactionValue(department.name)
            ? department.name
            : `DEPARTMENT ${number}`;
        const description = hasFactionValue(department.description)
            ? `<p class="faction-unit-description">${escapeFactionText(department.description)}</p>`
            : "";
        const units = Array.isArray(department.units) ? department.units : [];
        const unitsMarkup = units.length
            ? `<div class="faction-department-subunits">
                ${units.map(unit => `
                    <div class="faction-department-subunit">
                        <strong>${escapeFactionText(unit.name)}</strong>
                        ${hasFactionValue(unit.description) ? `<p>${escapeFactionText(unit.description)}</p>` : ""}
                    </div>
                `).join("")}
            </div>`
            : "";
        const ranks = Array.isArray(department.ranks)
            ? department.ranks.map(rank => rank.name || rank).join(" / ")
            : "";
        const divisions = Array.isArray(department.divisions)
            ? department.divisions.map(division => division.name || division).join(", ")
            : department.divisionNote === "Sub-division details are not documented."
                ? ""
                : department.divisionNote || "";
        const fields = [
            { label: "Discord role", value: department.discordRole },
            { label: "Entry requirements", value: department.joinRequirements },
            { label: "Promotion requirements", value: department.promotionRequirements },
            { label: "Ranks", value: ranks },
            { label: "Divisions", value: divisions }
        ];
        const accessDetails = fields.some(field => hasFactionValue(field.value))
            ? renderAccessRows(fields, "DEPARTMENT DETAILS NOT RECORDED")
            : "";
        const logo = department.logo
            ? renderFactionIcon(department.logo)
            : "";

        return renderOrganizationEntry({
            index,
            name,
            logo,
            availability: department.availability || "not-set",
            details: `${description}${accessDetails}${unitsMarkup}`,
            emptyMessage: "DEPARTMENT DETAILS NOT RECORDED"
        });
    };

    return `
        <section class="faction-structure">
            ${departments.length ? `
                <div class="faction-structure-heading faction-structure-heading--departments">
                    <div>
                        <div class="faction-section-label">${escapeFactionText(departmentLabel)}</div>
                    </div>
                    <span class="faction-structure-count">${String(departments.length).padStart(2, "0")}</span>
                </div>
                <div class="faction-unit-list faction-department-list">
                    ${departments.map(renderDepartment).join("")}
                </div>
            ` : ""}

            ${ranks.length ? `
                <div class="faction-structure-heading faction-rank-heading">
                    <div>
                        <div class="faction-section-label">RANK LADDER</div>
                        <h3>Highest to entry rank</h3>
                    </div>
                    <span class="faction-structure-count">${String(ranks.length).padStart(2, "0")}</span>
                </div>
                <ol class="faction-rank-list">
                    ${ranks.map((rank, index) => `
                        ${(() => {
                            const fields = [
                                { label: "Discord role", value: rank.discordRole },
                                { label: "Entry requirements", value: rank.joinRequirements },
                                { label: "Promotion requirements", value: rank.promotionRequirements }
                            ];
                            const availability = rank.availability || "not-set";

                            return `
                        <li class="faction-rank-row">
                            <span class="faction-unit-index">${String(index + 1).padStart(2, "0")}</span>
                            <details>
                                <summary>
                                    <span>${escapeFactionText(rank.name)}</span>
                                            ${availability !== "not-set" ? `<span class="availability-state ${availabilityClass(availability)}">${availabilityLabel(availability)}</span>` : ""}
                                    <span class="faction-unit-toggle" aria-hidden="true"></span>
                                </summary>
                                        ${renderAccessRows(fields, "RANK DETAILS NOT RECORDED")}
                            </details>
                        </li>
                            `;
                        })()}
                    `).join("")}
                </ol>
            ` : ""}
        </section>
    `;

}


factionSearch.addEventListener("input", renderFactions);

factionFilters.addEventListener("click", event => {

    const button = event.target.closest("button[data-filter]");

    if (!button) return;

    activeFactionFilter = button.dataset.filter;

    factionFilters.querySelectorAll("button[data-filter]").forEach(filterButton => {
        const isActive = filterButton === button;
        filterButton.classList.toggle("is-active", isActive);
        filterButton.setAttribute("aria-pressed", String(isActive));
    });

    renderFactions();

});


factionList.addEventListener("click", event => {

    const summary =
        event.target.closest(".faction-disclosure > summary");

    if (!summary) return;


    const selectedFaction =
        summary.parentElement;

    if (selectedFaction.open) return;


    factionList
        .querySelectorAll(".faction-disclosure[open]")
        .forEach(openFaction => {
            if (openFaction !== selectedFaction) {
                openFaction.open = false;
            }
        });

});