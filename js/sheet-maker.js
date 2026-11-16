"use strict";

/* =========================================================
   SHEET MAKER — Delta Green character builder
   No persistence: all state lives in memory for the page visit.
========================================================= */

const STAT_KEYS = ["STR", "CON", "DEX", "INT", "POW", "CHA"];
const STAT_NAMES = {
    STR: "Strength",
    CON: "Constitution",
    DEX: "Dexterity",
    INT: "Intelligence",
    POW: "Power",
    CHA: "Charisma"
};
const POINT_BUY_TOTAL = 72;
const STAT_MIN = 3;
const STAT_MAX = 18;
const BONUS_PICKS = 8;
const BONUS_STEP = 20;
const SKILL_MAX = 80;

// Delta Green base skill ratings. `specialty` skills need a specialization.
const SKILLS = [
    { name: "Accounting", base: 10 },
    { name: "Alertness", base: 20 },
    { name: "Anthropology", base: 0 },
    { name: "Archeology", base: 0 },
    { name: "Art", base: 0, specialty: true },
    { name: "Artillery", base: 0 },
    { name: "Athletics", base: 30 },
    { name: "Bureaucracy", base: 10 },
    { name: "Computer Science", base: 0 },
    { name: "Craft", base: 0, specialty: true },
    { name: "Criminology", base: 10 },
    { name: "Demolitions", base: 0 },
    { name: "Disguise", base: 10 },
    { name: "Dodge", base: 30 },
    { name: "Drive", base: 20 },
    { name: "Firearms", base: 20 },
    { name: "First Aid", base: 10 },
    { name: "Foreign Language", base: 0, specialty: true },
    { name: "Forensics", base: 0 },
    { name: "Heavy Machinery", base: 10 },
    { name: "Heavy Weapons", base: 0 },
    { name: "History", base: 10 },
    { name: "HUMINT", base: 10 },
    { name: "Law", base: 0 },
    { name: "Medicine", base: 0 },
    { name: "Melee Weapons", base: 30 },
    { name: "Military Science", base: 0, specialty: true },
    { name: "Navigate", base: 10 },
    { name: "Occult", base: 10 },
    { name: "Persuade", base: 20 },
    { name: "Pharmacy", base: 0 },
    { name: "Pilot", base: 0, specialty: true },
    { name: "Psychotherapy", base: 10 },
    { name: "Ride", base: 10 },
    { name: "Science", base: 0, specialty: true },
    { name: "Search", base: 20 },
    { name: "SIGINT", base: 0 },
    { name: "Stealth", base: 10 },
    { name: "Surgery", base: 0 },
    { name: "Survival", base: 10 },
    { name: "Swim", base: 20 },
    { name: "Unarmed Combat", base: 40 },
    { name: "Unnatural", base: 0, noBonus: true }
];

const SKILL_BY_NAME = new Map(SKILLS.map((skill) => [skill.name.toLowerCase(), skill]));

const state = {
    stats: { STR: 10, CON: 10, DEX: 10, INT: 10, POW: 10, CHA: 10 },
    affiliations: [],
    packages: {},
    defaultPackage: { bonds: 3, skills: {} },
    affiliation: null,
    skills: [],
    bonds: ["", "", ""],
    nextId: 1
};

const $ = (id) => document.getElementById(id);

const els = {
    error: $("sheet-error"),
    name: $("f-name"),
    age: $("f-age"),
    affiliation: $("f-affiliation"),
    affiliationNote: $("affiliation-note"),
    blurb: $("f-blurb"),
    statStatus: $("stat-status"),
    statHint: $("stat-hint"),
    statGrid: $("stat-grid"),
    derived: $("derived"),
    skillStatus: $("skill-status"),
    skillList: $("skill-list"),
    bondList: $("bond-list"),
    output: $("output"),
    copy: $("btn-copy"),
    copyStatus: $("copy-status")
};


/* ---------- helpers ---------- */

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function singleLine(value) {
    return String(value).replace(/\s+/g, " ").trim();
}

function skillLabel(skill) {
    if (!skill.family) return skill.name;
    const spec = skill.spec.trim();
    return spec ? `${skill.family} (${spec})` : skill.family;
}

function skillTotal(skill) {
    return Math.max(skill.base, skill.pkg ?? 0) + skill.bonus * BONUS_STEP;
}

