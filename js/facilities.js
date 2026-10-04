
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


let facilities = [];
let humans = [];
let anomalies = [];
let incidents = [];

let selectedFacility = null;
let worldData = null;


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


    /*
     * Graticule.
     *
     * CSS currently hides this.
     */

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
   LOAD ALL DATABASES
   ========================================================= */

async function loadAllData() {

    await Promise.all([

        loadFacilities(),
        loadHumans(),
        loadAnomalies(),
        loadIncidents()

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
                `../images/${siteName}.png`;


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


    container.innerHTML =
        "";


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
            ) =>
                a.localeCompare(b)
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


            button.innerHTML = `

                <span
                    class="faction-filter-diamond"
                ></span>

                <span
                    class="faction-filter-label"
                >
                    ${escapeHTML(faction)}
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
            "LOCATION",
            facility.location
        )}

        ${createPanelField(
            "FACILITY TYPE",
            facility.type
        )}

        ${createPanelField(
            "CLEARANCE",
            facility.clearance
        )}

        ${createPanelField(
            "STATUS",
            facility.status
        )}

    `;


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


            departmentElement.innerHTML = `

                <div class="personnel-department-title">
                    ${escapeHTML(department)}
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
        anomalies.filter(
            anomaly =>
                locationsMatch(
                    anomaly.location,
                    facility
                )
        );


    if (
        siteAnomalies.length === 0
    ) {

        empty.classList.add(
            "visible"
        );

        return;

    }


    /*
     * Sort by Object Class,
     * then SCP designation.
     */

    siteAnomalies.sort(
        (
            a,
            b
        ) => {

            const classCompare =
                compareText(
                    a.object_class,
                    b.object_class
                );


            if (
                classCompare !== 0
            ) {

                return classCompare;

            }


            return compareText(
                a.id,
                b.id
            );

        }
    );


    /*
     * Group by Object Class.
     */

    const objectClasses =
        new Map();


    siteAnomalies.forEach(
        anomaly => {

            const objectClass =
                anomaly.object_class ||
                "UNCLASSIFIED";


            if (
                !objectClasses.has(
                    objectClass
                )
            ) {

                objectClasses.set(
                    objectClass,
                    []
                );

            }


            objectClasses
                .get(objectClass)
                .push(
                    anomaly
                );

        }
    );


    objectClasses.forEach(
        (
            anomalyRecords,
            objectClass
        ) => {

            const classElement =
                document.createElement(
                    "div"
                );


            classElement.className =
                "anomaly-object-class";


            classElement.innerHTML = `

                <div class="anomaly-object-class-title">
                    ${escapeHTML(objectClass)}
                </div>

            `;


            anomalyRecords.forEach(
                anomaly => {

                    const entry =
                        document.createElement(
                            "div"
                        );


                    entry.className =
                        "anomaly-entry";


                    const designation =
                        anomaly.id ||
                        "UNIDENTIFIED";


                    const codename =
                        anomaly.codename ||
                        "";


                    entry.innerHTML = `

                        <span
                            class="anomaly-designation"
                        >
                            ${escapeHTML(
                                designation
                            )}
                        </span>

                        ${
                            codename
                                ? `
                                    <span
                                        class="anomaly-codename"
                                    >
                                        ${escapeHTML(
                                            codename
                                        )}
                                    </span>
                                  `
                                : ""
                        }

                    `;


                    classElement.appendChild(
                        entry
                    );

                }
            );


            container.appendChild(
                classElement
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
             * Blurb is the preferred
             * one-line summary.
             *
             * Fall back to text if
             * blurb is empty.
             */

            const summary =
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

        worldData =
            await d3.json(
                WORLD_DATA_URL
            );


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
