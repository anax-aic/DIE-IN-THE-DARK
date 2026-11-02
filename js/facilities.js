
/* =========================================================
   FACILITIES DATABASE
   ========================================================= */

const FACILITIES_SHEET_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2f5cMJbrxbmOgLn4meuKDPlmN4bTP8sN3oeQIEujQ32f9OSa9YRZqz6xVw4sk4qmoW5FZNKewVRx6/pub?gid=1547547586&single=true&output=csv";


const HUMANS_SHEET_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2f5cMJbrxbmOgLn4meuKDPlmN4bTP8sN3oeQIEujQ32f9OSa9YRZqz6xVw4sk4qmoW5FZNKewVRx6/pub?gid=0&single=true&output=csv";


const ANOMALIES_SHEET_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2f5cMJbrxbmOgLn4meuKDPlmN4bTP8sN3oeQIEujQ32f9OSa9YRZqz6xVw4sk4qmoW5FZNKewVRx6/pub?gid=1214065682&single=true&output=csv";


const INCIDENTS_SHEET_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2f5cMJbrxbmOgLn4meuKDPlmN4bTP8sN3oeQIEujQ32f9OSa9YRZqz6xVw4sk4qmoW5FZNKewVRx6/pub?gid=204665168&single=true&output=csv";


const WORLD_DATA_URL =
    "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";


const US_STATES_DATA_URL =
    "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";


const WEATHER_API_URL =
    "https://api.open-meteo.com/v1/forecast";


const FACTIONS_DATA_URL =
    "json/factions.json";


const INVENTORY_SHEET_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2f5cMJbrxbmOgLn4meuKDPlmN4bTP8sN3oeQIEujQ32f9OSa9YRZqz6xVw4sk4qmoW5FZNKewVRx6/pub?gid=849418287&single=true&output=csv";


const ITEMS_SHEET_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2f5cMJbrxbmOgLn4meuKDPlmN4bTP8sN3oeQIEujQ32f9OSa9YRZqz6xVw4sk4qmoW5FZNKewVRx6/pub?gid=1957733727&single=true&output=csv";


let facilities = [];
let humans = [];
let anomalies = [];
let incidents = [];
let inventoryRecords = [];
let itemRecords = [];
let factionRecords = [];

let selectedFacility = null;
let worldData = null;
let usStatesData = null;
let weatherRequestId = 0;


/* =========================================================
   MAP
   ========================================================= */

const svg =
    d3.select("#world-map");


const MAP_WIDTH = 2000;
const MAP_HEIGHT = 1000;


/*
 * Natural Earth projection.
 */

const projection =
    d3.geoNaturalEarth1()
        .fitSize(
            [MAP_WIDTH, MAP_HEIGHT],
            {
                type: "Sphere"
            }
        );


const path =
    d3.geoPath(
        projection
    );


/* =========================================================
   MAP CONTENT
   ========================================================= */

let mapContent = null;


function setupMapContent() {

    if (mapContent) {
        return;
    }


    mapContent =
        svg
            .append("g")
            .attr(
                "id",
                "map-content"
            );


    const mapElements = [

        ".sphere",
        ".graticule",
        "#countries",
        "#state-borders",
        "#borders",
        "#facility-markers"

    ];


    mapElements.forEach(
        selector => {

            const element =
                svg.select(
                    selector
                );


            if (
                !element.empty()
            ) {

                mapContent
                    .node()
                    .appendChild(
                        element.node()
                    );

            }

        }
    );

}


/* =========================================================
   MAP NAVIGATION
   ========================================================= */

let currentMapTransform =
    d3.zoomIdentity;


function setupMapNavigation() {

    setupMapContent();


    const mapZoom =
        d3.zoom()
            .scaleExtent([
                1,
                8
            ])
            .translateExtent([
                [0, 0],
                [
                    MAP_WIDTH,
                    MAP_HEIGHT
                ]
            ])
            .on(
                "zoom",
                event => {

                    currentMapTransform =
                        event.transform;


                    mapContent.attr(
                        "transform",
                        event.transform
                    );


                    updateMarkerScale();

                }
            );


    svg.call(
        mapZoom
    );


    svg.on(
        "dblclick.zoom",
        null
    );


    svg.call(
        mapZoom.transform,
        d3.zoomIdentity
    );

}


/* =========================================================
   COUNTER-SCALE FACILITY MARKERS
   ========================================================= */

function updateMarkerScale() {

    const scale =
        currentMapTransform.k;


    document
        .querySelectorAll(
            ".facility-marker"
        )
        .forEach(
            marker => {

                const x =
                    marker.dataset.x;


                const y =
                    marker.dataset.y;


                if (
                    x === undefined ||
                    y === undefined
                ) {

                    return;

                }


                marker.setAttribute(
                    "transform",
                    `translate(${x}, ${y}) scale(${1 / scale})`
                );

            }
        );

}


/* =========================================================
   LOADER
   ========================================================= */

const loaderMessages = [

    "> ESTABLISHING SCIPNET CONNECTION...",
    "> AUTHENTICATING ARCHIVAL NODE...",
    "> ACCESSING FACILITY NETWORK...",
    "> RETRIEVING FACILITY RECORDS...",
    "> VERIFYING LOCATION DATA...",
    "> CROSS-REFERENCING SITE RECORDS...",
    "> SYNCHRONIZING FACILITY INDEX..."

];


let loaderInterval = null;
let loaderMessageIndex = 0;


function startLoader() {

    const loader =
        document.getElementById(
            "map-loader"
        );


    const message =
        document.getElementById(
            "loader-message"
        );


    if (
        !loader ||
        !message
    ) {

        return;

    }


    loader.style.display =
        "flex";


    loaderMessageIndex =
        0;


    message.textContent =
        loaderMessages[
            loaderMessageIndex
        ];


    if (loaderInterval) {

        clearInterval(
            loaderInterval
        );

    }


    loaderInterval =
        setInterval(
            () => {

                loaderMessageIndex =
                    (
                        loaderMessageIndex + 1
                    )
                    % loaderMessages.length;


                message.textContent =
                    loaderMessages[
                        loaderMessageIndex
                    ];

            },
            700
        );

}