function bonusSpent() {
    return state.skills.reduce((sum, skill) => sum + skill.bonus, 0);
}

function canAddBonus(skill) {
    return !skill.noBonus
        && bonusSpent() < BONUS_PICKS
        && skillTotal(skill) + BONUS_STEP <= SKILL_MAX;
}

// Keeps the sheet legal after anything that can change totals, such as switching packages.
function enforceBonusLimits() {
    state.skills.forEach((skill) => {
        if (skill.noBonus) skill.bonus = 0;
        while (skill.bonus > 0 && skillTotal(skill) > SKILL_MAX) skill.bonus -= 1;
    });

    for (let index = state.skills.length - 1; index >= 0 && bonusSpent() > BONUS_PICKS; index -= 1) {
        const skill = state.skills[index];
        const excess = bonusSpent() - BONUS_PICKS;
        skill.bonus -= Math.min(skill.bonus, excess);
    }
}

function pointsSpent() {
    return STAT_KEYS.reduce((sum, key) => sum + state.stats[key], 0);
}

function currentBondCount() {
    return currentPackage().bonds ?? state.defaultPackage.bonds;
}

function currentPackage() {
    return (state.affiliation ? state.packages[state.affiliation.id] : null) ?? state.defaultPackage;
}

function derivedValues() {
    const { STR, CON, POW } = state.stats;
    const san = POW * 5;
    return {
        HP: Math.ceil((STR + CON) / 2),
        WP: POW,
        SAN: san,
        BP: san - POW
    };
}


/* ---------- skill model ---------- */

function makeSkill(definition, extra = {}) {
    return {
        id: state.nextId++,
        name: definition.name,
        family: definition.specialty ? definition.name : null,
        spec: "",
        base: definition.base,
        noBonus: Boolean(definition.noBonus),
        pkg: null,
        bonus: 0,
        fromPackage: false,
        ...extra
    };
}

function initSkills() {
    state.skills = SKILLS
        .filter((definition) => !definition.specialty)
        .map((definition) => makeSkill(definition));
}

function parsePackageSkill(rawName) {
    const match = rawName.match(/^(.+?)\s*\((.*)\)\s*$/);
    const family = (match ? match[1] : rawName).trim();
    const spec = match ? match[2].trim() : "";
    const definition = SKILL_BY_NAME.get(family.toLowerCase());
    return definition ? { definition, spec } : null;
}

function applyPackage(affiliation) {
    // Drop package-created specialties unless the player has already put bonus picks into them.
    state.skills = state.skills.filter((skill) => !(skill.fromPackage && skill.bonus === 0));
    state.skills.forEach((skill) => {
        skill.pkg = null;
        skill.fromPackage = false;
    });

    if (!affiliation) return;

    const skillPackage = currentPackage();
    Object.entries(skillPackage.skills ?? {}).forEach(([rawName, value]) => {
        const parsed = parsePackageSkill(rawName);
        if (!parsed) {
            console.warn(`Unknown skill in package: ${rawName}`);
            return;
        }

        const { definition, spec } = parsed;
        let target;
        if (definition.specialty) {
            target = state.skills.find((skill) =>
                skill.family === definition.name && skill.spec.toLowerCase() === spec.toLowerCase());
            if (!target) {
                target = makeSkill(definition, { spec });
                state.skills.push(target);
            }
            target.fromPackage = true;
        } else {
            target = state.skills.find((skill) => skill.name === definition.name);
        }
        if (target) target.pkg = value;
    });
}

function sortedSkills() {
    const order = new Map(SKILLS.map((skill, index) => [skill.name, index]));
    return [...state.skills].sort((a, b) =>
        (order.get(a.family ?? a.name) - order.get(b.family ?? b.name)) || (a.id - b.id));
}


/* ---------- stats ---------- */

function statValidation() {
    const left = POINT_BUY_TOTAL - pointsSpent();
    return {
        ok: left === 0,
        text: left === 0
            ? `${POINT_BUY_TOTAL} / ${POINT_BUY_TOTAL} POINTS SPENT`
            : left > 0 ? `${left} POINTS LEFT TO SPEND` : `${-left} POINTS OVER THE LIMIT`
    };
}

