'use strict';


function getConfig() {
    return {
        defaultThumbnail: "ieee.jpeg",
        defaultFile: "./summaryData.csv"
    }
}

// Maps the first part of the CSV "Type" column to a display category.
const CATEGORIES = [
    {key: "competitions", label: "Competitions", match: /competition/i},
    {key: "awards", label: "Awards", match: /award/i},
    {key: "workshops", label: "Workshops & Lectures", match: /workshop|lecture/i},
    {key: "congresses", label: "Congresses & Schools", match: /congress|school|section event|camp/i},
    {key: "milestones", label: "Milestones", match: /foundation/i},
    {key: "events", label: "Events & Expos", match: /.*/},
];

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function parseSummary(csvRawFile, defaultThumbnail) {
    return csvRawFile
        .split(/\r?\n/)
        .slice(1) // Remove the header row
        .filter(row => row.trim() !== "")
        .map((row, index) => parseSummaryItem(row, index, defaultThumbnail))
        .sort((a, b) => b.sortKey - a.sortKey || b.index - a.index);
}

function parseSummaryItem(summaryItem, index, defaultThumbnail) {
    const [title = "", date = "", type = "", thumbnail = ""] = summaryItem.split(';').map(value => value.trim());
    const [kind = "", role = ""] = type.split(/<br\s*\/?>/i).map(value => value.trim());

    const year = Number((date.match(/\d{4}/) || [0])[0]);
    const month = MONTHS.indexOf(date.slice(0, 3).toLowerCase());

    return {
        index,
        title,
        date,
        year,
        sortKey: year * 12 + Math.max(month, 0),
        kind,
        role,
        organised: /organi[sz]er/i.test(role),
        category: CATEGORIES.find(category => category.match.test(kind)),
        thumbnail: `./img/${thumbnail.length <= 1 ? defaultThumbnail : thumbnail}`,
    };
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

function buildSummaryItemHTML(action) {
    const card = createElement("li", "card");
    card.dataset.cat = action.category.key;

    const thumbnail = createElement("img", "card__thumb");
    thumbnail.src = action.thumbnail;
    thumbnail.alt = "";
    thumbnail.loading = "lazy";
    thumbnail.width = 64;
    thumbnail.height = 64;

    const body = createElement("div", "card__body");

    const meta = createElement("p", "card__meta");
    meta.append(createElement("span", "card__cat", action.kind), ` · ${action.date}`);

    body.append(meta, createElement("h3", "card__title", action.title));

    if (action.role) {
        const roleClass = action.organised ? "card__role card__role--organised" : "card__role";
        body.append(createElement("span", roleClass, action.role));
    }

    card.append(thumbnail, body);

    return card;
}

function renderStats(items) {
    const years = items.map(item => item.year).filter(Boolean);
    const stats = {
        total: items.length,
        years: years.length ? Math.max(...years) - Math.min(...years) + 1 : 0,
        organised: items.filter(item => item.organised).length,
        awards: items.filter(item => item.category.key === "awards").length,
    };

    Object.entries(stats).forEach(([key, value]) => {
        document.querySelector(`[data-stat="${key}"]`).textContent = value;
    });
}

function renderFilters(items, state, onChange) {
    const container = document.getElementById("filters");
    const options = [{key: "all", label: "All"}, ...CATEGORIES]
        .map(category => ({
            ...category,
            count: category.key === "all"
                ? items.length
                : items.filter(item => item.category.key === category.key).length,
        }))
        .filter(option => option.count > 0);

    container.replaceChildren(...options.map(option => {
        const chip = createElement("button", "chip");
        chip.type = "button";
        chip.dataset.cat = option.key;
        chip.setAttribute("aria-pressed", String(state.category === option.key));

        if (option.key !== "all") {
            chip.append(createElement("span", "chip__dot"));
        }

        chip.append(option.label, createElement("span", "chip__count", option.count));

        chip.addEventListener("click", () => {
            state.category = option.key;
            container.querySelectorAll(".chip").forEach(other => {
                other.setAttribute("aria-pressed", String(other === chip));
            });
            onChange();
        });

        return chip;
    }));
}

function renderTimeline(items, state) {
    const placeholder = document.getElementById("summaryPlaceHolder");
    const query = state.query.trim().toLowerCase();

    const visible = items.filter(item =>
        (state.category === "all" || item.category.key === state.category) &&
        (!query || `${item.title} ${item.kind} ${item.role} ${item.date}`.toLowerCase().includes(query))
    );

    document.getElementById("result-count").textContent = visible.length === items.length
        ? ""
        : `Showing ${visible.length} of ${items.length} activities`;

    if (visible.length === 0) {
        placeholder.replaceChildren(createElement("p", "state", "No activities match your search."));
        return;
    }

    const byYear = new Map();
    visible.forEach(item => {
        if (!byYear.has(item.year)) {
            byYear.set(item.year, []);
        }
        byYear.get(item.year).push(item);
    });

    placeholder.replaceChildren(...[...byYear].map(([year, yearItems]) => {
        const section = createElement("section", "year");
        section.setAttribute("aria-label", String(year));

        const label = createElement("h2", "year__label", year || "Undated");
        label.append(createElement("span", "year__count",
            `${yearItems.length} ${yearItems.length === 1 ? "activity" : "activities"}`));

        const list = createElement("ol", "year__items");
        list.append(...yearItems.map(buildSummaryItemHTML));

        section.append(label, list);

        return section;
    }));
}

async function renderSummary(config) {
    config = {...getConfig(), ...config};

    const placeholder = document.getElementById("summaryPlaceHolder");

    try {
        const response = await fetch(config.defaultFile);

        if (!response.ok) {
            throw new Error(`Request failed. Returned status of ${response.status}`);
        }

        const items = parseSummary(await response.text(), config.defaultThumbnail);
        const state = {category: "all", query: ""};
        const update = () => renderTimeline(items, state);

        renderStats(items);
        renderFilters(items, state, update);
        update();

        document.getElementById("search").addEventListener("input", event => {
            state.query = event.target.value;
            update();
        });
    } catch (error) {
        placeholder.replaceChildren(createElement("p", "state", `Could not load activities. ${error.message}`));
    }
}

document.addEventListener("DOMContentLoaded", () => renderSummary());