function stopLoader() {

    const loader =
        document.getElementById(
            "map-loader"
        );


    if (loaderInterval) {

        clearInterval(
            loaderInterval
        );


        loaderInterval =
            null;

    }


    if (loader) {

        loader.style.display =
            "none";

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


    for (
        let i = 0;
        i < csv.length;
        i++
    ) {

        const char =
            csv[i];


        const next =
            csv[i + 1];


        if (
            char === '"' &&
            insideQuotes &&
            next === '"'
        ) {

            value += '"';

            i++;

            continue;

        }


        if (
            char === '"'
        ) {

            insideQuotes =
                !insideQuotes;

            continue;

        }


        if (
            char === "," &&
            !insideQuotes
        ) {

            row.push(
                value
            );


            value =
                "";


            continue;

        }


        if (
            (
                char === "\n" ||
                char === "\r"
            ) &&
            !insideQuotes
        ) {

            if (
                char === "\r" &&
                next === "\n"
            ) {

                i++;

            }


            row.push(
                value
            );


            rows.push(
                row
            );


            row = [];


            value =
                "";


            continue;

        }


        value +=
            char;

    }


    if (
        value !== "" ||
        row.length > 0
    ) {

        row.push(
            value
        );


        rows.push(
            row
        );

    }


    return rows;

}


/* =========================================================
   CSV TO OBJECTS
   ========================================================= */

function csvToObjects(csv) {

    const rows =
        parseCSV(
            csv
        );


    if (
        rows.length < 2
    ) {

        return [];

    }


    const headers =
        rows[0].map(
            header =>
                header
                    .trim()
                    .toLowerCase()
        );


    return rows
        .slice(1)
        .map(
            row => {

                const record =
                    {};


                headers.forEach(
                    (
                        header,
                        index
                    ) => {

                        record[header] =
                            (
                                row[index] ||
                                ""
                            ).trim();

                    }
                );


                return record;

            }
        );

}


/* =========================================================
   HTML ESCAPING
   ========================================================= */

function escapeHTML(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   RENDER WORLD MAP
   ========================================================= */

function renderBase() {

    if (!worldData) {
        return;
    }


    const countries =
        topojson.feature(
            worldData,
            worldData.objects.countries
        );


    const borders =
        topojson.mesh(
            worldData,
            worldData.objects.countries,
            (
                a,
                b
            ) => a !== b
        );


    const stateBorders =
        usStatesData?.objects?.states
            ? topojson.mesh(
                usStatesData,
                usStatesData.objects.states,
                (a, b) => a !== b
            )
            : null;


    const graticule =
        d3.geoGraticule();


    /*
     * Outer sphere.
     */

    svg.select(".sphere")
        .attr(
            "d",
            path({
                type: "Sphere"
            })
        );


    /* Graticule. */

    svg.select(".graticule")
        .datum(
            graticule()
        )
        .attr(
            "d",
            path
        );


    /*
     * Countries.
     */

    svg.select("#countries")
        .selectAll("path")
        .data(
            countries.features,
            d => d.id
        )
        .join(

            enter =>
                enter
                    .append("path")
                    .attr(
                        "class",
                        "country"
                    )
                    .attr(
                        "d",
                        path
                    ),

            update =>
                update
                    .attr(
                        "d",
                        path
                    ),

            exit =>
                exit.remove()

        );


    svg.select("#state-borders")
        .datum(
            stateBorders
        )
        .attr(
            "d",
            stateBorders ? path : null
        );


    /*
     * Country borders.
     */

    svg.select("#borders")
        .datum(
            borders
        )
        .attr(
            "d",
            path
        );

}


/* =========================================================
   FACILITY DATA
   ========================================================= */

async function loadFacilities() {

    const response =
        await fetch(
            FACILITIES_SHEET_URL
        );


    if (!response.ok) {

        throw new Error(
            `Facilities HTTP ${response.status}`
        );

    }


    const csv =
        await response.text();


    facilities =
        csvToObjects(
            csv
        )
        .filter(
            facility => {

                return (

                    facility.id &&

                    facility.latitude !== "" &&

                    facility.longitude !== ""

                );

            }
        );

}


/* =========================================================
   HUMAN DATA
   ========================================================= */

async function loadHumans() {

    const response =
        await fetch(
            HUMANS_SHEET_URL
        );


    if (!response.ok) {

        throw new Error(
            `Humans HTTP ${response.status}`
        );

    }


    const csv =
        await response.text();


    humans =
        csvToObjects(
            csv
        )
        .filter(
            human =>
                human.name
        );

}


/* =========================================================
   ANOMALY DATA
   ========================================================= */

async function loadAnomalies() {

    const response =
        await fetch(
            ANOMALIES_SHEET_URL
        );


    if (!response.ok) {

        throw new Error(
            `Anomalies HTTP ${response.status}`
        );

    }


    const csv =
        await response.text();


    anomalies =
        csvToObjects(
            csv
        )
        .filter(
            anomaly =>
                anomaly.id
        );

}


/* =========================================================
   INCIDENT DATA
   ========================================================= */

async function loadIncidents() {

    const response =
        await fetch(
            INCIDENTS_SHEET_URL
        );


    if (!response.ok) {

        throw new Error(
            `Incidents HTTP ${response.status}`
        );

    }


    const csv =
        await response.text();


    incidents =
        csvToObjects(
            csv
        )
        .filter(
            incident =>
                incident.location
        );

}


/* =========================================================
   FACTION LOGOS (LEGEND)
   ========================================================= */

/*
 * Logos are optional: a failed request just
 * leaves the legend with diamond markers.
 */

async function loadFactionRecords() {

    try {

        const response =
            await fetch(
                FACTIONS_DATA_URL
            );


        if (!response.ok) {

            throw new Error(
                `Factions HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        factionRecords =
            Array.isArray(data.factions)
                ? data.factions
                : [];

    }
    catch (error) {

        console.warn(
            "Could not load faction logos:",
            error
        );

    }

}


/*
 * Sheet faction names are matched loosely:
 * "FOUNDATION" -> id, "GLOBAL OCCULT COALITION"
 * -> a longer official name containing it.
 */

function getFactionLogo(
    factionName
) {

    const key =
        String(
            factionName || ""
        )
        .trim()
        .toLowerCase();


    if (!key) {
        return "";
    }


    const match =
        factionRecords.find(
            faction =>
                faction.logo &&
                (
                    String(faction.id || "").toLowerCase() === key ||
                    String(faction.mark || "").toLowerCase() === key ||
                    String(faction.name || "").toLowerCase().includes(key)
                )
        );


    return match
        ? match.logo
        : "";

}


/* =========================================================
   SITE INVENTORY DATA
   ========================================================= */

/*
 * Site inventories live in the same INVENTORY
 * tab as player inventories, keyed by site name
 * (e.g. "Site-01"). Both tabs are optional, so a
 * failure here never blocks the map.
 */

async function loadSheetRows(
    url,
    label
) {

    try {

        const response =
            await fetch(
                url
            );


        if (!response.ok) {

            throw new Error(
                `${label} HTTP ${response.status}`
            );

        }


        return csvToObjects(
            await response.text()
        );

    }
    catch (error) {

        console.warn(
            `Could not load ${label}:`,
            error
        );

        return [];

    }

}


async function loadInventory() {

    const [
        inventoryRows,
        itemRows
    ] = await Promise.all([

        loadSheetRows(
            INVENTORY_SHEET_URL,
            "INVENTORY"
        ),

        loadSheetRows(
            ITEMS_SHEET_URL,
            "ITEMS"
        )

    ]);


    inventoryRecords =
        inventoryRows.filter(
            entry =>
                entry.id &&
                entry.name
        );


    itemRecords =
        itemRows.filter(
            item =>
                item.name
        );

}


/* =========================================================
   LOAD ALL DATABASES
   ========================================================= */

async function loadAllData() {

    await Promise.all([

        loadFacilities(),
        loadHumans(),
        loadAnomalies(),
        loadIncidents(),
        loadFactionRecords(),
        loadInventory()

    ]);


    /*
     * Filters must exist before markers
     * are rendered.
     */

    renderFactionFilters();

    renderFacilityMarkers();

}


/* =========================================================
   FACILITY MARKERS
   ========================================================= */

function renderFacilityMarkers() {

    const markerContainer =
        document.getElementById(
            "facility-markers"
        );


    if (!markerContainer) {
        return;
    }


    markerContainer.innerHTML =
        "";


    facilities.forEach(
        (
            facility,
            index
        ) => {

            const longitude =
                Number(
                    facility.longitude
                );


            const latitude =
                Number(
                    facility.latitude
                );


            if (
                !Number.isFinite(
                    longitude
                ) ||
                !Number.isFinite(
                    latitude
                )
            ) {

                return;

            }


            const coordinates =
                projection([
                    longitude,
                    latitude
                ]);


            if (!coordinates) {
                return;
            }


            const x =
                coordinates[0];


            const y =
                coordinates[1];


            const marker =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "g"
                );


            marker.classList.add(
                "facility-marker"
            );


            marker.dataset.index =
                index;


            marker.dataset.x =
                x;


            marker.dataset.y =
                y;


            marker.dataset.faction =
                String(
                    facility.faction || ""
                ).trim();


            const siteName =
                facility.name ||
                facility.id;


            const iconPath =
                `images/${siteName}.png`;


            marker.innerHTML = `

                <circle
                    class="facility-marker-ring"
                    cx="0"
                    cy="0"
                    r="14"
                ></circle>

                <circle
                    class="facility-marker-circle"
                    cx="0"
                    cy="0"
                    r="4"
                ></circle>

                <image
                    class="facility-marker-icon"
                    href="${iconPath}"
                    x="-10"
                    y="-10"
                    width="20"
                    height="20"
                    preserveAspectRatio="xMidYMid meet"
                ></image>

            `;


            const icon =
                marker.querySelector(
                    ".facility-marker-icon"
                );


            if (icon) {

                icon.addEventListener(
                    "error",
                    () => {

                        icon.remove();

                    }
                );

            }


            marker.addEventListener(
                "click",
                event => {

                    event.stopPropagation();


                    openFacilityPanel(
                        facility,
                        marker
                    );

                }
            );


            markerContainer.appendChild(
                marker
            );

        }
    );


    updateMarkerScale();

    updateFactionMarkers();

}


/* =========================================================
   FACTION FILTERS
   ========================================================= */

function renderFactionFilters() {

    const container =
        document.getElementById(
            "faction-filters"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `

        <div class="legend-header">

            <span class="legend-title">
                FACTION LEGEND
            </span>

            <button
                class="legend-reset"
                id="legend-reset"
                type="button"
                hidden
            >
                SHOW ALL
            </button>

        </div>

    `;


    container
        .querySelector(
            "#legend-reset"
        )
        .addEventListener(
            "click",
            () => {

                container
                    .querySelectorAll(
                        ".faction-filter"
                    )
                    .forEach(
                        filter =>
                            filter.classList.add(
                                "active"
                            )
                    );


                updateFactionMarkers();

            }
        );


    const factions =
        [
            ...new Set(
                facilities
                    .map(
                        facility =>
                            String(
                                facility.faction || ""
                            ).trim()
                    )
                    .filter(Boolean)
            )
        ]
        .sort(
            (
                a,
                b
            ) => {

                /*
                 * LOCALES is a catch-all, so it always
                 * sits at the bottom of the legend.
                 */

                const aLast =
                    a.toUpperCase() === "LOCALES";


                const bLast =
                    b.toUpperCase() === "LOCALES";


                if (aLast !== bLast) {

                    return aLast
                        ? 1
                        : -1;

                }


                return a.localeCompare(b);

            }
        );


    factions.forEach(
        faction => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "faction-filter active";


            button.dataset.faction =
                faction;


            const logo =
                getFactionLogo(
                    faction
                );


            const siteCount =
                facilities.filter(
                    facility =>
                        String(
                            facility.faction || ""
                        ).trim() === faction
                ).length;


            button.innerHTML = `

                <span
                    class="faction-filter-mark"
                    aria-hidden="true"
                >
                    ${
                        logo
                            ? `<img
                                class="faction-filter-logo"
                                src="${escapeHTML(logo)}"
                                alt=""
                            >`
                            : `<span class="faction-filter-diamond"></span>`
                    }
                </span>

                <span
                    class="faction-filter-label"
                >
                    ${escapeHTML(faction)}
                </span>

                <span
                    class="faction-filter-count"
                >
                    ${String(siteCount).padStart(2, "0")}
                </span>

            `;


            button.addEventListener(
                "click",
                () => {

                    const isActive =
                        button.classList.contains(
                            "active"
                        );


                    if (isActive) {

                        button.classList.add(
                            "toggling-off"
                        );


                        button.classList.remove(
                            "active"
                        );


                        setTimeout(
                            () => {

                                button.classList.remove(
                                    "toggling-off"
                                );

                            },
                            250
                        );

                    }
                    else {

                        button.classList.add(
                            "active"
                        );

                    }


                    updateFactionMarkers();

                }
            );


            container.appendChild(
                button
            );

        }
    );

}


/* =========================================================
   UPDATE FACTION MARKERS
   ========================================================= */

function updateFactionMarkers() {

    const activeFactions =
        new Set(
            Array.from(
                document.querySelectorAll(
                    ".faction-filter.active"
                )
            ).map(
                button =>
                    button.dataset.faction
            )
        );


    const resetButton =
        document.getElementById(
            "legend-reset"
        );


    if (resetButton) {

        resetButton.hidden =
            document.querySelectorAll(
                ".faction-filter:not(.active)"
            ).length === 0;

    }


    document
        .querySelectorAll(
            ".facility-marker"
        )
        .forEach(
            marker => {

                const faction =
                    marker.dataset.faction;


                const visible =
                    activeFactions.has(
                        faction
                    );


                marker.style.opacity =
                    visible
                        ? "1"
                        : "0";


                marker.style.pointerEvents =
                    visible
                        ? "auto"
                        : "none";

            }
        );

}


/* =========================================================
   FACILITY PANEL
   ========================================================= */

function openFacilityPanel(
    facility,
    marker
) {

    selectedFacility =
        facility;


    document
        .querySelectorAll(
            ".facility-marker.selected"
        )
        .forEach(
            element => {

                element.classList.remove(
                    "selected"
                );

            }
        );


    if (marker) {

        marker.classList.add(
            "selected"
        );

    }


    const panel =
        document.getElementById(
            "facility-panel"
        );


    const backdrop =
        document.getElementById(
            "panel-backdrop"
        );


    const name =
        document.getElementById(
            "panel-name"
        );


    const id =
        document.getElementById(
            "panel-id"
        );


    const designation =
        document.getElementById(
            "panel-designation"
        );


    const fields =
        document.getElementById(
            "panel-fields"
        );


    const description =
        document.getElementById(
            "panel-description"
        );


    name.textContent =
        facility.name ||
        "UNNAMED FACILITY";


    id.textContent =
        facility.id ||
        "";


    designation.textContent =
        facility.location ||
        "LOCATION UNAVAILABLE";


    /*
     * Facility banner.
     */

    const panelBanner =
        document.getElementById(
            "panel-banner"
        );


    if (panelBanner) {

        panelBanner.style.backgroundImage =
            "none";


        const siteName =
            facility.name ||
            facility.id;


        const banner =
            new Image();


        banner.onload =
            () => {

                panelBanner.style.backgroundImage =
                    `url("${banner.src}")`;

            };


        banner.onerror =
            () => {

                const jpegBanner =
                    new Image();


                jpegBanner.onload =
                    () => {

                        panelBanner.style.backgroundImage =
                            `url("${jpegBanner.src}")`;

                    };


                jpegBanner.onerror =
                    () => {

                        panelBanner.style.backgroundImage =
                            "none";

                    };


                jpegBanner.src =
                    `images/${siteName}-banner.jpeg`;

            };


        banner.src =
            `images/${siteName}-banner.png`;

    }


    /*
     * Facility metadata.
     */

    fields.innerHTML = `
        ${createPanelField(
            "CLEARANCE",
            facility.clearance
        )}
    `;


    updateSecurityRating(
        facility.security
    );


    loadFacilityWeather(
        facility
    );


    /*
     * Description.
     */

    description.textContent =
        facility.description ||
        "NO DESCRIPTION AVAILABLE.";


    /*
     * Populate expanded records.
     */

    populatePersonnel(
        facility
    );


    populateAnomalies(
        facility
    );


    populateInventory(
        facility
    );


    populateIncidents(
        facility
    );


    /*
     * Reset all record sections to
     * their default collapsed state.
     */

    resetFacilitySections();


    /*
     * Open panel.
     */

    panel.classList.add(
        "open"
    );


    backdrop.classList.add(
        "open"
    );

}


/* =========================================================
   PANEL FIELD
   ========================================================= */

function createPanelField(
    label,
    value
) {

    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {

        return "";
    }


    return `

        <div class="panel-field">

            <span class="panel-label">
                ${escapeHTML(label)}
            </span>

            <span class="panel-value">
                ${escapeHTML(value)}
            </span>

        </div>

    `;

}


function updateSecurityRating(value) {

    const meter =
        document.getElementById(
            "facility-security-meter"
        );


    const valueLabel =
        document.getElementById(
            "facility-security-value"
        );


    const rawValue =
        String(value ?? "")
            .trim()
            .replace("%", "");


    const parsedValue =
        Number.parseFloat(
            rawValue
        );


    if (
        !Number.isFinite(parsedValue)
    ) {

        meter.classList.add(
            "is-unrated"
        );

        meter.setAttribute(
            "aria-valuenow",
            "0"
        );

        meter.setAttribute(
            "aria-valuetext",
            "Unrated"
        );

        valueLabel.textContent =
            "UNRATED";

        return;

    }


    const rating =
        Math.round(
            Math.min(
                100,
                Math.max(
                    0,
                    parsedValue
                )
            )
        );


    meter.classList.remove(
        "is-unrated"
    );

    meter.style.setProperty(
        "--security-position",
        `${rating}%`
    );

    meter.setAttribute(
        "aria-valuenow",
        String(rating)
    );

    meter.setAttribute(
        "aria-valuetext",
        `${rating} out of 100`
    );

    valueLabel.textContent =
        `${rating} / 100`;

}


function describeWeatherCode(code) {

    const descriptions = {
        0: "CLEAR",
        1: "MOSTLY CLEAR",
        2: "PARTLY CLOUDY",
        3: "OVERCAST",
        45: "FOG",
        48: "FREEZING FOG",
        51: "LIGHT DRIZZLE",
        53: "DRIZZLE",
        55: "HEAVY DRIZZLE",
        56: "FREEZING DRIZZLE",
        57: "HEAVY FREEZING DRIZZLE",
        61: "LIGHT RAIN",
        63: "RAIN",
        65: "HEAVY RAIN",
        66: "FREEZING RAIN",
        67: "HEAVY FREEZING RAIN",
        71: "LIGHT SNOW",
        73: "SNOW",
        75: "HEAVY SNOW",
        77: "SNOW GRAINS",
        80: "RAIN SHOWERS",
        81: "HEAVY SHOWERS",
        82: "VIOLENT SHOWERS",
        85: "SNOW SHOWERS",
        86: "HEAVY SNOW SHOWERS",
        95: "THUNDERSTORM",
        96: "HAILSTORM",
        99: "HEAVY HAILSTORM"
    };


    return descriptions[code] || "CONDITIONS UNKNOWN";

}


function weatherIconForCode(code) {

    if ([0, 1].includes(code)) {
        return "\u2600";
    }


    if (code === 2) {
        return "\u26C5";
    }


    if ([45, 48].includes(code)) {
        return "\u224B";
    }


    if ([71, 73, 75, 77, 85, 86].includes(code)) {
        return "\u2744";
    }


    if ([95, 96, 99].includes(code)) {
        return "\u26A1";
    }


    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
        return "\u2614";
    }


    return "\u2601";

}


async function loadFacilityWeather(facility) {

    const requestId =
        ++weatherRequestId;


    const temperatureElement =
        document.getElementById(
            "facility-weather-temperature"
        );


    const conditionElement =
        document.getElementById(
            "facility-weather-condition"
        );


    const iconElement =
        document.getElementById(
            "facility-weather-icon"
        );


    const humidityElement =
        document.getElementById(
            "facility-weather-humidity"
        );


    const windElement =
        document.getElementById(
            "facility-weather-wind"
        );


    temperatureElement.textContent =
        "--";

    conditionElement.textContent =
        "FETCHING CONDITIONS";

    iconElement.textContent =
        "--";

    humidityElement.textContent =
        "--";

    windElement.textContent =
        "--";


    const latitudeText =
        String(facility.latitude ?? "").trim();


    const longitudeText =
        String(facility.longitude ?? "").trim();


    const latitude =
        Number(latitudeText);


    const longitude =
        Number(longitudeText);


    if (
        !latitudeText ||
        !longitudeText ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {

        conditionElement.textContent =
            "NO COORDINATES";

        humidityElement.textContent =
            "--";

        windElement.textContent =
            "--";

        return;

    }


    const parameters =
        new URLSearchParams({
            latitude: String(latitude),
            longitude: String(longitude),
            current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
            temperature_unit: "celsius",
            wind_speed_unit: "kmh",
            timezone: "auto"
        });


    try {

        const response =
            await fetch(
                `${WEATHER_API_URL}?${parameters}`
            );


        if (!response.ok) {

            throw new Error(
                `Weather HTTP ${response.status}`
            );

        }


        const weather =
            await response.json();


        if (
            requestId !== weatherRequestId ||
            selectedFacility !== facility
        ) {

            return;

        }


        const current =
            weather.current;


        const temperature =
            Number(current?.temperature_2m);


        if (!Number.isFinite(temperature)) {

            throw new Error(
                "Weather response did not include a temperature"
            );

        }


        const humidity =
            Number(current.relative_humidity_2m);


        const windSpeed =
            Number(current.wind_speed_10m);


        const weatherCode =
            Number(current.weather_code);


        temperatureElement.textContent =
            `${Math.round(temperature)} C`;

        conditionElement.textContent =
            describeWeatherCode(
                weatherCode
            );

        iconElement.textContent =
            weatherIconForCode(
                weatherCode
            );

        humidityElement.textContent =
            Number.isFinite(humidity)
                ? `${Math.round(humidity)}%`
                : "--";

        windElement.textContent =
            Number.isFinite(windSpeed)
                ? `${Math.round(windSpeed)} KM/H`
                : "--";

    }
    catch (error) {

        if (
            requestId !== weatherRequestId ||
            selectedFacility !== facility
        ) {

            return;

        }


        temperatureElement.textContent =
            "--";

        conditionElement.textContent =
            "WEATHER UNAVAILABLE";

        iconElement.textContent =
            "--";

        humidityElement.textContent =
            "--";

        windElement.textContent =
            "--";

    }

}


/* =========================================================
   FACILITY LOCATION MATCHING
   ========================================================= */

/*
 * Facility names are the canonical location key.
 *
 * Trimming and case normalization means
 * "Site-01" and "site-01" will still match.
 */

function locationsMatch(
    recordLocation,
    facility
) {

    if (
        !recordLocation ||
        !facility
    ) {

        return false;

    }


    const record =
        String(
            recordLocation
        )
        .trim()
        .toLowerCase();


    const facilityName =
        String(
            facility.name ||
            ""
        )
        .trim()
        .toLowerCase();


    return (
        record !== "" &&
        facilityName !== "" &&
        record === facilityName
    );

}


/* =========================================================
   PERSONNEL
   ========================================================= */

const DEPARTMENT_LOGOS = {
    administration: "images/ADM.png",
    security: "images/SEC.png",
    operations: "images/OPS.png",
    research: "images/RES.png",
    intelligence: "images/INT.png",
    medicine: "images/MED.png",
    medical: "images/MED.png",
    logistics: "images/LOG.png",
    ethics: "images/ETH.png"
};


function getDepartmentLogo(
    department
) {

    const key =
        String(
            department || ""
        ).toLowerCase();


    const match =
        Object.keys(
            DEPARTMENT_LOGOS
        ).find(
            name =>
                key.includes(name)
        );


    return match
        ? DEPARTMENT_LOGOS[match]
        : "";

}


function populatePersonnel(
    facility
) {

    const container =
        document.getElementById(
            "personnel-list"
        );


    const empty =
        document.getElementById(
            "personnel-empty"
        );


    if (
        !container ||
        !empty
    ) {

        return;

    }


    container.innerHTML =
        "";


    empty.classList.remove(
        "visible"
    );


    const sitePersonnel =
        humans.filter(
            human =>
                String(
                    human.status || ""
                )
                .trim()
                .toUpperCase() === "ACTIVE" &&
                locationsMatch(
                    human.location,
                    facility
                )
        );


    if (
        sitePersonnel.length === 0
    ) {

        empty.classList.add(
            "visible"
        );

        return;

    }


    /*
     * Sort:
     *
     * Department
     * Class
     * Clearance
     * Name
     */

    sitePersonnel.sort(
        (
            a,
            b
        ) => {

            const departmentCompare =
                compareText(
                    a.department,
                    b.department
                );


            if (
                departmentCompare !== 0
            ) {

                return departmentCompare;

            }


            const classCompare =
                compareText(
                    a.class,
                    b.class
                );


            if (
                classCompare !== 0
            ) {

                return classCompare;

            }


            const clearanceCompare =
                compareClearance(
                    a.clearance,
                    b.clearance
                );


            if (
                clearanceCompare !== 0
            ) {

                return clearanceCompare;

            }


            return compareText(
                a.name,
                b.name
            );

        }
    );


    /*
     * Group by department.
     */

    const departments =
        new Map();


    sitePersonnel.forEach(
        human => {

            const department =
                human.department ||
                "UNASSIGNED";


            if (
                !departments.has(
                    department
                )
            ) {

                departments.set(
                    department,
                    []
                );

            }


            departments
                .get(department)
                .push(
                    human
                );

        }
    );


    departments.forEach(
        (
            personnel,
            department
        ) => {

            const departmentElement =
                document.createElement(
                    "div"
                );


            departmentElement.className =
                "personnel-department";


            const departmentLogo =
                personnel.some(
                    human =>
                        String(
                            human.faction || ""
                        )
                        .toLowerCase()
                        .includes(
                            "foundation"
                        )
                )
                    ? getDepartmentLogo(
                        department
                    )
                    : "";


            departmentElement.innerHTML = `

                <div class="personnel-department-title">

                    ${
                        departmentLogo
                            ? `
                                <img
                                    class="personnel-department-logo"
                                    src="${escapeHTML(departmentLogo)}"
                                    alt=""
                                >
                              `
                            : ""
                    }

                    <span>
                        ${escapeHTML(department)}
                    </span>

                </div>

            `;


            personnel.forEach(
                human => {

                    const entry =
                        document.createElement(
                            "div"
                        );


                    entry.className =
                        "personnel-entry";



                    const characterClass =
                        String(
                            human.class || ""
                        )
                            .replace(
                                /^CLASS\s*/i,
                                ""
                            )
                            .trim();


                    const clearance =
                        String(
                            human.clearance || ""
                        )
                            .replace(
                                /^LEVEL\s*/i,
                                ""
                            )
                            .trim();


                    const classClearance =
                        characterClass +
                        clearance;


                    entry.innerHTML = `

                        <span
                            class="personnel-class-clearance"
                        >
                            ${escapeHTML(
                                classClearance || "—"
                            )}
                        </span>

                        <span
                            class="personnel-name"
                        >
                            ${escapeHTML(
                                human.name
                            )}
                        </span>

                    `;


                    departmentElement.appendChild(
                        entry
                    );

                }
            );


            container.appendChild(
                departmentElement
            );

        }
    );

}


/* =========================================================
   ANOMALIES
   ========================================================= */

function getAnomalyDesignation(
    anomaly
) {

    const catalog =
        String(
            anomaly.catalog || ""
        ).trim();


    const id =
        String(
            anomaly.id || ""
        ).trim();


    return (
        catalog && id
            ? `${catalog}-${id}`
            : catalog || id || "UNIDENTIFIED"
    );

}


function createContainmentCell(
    number,
    anomaly,
    prefix = "CELL"
) {

    const cell =
        document.createElement(
            "div"
        );


    const cellNumber =
        String(number)
            .padStart(2, "0");


    const cellLabel =
        prefix === "CELL"
            ? `CELL ${cellNumber}`
            : `${prefix}-${cellNumber}`;


    if (!anomaly) {

        cell.className =
            "containment-cell is-vacant";


        cell.innerHTML = `

            <div class="cell-head">
                <span class="cell-number">
                    ${escapeHTML(cellLabel)}
                </span>
            </div>

            <div class="cell-vacant">
                VACANT
            </div>

        `;

        return cell;

    }


    const objectClass =
        String(
            anomaly.object_class || ""
        ).trim();


    const classKey =
        objectClass
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-");


    const containment =
        parseFloat(
            anomaly.containment
        );


    const containmentPercent =
        Number.isFinite(containment)
            ? Math.min(
                100,
                Math.max(
                    0,
                    containment
                )
            )
            : null;


    const details =
        [
            anomaly.type,
            anomaly.clearance
        ]
        .map(
            value =>
                String(
                    value || ""
                ).trim()
        )
        .filter(
            value =>
                value &&
                value.toUpperCase() !== "UNKNOWN"
        );


    cell.className =
        `containment-cell is-occupied${
            classKey
                ? ` class-${classKey}`
                : ""
        }`;


    cell.innerHTML = `

        <div class="cell-head">

            <span class="cell-number">
                ${escapeHTML(cellLabel)}
            </span>

            ${
                objectClass
                    ? `
                        <span class="cell-class">
                            ${escapeHTML(objectClass)}
                        </span>
                      `
                    : ""
            }

        </div>

        <div class="cell-designation">
            ${escapeHTML(
                getAnomalyDesignation(anomaly)
            )}
        </div>

        ${
            anomaly.codename
                ? `
                    <div class="cell-codename">
                        ${escapeHTML(anomaly.codename)}
                    </div>
                  `
                : ""
        }

        ${
            details.length
                ? `
                    <div class="cell-details">
                        ${escapeHTML(details.join(" // "))}
                    </div>
                  `
                : ""
        }

        ${
            containmentPercent === null
                ? ""
                : `
                    <div
                        class="cell-containment"
                        title="Containment ${containmentPercent}%"
                    >
                        <span class="cell-containment-label">
                            CONTAINMENT
                        </span>
                        <span class="cell-containment-bar">
                            <span style="width: ${containmentPercent}%"></span>
                        </span>
                        <span class="cell-containment-value">
                            ${Math.round(containmentPercent)}%
                        </span>
                    </div>
                  `
        }

    `;


    return cell;

}


const TEMPORARY_AREA =
    "Temporary Containment Area";


/*
 * Capacity is either a plain number (one unnamed
 * wing) or "Wing Name: 4; Other Wing: 6".
 */

function parseWings(
    capacityText
) {

    const text =
        String(
            capacityText ?? ""
        ).trim();


    if (/^\d+$/.test(text)) {

        return Number(text) > 0
            ? [{ name: "", capacity: Number(text) }]
            : [];

    }


    return text
        .split(";")
        .map(
            part => {

                const colon =
                    part.lastIndexOf(":");

                return colon === -1
                    ? null
                    : {
                        name: part.slice(0, colon).trim(),
                        capacity: parseInt(
                            part.slice(colon + 1),
                            10
                        )
                    };

            }
        )
        .filter(
            wing =>
                wing &&
                wing.name &&
                Number.isFinite(wing.capacity) &&
                wing.capacity > 0
        );

}


// "Light Containment Zone" -> "LCZ"
function wingPrefix(
    name
) {

    return name
        .split(/\s+/)
        .filter(Boolean)
        .map(
            word =>
                word[0].toUpperCase()
        )
        .join("") || "CELL";

}


/*
 * Each wing's capacity is its number of containment
 * cells. Cells fill with the SCPs assigned to that
 * wing; the rest are held in the Temporary
 * Containment Area.
 */

function populateAnomalies(
    facility
) {

    const container =
        document.getElementById(
            "anomaly-list"
        );


    const empty =
        document.getElementById(
            "anomalies-empty"
        );


    const occupancy =
        document.getElementById(
            "anomalies-occupancy"
        );


    if (
        !container ||
        !empty
    ) {

        return;

    }


    container.innerHTML =
        "";


    empty.classList.remove(
        "visible"
    );


    const siteAnomalies =
        anomalies
            .filter(
                anomaly =>
                    locationsMatch(
                        anomaly.location,
                        facility
                    )
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    compareText(
                        getAnomalyDesignation(a),
                        getAnomalyDesignation(b)
                    )
            );


    const wings =
        parseWings(
            facility.capacity
        );


    const totalCapacity =
        wings.reduce(
            (
                sum,
                wing
            ) =>
                sum + wing.capacity,
            0
        );


    const held =
        siteAnomalies.length;


    /*
     * Assign each SCP to the wing named in its
     * "wing" column. Anything without a matching
     * wing, or whose wing is full, is held in the
     * Temporary Containment Area. A plain-number
     * capacity is a single unnamed wing.
     */

    const groups =
        wings.map(
            wing => ({
                ...wing,
                held: []
            })
        );


    const temporary =
        [];


    siteAnomalies.forEach(
        anomaly => {

            const wanted =
                String(
                    anomaly.wing || ""
                )
                .trim()
                .toLowerCase();


            const group =
                groups.length === 1 &&
                !groups[0].name
                    ? groups[0]
                    : groups.find(
                        candidate =>
                            candidate.name.toLowerCase() === wanted
                    );


            if (
                group &&
                group.held.length < group.capacity
            ) {

                group.held.push(
                    anomaly
                );

            }
            else {

                temporary.push(
                    anomaly
                );

            }

        }
    );


    const placed =
        held - temporary.length;


    if (occupancy) {

        occupancy.textContent =
            totalCapacity > 0
                ? `${placed} / ${totalCapacity}`
                : held > 0
                    ? String(held)
                    : "";


        occupancy.classList.toggle(
            "is-over",
            totalCapacity > 0 &&
            temporary.length > 0
        );

    }


    if (
        totalCapacity === 0 &&
        held === 0
    ) {

        empty.classList.add(
            "visible"
        );

        return;

    }


    const summary =
        document.createElement(
            "div"
        );


    summary.className =
        "cell-summary";


    summary.innerHTML =
        totalCapacity > 0
            ? `
                <span>CAPACITY <strong>${totalCapacity}</strong></span>
                <span>OCCUPIED <strong>${placed}</strong></span>
                <span>VACANT <strong>${totalCapacity - placed}</strong></span>
                ${
                    temporary.length
                        ? `<span class="is-over">TEMPORARY <strong>${temporary.length}</strong></span>`
                        : ""
                }
              `
            : `
                <span>HELD <strong>${held}</strong></span>
                <span>CAPACITY <strong>NOT SET</strong></span>
              `;


    container.appendChild(
        summary
    );


    /*
     * One block per wing: an optional header
     * followed by that wing's grid of cells.
     */

    const renderWing = (
        title,
        countText,
        cells
    ) => {

        const section =
            document.createElement(
                "div"
            );


        section.className =
            "containment-wing";


        if (title) {

            section.innerHTML = `

                <div class="wing-header">
                    <span class="wing-title">
                        ${escapeHTML(title.toUpperCase())}
                    </span>
                    <span class="wing-count">
                        ${escapeHTML(countText)}
                    </span>
                </div>

            `;

        }


        const grid =
            document.createElement(
                "div"
            );


        grid.className =
            "containment-grid";


        cells.forEach(
            cell =>
                grid.appendChild(
                    cell
                )
        );


        section.appendChild(
            grid
        );


        container.appendChild(
            section
        );

    };


    if (totalCapacity === 0) {

        renderWing(
            "",
            "",
            siteAnomalies.map(
                (
                    anomaly,
                    index
                ) =>
                    createContainmentCell(
                        index + 1,
                        anomaly
                    )
            )
        );

        return;

    }


    groups.forEach(
        group => {

            const prefix =
                group.name
                    ? wingPrefix(
                        group.name
                    )
                    : "CELL";


            renderWing(
                group.name,
                `${group.held.length} / ${group.capacity}`,
                Array.from(
                    { length: group.capacity },
                    (
                        _,
                        index
                    ) =>
                        createContainmentCell(
                            index + 1,
                            group.held[index],
                            prefix
                        )
                )
            );

        }
    );


    if (temporary.length) {

        renderWing(
            TEMPORARY_AREA,
            String(
                temporary.length
            ),
            temporary.map(
                (
                    anomaly,
                    index
                ) =>
                    createContainmentCell(
                        index + 1,
                        anomaly,
                        "TCA"
                    )
            )
        );

    }

}


/* =========================================================
   SITE INVENTORY
   ========================================================= */

function normalizeInventoryId(
    value
) {

    return String(
        value || ""
    )
    .trim()
    .toUpperCase();

}


// Stats are stored as "Label: value; Label: value" in one sheet cell.
function parseItemStats(
    stats
) {

    return String(
        stats || ""
    )
    .split(";")
    .map(
        part =>
            part.trim()
    )
    .filter(
        Boolean
    )
    .map(
        part => {

            const colon =
                part.indexOf(":");

            return colon === -1
                ? null
                : [
                    part.slice(0, colon).trim(),
                    part.slice(colon + 1).trim()
                ];

        }
    )
    .filter(
        Boolean
    );

}


function populateInventory(
    facility
) {

    const container =
        document.getElementById(
            "inventory-list"
        );


    const empty =
        document.getElementById(
            "inventory-empty"
        );


    const count =
        document.getElementById(
            "inventory-count"
        );


    if (
        !container ||
        !empty
    ) {

        return;

    }


    container.innerHTML =
        "";


    empty.classList.remove(
        "visible"
    );


    const siteKey =
        normalizeInventoryId(
            facility.name
        );


    /*
     * Duplicate rows for the same item are
     * added together; a blank quantity is one.
     * Thaumaturgy rows are not site stock.
     */

    const totals =
        new Map();


    inventoryRecords
        .filter(
            entry =>
                normalizeInventoryId(
                    entry.id
                ) === siteKey &&
                String(
                    entry.type || ""
                ).trim().toLowerCase() !== "thaumaturgy"
        )
        .forEach(
            entry => {

                const key =
                    entry.name
                        .trim()
                        .toLowerCase();


                const amount =
                    parseInt(
                        entry.quantity,
                        10
                    );


                const quantity =
                    Number.isNaN(amount)
                        ? 1
                        : amount;


                const existing =
                    totals.get(key);


                if (existing) {

                    existing.quantity += quantity;

                }
                else {

                    totals.set(
                        key,
                        {
                            name: entry.name,
                            quantity
                        }
                    );

                }

            }
        );


    const items =
        [...totals.values()]
        .map(
            item => {

                const record =
                    itemRecords.find(
                        candidate =>
                            candidate.name
                                .trim()
                                .toLowerCase() ===
                            item.name
                                .trim()
                                .toLowerCase()
                    );

                return {
                    ...item,
                    category:
                        record?.category || "",
                    stats:
                        record
                            ? parseItemStats(
                                record.stats
                            )
                            : []
                };

            }
        )
        .sort(
            (
                a,
                b
            ) =>
                compareText(
                    a.category || "\uffff",
                    b.category || "\uffff"
                ) ||
                compareText(
                    a.name,
                    b.name
                )
        );


    if (count) {

        count.textContent =
            items.length
                ? String(
                    items.length
                ).padStart(2, "0")
                : "";

    }


    if (
        items.length === 0
    ) {

        empty.classList.add(
            "visible"
        );

        return;

    }


    items.forEach(
        item => {

            const entry =
                document.createElement(
                    "div"
                );


            entry.className =
                "site-inventory-item";


            entry.innerHTML = `

                <div class="site-inventory-qty">
                    <span class="site-inventory-qty-label">
                        QTY
                    </span>
                    ${escapeHTML(item.quantity)}
                </div>

                <div class="site-inventory-body">

                    ${
                        item.category
                            ? `
                                <div class="site-inventory-category">
                                    ${escapeHTML(item.category)}
                                </div>
                              `
                            : ""
                    }

                    <div class="site-inventory-name">
                        ${escapeHTML(item.name)}
                    </div>

                    ${
                        item.stats.length
                            ? `
                                <dl class="site-inventory-specs">
                                    ${
                                        item.stats
                                            .map(
                                                ([label, value]) => `
                                                    <div>
                                                        <dt>${escapeHTML(label)}</dt>
                                                        <dd>${escapeHTML(value)}</dd>
                                                    </div>
                                                `
                                            )
                                            .join("")
                                    }
                                </dl>
                              `
                            : ""
                    }

                </div>

            `;


            container.appendChild(
                entry
            );

        }
    );

}


/* =========================================================
   INCIDENTS
   ========================================================= */

function populateIncidents(
    facility
) {

    const container =
        document.getElementById(
            "incident-list"
        );


    const empty =
        document.getElementById(
            "incidents-empty"
        );


    if (
        !container ||
        !empty
    ) {

        return;

    }


    container.innerHTML =
        "";


    empty.classList.remove(
        "visible"
    );


    const siteIncidents =
        incidents.filter(
            incident =>
                locationsMatch(
                    incident.location,
                    facility
                )
        );


    if (
        siteIncidents.length === 0
    ) {

        empty.classList.add(
            "visible"
        );

        return;

    }


    /*
     * Newest incidents first.
     */

    siteIncidents.sort(
        (
            a,
            b
        ) =>
            compareDatesDescending(
                a.date,
                b.date
            )
    );


    siteIncidents.forEach(
        incident => {

            const entry =
                document.createElement(
                    "div"
                );


            entry.className =
                "incident-entry";


            const date =
                incident.date ||
                "DATE UNKNOWN";


            /*
             * The INCIDENTS tab is shared with the lore
             * timeline: summary is the one-line description.
             * Older column names remain as fallbacks.
             */

            const summary =
                incident.summary ||
                incident.title ||
                incident.blurb ||
                incident.text ||
                "NO INCIDENT DESCRIPTION.";


            entry.innerHTML = `

                <span
                    class="incident-date"
                >
                    ${escapeHTML(date)}
                </span>

                <span
                    class="incident-summary"
                    title="${escapeHTML(summary)}"
                >
                    ${escapeHTML(summary)}
                </span>

            `;


            container.appendChild(
                entry
            );

        }
    );

}


/* =========================================================
   SORTING HELPERS
   ========================================================= */

function compareText(
    a,
    b
) {

    return String(
        a || ""
    )
        .trim()
        .localeCompare(
            String(
                b || ""
            ).trim(),
            undefined,
            {
                sensitivity: "base"
            }
        );

}

function compareClearance(
    a,
    b
) {

    const aNumber =
        parseInt(
            String(a || "").replace(/\D/g, ""),
            10
        ) || 0;


    const bNumber =
        parseInt(
            String(b || "").replace(/\D/g, ""),
            10
        ) || 0;


    return bNumber - aNumber;
}



function compareDatesDescending(
    a,
    b
) {

    const dateA =
        new Date(a);


    const dateB =
        new Date(b);


    const validA =
        !Number.isNaN(
            dateA.getTime()
        );


    const validB =
        !Number.isNaN(
            dateB.getTime()
        );


    if (
        validA &&
        validB
    ) {

        return (
            dateB.getTime() -
            dateA.getTime()
        );

    }


    if (
        validA
    ) {

        return -1;

    }


    if (
        validB
    ) {

        return 1;

    }


    return compareText(
        b,
        a
    );

}


/* =========================================================
   FACILITY RECORD ACCORDIONS
   ========================================================= */

function setupFacilityRecordSections() {

    document
        .querySelectorAll(
            ".facility-section-toggle"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const section =
                            button.closest(
                                ".facility-record-section"
                            );


                        if (!section) {
                            return;
                        }


                        const isOpen =
                            section.classList.contains(
                                "open"
                            );


                        section.classList.toggle(
                            "open",
                            !isOpen
                        );


                        button.setAttribute(
                            "aria-expanded",
                            String(!isOpen)
                        );

                    }
                );

            }
        );

}


/* =========================================================
   RESET FACILITY SECTIONS
   ========================================================= */

function resetFacilitySections() {

    document
        .querySelectorAll(
            ".facility-record-section"
        )
        .forEach(
            section => {

                section.classList.remove(
                    "open"
                );


                const button =
                    section.querySelector(
                        ".facility-section-toggle"
                    );


                if (button) {

                    button.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }

            }
        );

}


/* =========================================================
   CLOSE PANEL
   ========================================================= */

function closeFacilityPanel() {

    weatherRequestId++;

    const panel =
        document.getElementById(
            "facility-panel"
        );


    const backdrop =
        document.getElementById(
            "panel-backdrop"
        );


    panel.classList.remove(
        "open"
    );


    backdrop.classList.remove(
        "open"
    );


    document
        .querySelectorAll(
            ".facility-marker.selected"
        )
        .forEach(
            element => {

                element.classList.remove(
                    "selected"
                );

            }
        );


    selectedFacility =
        null;

}


/* =========================================================
   EVENTS
   ========================================================= */

document
    .getElementById(
        "panel-close"
    )
    .addEventListener(
        "click",
        closeFacilityPanel
    );


document
    .getElementById(
        "panel-backdrop"
    )
    .addEventListener(
        "click",
        closeFacilityPanel
    );


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            selectedFacility
        ) {

            closeFacilityPanel();

        }

    }
);


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeMap() {

    try {

        startLoader();


        /*
         * Set up map navigation.
         */

        setupMapNavigation();


        /*
         * Load world geometry.
         */

        const statesDataPromise =
            d3.json(
                US_STATES_DATA_URL
            )
            .catch(
                error => {
                    console.warn(
                        "State boundaries could not be loaded:",
                        error
                    );

                    return null;
                }
            );


        worldData =
            await d3.json(
                WORLD_DATA_URL
            );


        usStatesData =
            await statesDataPromise;


        /*
         * Draw countries.
         */

        renderBase();


        /*
         * Load all four spreadsheet
         * datasets in parallel.
         */

        await loadAllData();


        /*
         * Set up accordions once the
         * panel elements exist.
         */

        setupFacilityRecordSections();


        stopLoader();

    }
    catch (error) {

        console.error(
            "Map/database initialization failed:",
            error
        );


        facilities = [];
        humans = [];
        anomalies = [];
        incidents = [];


        stopLoader();

    }

}


initializeMap();