function renderStats() {
    els.statGrid.innerHTML = STAT_KEYS.map((key) => `
        <label class="sheet-stat ${attributeTier(state.stats[key])}">
            <span class="sheet-stat-key">${key}</span>
            <span class="sheet-stat-name">${STAT_NAMES[key]}</span>
            <input type="number" min="${STAT_MIN}" max="${STAT_MAX}" step="1"
                   value="${state.stats[key]}" data-stat="${key}" aria-label="${STAT_NAMES[key]}">
            <span class="sheet-stat-pct" data-pct="${key}">${state.stats[key] * 5}%</span>
        </label>
    `).join("");

    renderStatMeta();
}

// Color tiers mirror the Deepwell database so values read the same way on both pages.
function skillTier(value) {
    if (value === 0) return "tier-0";
    if (value < 40) return "tier-low";
    if (value < 60) return "tier-medium";
    if (value < 80) return "tier-high";
    if (value < 100) return "tier-very-high";
    return "tier-max";
}

function attributeTier(value) {
    if (value === 0) return "tier-0";
    if (value < 8) return "tier-low";
    if (value < 12) return "tier-medium";
    if (value < 16) return "tier-high";
    if (value < 20) return "tier-very-high";
    return "tier-max";
}

function renderStatMeta() {
    const validation = statValidation();
    els.statStatus.textContent = validation.text;
    els.statStatus.classList.toggle("is-ok", validation.ok);
    els.statStatus.classList.toggle("is-warn", !validation.ok);

    els.statHint.textContent =
        `Spend exactly ${POINT_BUY_TOTAL} points. Each statistic must be ${STAT_MIN} to ${STAT_MAX}.`;

    const derived = derivedValues();
    const meter = (value, max, breakpoint = null) => `
        <span class="sheet-meter" style="--pos: ${clamp((value / max) * 100, 0, 100)}%">
            ${breakpoint === null ? "" : `<span class="sheet-meter-break" style="--pos: ${clamp((breakpoint / max) * 100, 0, 100)}%"></span>`}
            <span class="sheet-meter-knob"></span>
        </span>`;

    els.derived.innerHTML = [
        ["HIT POINTS", derived.HP, "(STR + CON) / 2, rounded up", meter(derived.HP, STAT_MAX)],
        ["WILLPOWER", derived.WP, "Equal to POW", meter(derived.WP, STAT_MAX)],
        ["SANITY", derived.SAN, "POW x 5. Tick marks the Breaking Point", meter(derived.SAN, STAT_MAX * 5, derived.BP)],
        ["BREAKING POINT", derived.BP, "SAN - POW", ""]
    ].map(([label, value, note, bar]) => `
        <div class="sheet-derived-item">
            <span class="sheet-derived-label">${label}</span>
            <strong>${value}</strong>
            ${bar}
            <span class="sheet-derived-note">${note}</span>
        </div>
    `).join("");
}


/* ---------- skills ---------- */

function renderSkills() {
    enforceBonusLimits();

    const focused =  document.activeElement?.closest?.("[data-skill]");
    const focusKey = focused
        ? { id: focused.dataset.skill, act: focused.dataset.act }
        : null;

    const rows = [];
    const familyHeader = (familyName) => `
        <div class="sheet-skill-row is-family">
            <span class="sk-name">${escapeHtml(familyName.toUpperCase())}</span>
            <span class="sk-family-actions">
                <button type="button" class="sheet-mini" data-add-family="${escapeHtml(familyName)}">+ ADD SPECIALTY</button>
            </span>
        </div>
    `;

    // Families with no specialties yet still need a header so they can be added.
    const populatedFamilies = new Set(state.skills.filter((skill) => skill.family).map((skill) => skill.family));
    const ordered = [];
    SKILLS.filter((definition) => definition.specialty && !populatedFamilies.has(definition.name))
        .forEach((definition) => ordered.push({ header: definition.name }));
    sortedSkills().forEach((skill) => ordered.push({ skill }));
    ordered.sort((a, b) => {
        const nameA = a.header ?? (a.skill.family ?? a.skill.name);
        const nameB = b.header ?? (b.skill.family ?? b.skill.name);
        const diff = SKILLS.findIndex((s) => s.name === nameA) - SKILLS.findIndex((s) => s.name === nameB);
        if (diff) return diff;
        return (a.header ? -1 : 0) - (b.header ? -1 : 0) || (a.skill?.id ?? 0) - (b.skill?.id ?? 0);
    });

    const emitted = new Set();
    ordered.forEach(({ header, skill }) => {
        if (header) {
            rows.push(familyHeader(header));
            return;
        }

        const familyName = skill.family;
        if (familyName && !emitted.has(familyName)) {
            emitted.add(familyName);
            rows.push(familyHeader(familyName));
        }

        const total = skillTotal(skill);

        const nameCell = familyName
            ? `<span class="sk-name is-specialty">
                   <input type="text" value="${escapeHtml(skill.spec)}" maxlength="40"
                          placeholder="Specialty, e.g. ${escapeHtml(placeholderFor(familyName))}"
                          data-spec="${skill.id}" aria-label="${escapeHtml(familyName)} specialty">
                   <button type="button" class="sheet-mini danger" data-remove="${skill.id}"
                           aria-label="Remove this specialty">&times;</button>
               </span>`
            : `<span class="sk-name">${escapeHtml(skill.name)}</span>`;

        const canInc = canAddBonus(skill);
        const canDec = skill.bonus > 0;

        rows.push(`
            <div class="sheet-skill-row${skill.bonus > 0 ? " has-bonus" : ""}${skill.pkg !== null ? " has-role" : ""}" data-row="${skill.id}">
                ${nameCell}
                <span class="sk-base ${skillTier(skill.base)}">${skill.base}%</span>
                <span class="sk-role ${skill.pkg !== null ? skillTier(skill.pkg) : ""}">${skill.pkg !== null ? skill.pkg + "%" : "&mdash;"}</span>
                <span class="sk-bonus">
                    <button type="button" class="sheet-step" data-skill="${skill.id}" data-act="dec"
                            ${canDec ? "" : "disabled"} aria-label="Remove a bonus pick">&minus;</button>
                    <b>${skill.bonus > 0 ? "+" + skill.bonus * BONUS_STEP : "0"}</b>
                    <button type="button" class="sheet-step" data-skill="${skill.id}" data-act="inc"
                            ${canInc ? "" : "disabled"} aria-label="Add a bonus pick">+</button>
                </span>
                <span class="sk-total ${skillTier(total)}" data-total="${skill.id}">${total}%</span>
            </div>
        `);
    });

    els.skillList.innerHTML = rows.join("");

    if (focusKey) {
        const selector = `[data-skill="${focusKey.id}"][data-act="${focusKey.act}"]`;
        els.skillList.querySelector(selector)?.focus();
    }

    renderSkillStatus();
}

function placeholderFor(family) {
    return {
        "Art": "Painting",
        "Craft": "Electrician",
        "Foreign Language": "Russian",
        "Military Science": "Land",
        "Pilot": "Helicopter",
        "Science": "Biology"
    }[family] ?? "";
}

function renderSkillStatus() {
    const spent = bonusSpent();
    const ok = spent === BONUS_PICKS;
    els.skillStatus.textContent = `${spent} / ${BONUS_PICKS} BONUS PICKS USED`;
    els.skillStatus.classList.toggle("is-ok", ok);
    els.skillStatus.classList.toggle("is-warn", !ok);
}


/* ---------- bonds ---------- */

function syncBondCount() {
    const count = currentBondCount();
    while (state.bonds.length < count) state.bonds.push("");
    state.bonds.length = count;
}

function renderBonds() {
    syncBondCount();
    els.bondList.innerHTML = state.bonds.map((value, index) => `
        <label class="sheet-bond">
            <span class="sheet-bond-index">BOND ${index + 1}</span>
            <input type="text" value="${escapeHtml(value)}" maxlength="80"
                   placeholder="Who or what is this Bond?" data-bond="${index}">
            <span class="sheet-bond-score" data-bond-score>${state.stats.CHA}</span>
        </label>
    `).join("");
}

function updateBondScores() {
    els.bondList.querySelectorAll("[data-bond-score]").forEach((node) => {
        node.textContent = state.stats.CHA;
    });
}


/* ---------- affiliation ---------- */

// Foundation is split by office; every other playable faction is a single entry.
function collectAffiliations(factions) {
    const found = [];

    (factions.factions ?? [])
        .filter((faction) => String(faction.playability).toLowerCase() === "playable")
        .forEach((faction) => {
            if (Array.isArray(faction.offices) && faction.offices.length) {
                faction.offices.forEach((office) => {
                    found.push({
                        id: `${faction.id}/${office.name}`,
                        faction: faction.name,
                        department: office.name,
                        label: office.name
                    });
                });
            } else {
                found.push({
                    id: faction.id,
                    faction: faction.name,
                    department: "",
                    label: faction.name
                });
            }
        });

    return found;
}

function renderAffiliationSelect() {
    if (!state.affiliations.length) {
        els.affiliation.innerHTML = '<option value="">No playable factions available</option>';
        els.affiliation.disabled = true;
        return;
    }

    const options = ['<option value="">Select a department or faction...</option>'];
    const grouped = state.affiliations.filter((item) => item.department);
    const standalone = state.affiliations.filter((item) => !item.department);

    const groups = new Map();
    grouped.forEach((item) => {
        if (!groups.has(item.faction)) groups.set(item.faction, []);
        groups.get(item.faction).push(item);
    });

    const optionHtml = (item) =>
        `<option value="${escapeHtml(item.id)}">${escapeHtml(packageLabel(item))}</option>`;

    groups.forEach((items, faction) => {
        options.push(`<optgroup label="${escapeHtml(faction)}">`);
        items.forEach((item) => options.push(optionHtml(item)));
        options.push("</optgroup>");
    });
    standalone.forEach((item) => options.push(optionHtml(item)));

    els.affiliation.innerHTML = options.join("");
    els.affiliation.disabled = false;
}

function packageLabel(item) {
    return state.packages[item.id]?.label ?? item.label;
}

function renderAffiliationNote() {
    const selected = state.affiliation;
    if (!selected) {
        els.affiliationNote.textContent =
            "Choose a department (Foundation) or faction to apply its skill package. Only playable factions are listed.";
        return;
    }
    const name = packageLabel(selected);
    els.affiliationNote.textContent = state.packages[selected.id]
        ? `${name}: package skills are applied below.`
        : `${name} has no skill package yet, so only base skills and bonus picks apply.`;
}


/* ---------- output ---------- */

function validationIssues() {
    const issues = [];
    if (!els.name.value.trim()) issues.push("no name");
    if (!state.affiliation) issues.push("no department or faction");

    const stats = statValidation();
    if (!stats.ok) issues.push(stats.text.toLowerCase());

    const spent = bonusSpent();
    if (spent !== BONUS_PICKS) issues.push(`${spent}/${BONUS_PICKS} bonus picks used`);

    if (state.skills.some((skill) => skill.family && !skill.spec.trim())) {
        issues.push("specialty skill missing a specialty");
    }
    if (state.bonds.some((bond) => !bond.trim())) issues.push("unnamed bond");
    return issues;
}

function buildOutput() {
    const derived = derivedValues();
    const issues = validationIssues();
    const lines = [
        "DIE IN THE DARK - AGENT SHEET",
        `VALID: ${issues.length ? "NO (" + issues.join("; ") + ")" : "YES"}`,
        "",
        `NAME: ${singleLine(els.name.value)}`,
        `AGE: ${singleLine(els.age.value)}`,
        `FACTION: ${state.affiliation ? state.affiliation.faction : ""}`,
        `DEPARTMENT: ${state.affiliation ? state.affiliation.department : ""}`,
        `BLURB: ${singleLine(els.blurb.value)}`,
        "",
        "[STATS]",
        ...STAT_KEYS.map((key) => `${key}: ${state.stats[key]}`),
        `HP: ${derived.HP}`,
        `WP: ${derived.WP}`,
        `SAN: ${derived.SAN}`,
        `BP: ${derived.BP}`,
        "",
        "[SKILLS]",
        ...sortedSkills()
            .filter((skill) => skillTotal(skill) > 0)
            .map((skill) => `${skillLabel(skill)}: ${skillTotal(skill)}`),
        "",
        "[BONDS]",
        ...state.bonds.map((bond) => `${singleLine(bond) || "(unnamed)"}: ${state.stats.CHA}`)
    ];

    els.output.value = lines.join("\n");
}


/* ---------- events ---------- */

function onStatInput(event) {
    const input = event.target.closest("[data-stat]");
    if (!input) return;

    const key = input.dataset.stat;
    const value = clamp(Math.round(Number(input.value) || STAT_MIN), STAT_MIN, STAT_MAX);
    state.stats[key] = value;

    const pct = els.statGrid.querySelector(`[data-pct="${key}"]`);
    if (pct) pct.textContent = `${value * 5}%`;

    const card = input.closest(".sheet-stat");
    card.className = `sheet-stat ${attributeTier(value)}`;

    renderStatMeta();
    updateBondScores();
    buildOutput();
}

function onStatChange(event) {
    const input = event.target.closest("[data-stat]");
    if (input) input.value = state.stats[input.dataset.stat];
}

function onAffiliationChange() {
    const id = els.affiliation.value;
    state.affiliation = state.affiliations.find((item) => item.id === id) ?? null;
    applyPackage(state.affiliation);
    renderAffiliationNote();
    renderSkills();
    renderBonds();
    buildOutput();
}

function onSkillClick(event) {
    const addButton = event.target.closest("[data-add-family]");
    if (addButton) {
        const definition = SKILL_BY_NAME.get(addButton.dataset.addFamily.toLowerCase());
        state.skills.push(makeSkill(definition));
        renderSkills();
        buildOutput();
        const inputs = els.skillList.querySelectorAll("[data-spec]");
        const added = [...inputs].find((input) => Number(input.dataset.spec) === state.nextId - 1);
        added?.focus();
        return;
    }

    const removeButton = event.target.closest("[data-remove]");
    if (removeButton) {
        const id = Number(removeButton.dataset.remove);
        state.skills = state.skills.filter((skill) => skill.id !== id);
        renderSkills();
        buildOutput();
        return;
    }

    const step = event.target.closest("[data-act]");
    if (!step || step.disabled) return;

    const skill = state.skills.find((item) => item.id === Number(step.dataset.skill));
    if (!skill) return;

    if (step.dataset.act === "inc" && canAddBonus(skill)) {
        skill.bonus += 1;
    } else if (step.dataset.act === "dec" && skill.bonus > 0) {
        skill.bonus -= 1;
    }
    renderSkills();
    buildOutput();
}

function onSkillInput(event) {
    const input = event.target.closest("[data-spec]");
    if (!input) return;

    const skill = state.skills.find((item) => item.id === Number(input.dataset.spec));
    if (skill) skill.spec = input.value;
    buildOutput();
}

function onBondInput(event) {
    const input = event.target.closest("[data-bond]");
    if (!input) return;
    state.bonds[Number(input.dataset.bond)] = input.value;
    buildOutput();
}

async function onCopy() {
    try {
        await navigator.clipboard.writeText(els.output.value);
        els.copyStatus.textContent = "COPIED";
    } catch {
        els.output.select();
        els.copyStatus.textContent = "PRESS CTRL+C TO COPY";
    }
    els.copyStatus.classList.add("is-ok");
    setTimeout(() => {
        els.copyStatus.textContent = "";
        els.copyStatus.classList.remove("is-ok");
    }, 2500);
}

function showError(message) {
    els.error.textContent = message;
    els.error.hidden = false;
}


/* ---------- startup ---------- */

async function loadJson(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json();
}

async function loadAffiliations() {
    const [factions, packages] = await Promise.allSettled([
        loadJson("json/factions.json"),
        loadJson("json/sheet-packages.json")
    ]);

    if (packages.status === "fulfilled") {
        state.packages = packages.value.packages ?? {};
        state.defaultPackage = packages.value.default ?? state.defaultPackage;
    } else {
        console.error(packages.reason);
        showError("Could not load skill packages. Selections will only grant base skills.");
    }

    if (factions.status === "fulfilled") {
        state.affiliations = collectAffiliations(factions.value);
    } else {
        console.error(factions.reason);
        showError("Could not load the list of playable factions.");
    }

    renderAffiliationSelect();
}

function init() {
    initSkills();
    renderStats();
    renderSkills();
    renderBonds();
    renderAffiliationNote();
    buildOutput();

    els.statGrid.addEventListener("input", onStatInput);
    els.statGrid.addEventListener("change", onStatChange);
    els.affiliation.addEventListener("change", onAffiliationChange);
    els.skillList.addEventListener("click", onSkillClick);
    els.skillList.addEventListener("input", onSkillInput);
    els.bondList.addEventListener("input", onBondInput);
    els.copy.addEventListener("click", onCopy);
    [els.name, els.age, els.blurb].forEach((field) => {
        field.addEventListener("input", buildOutput);
    });

    loadAffiliations();
}

init();
