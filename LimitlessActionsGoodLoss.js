// ==UserScript==
// @name         Limitless Actions
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add badges for tournament actions, managed by organizer. Add buttons to import and export stored data within the filter-visible div, applying the "regular small" class for styling. Limits .container width to 1920px and handles missing badgeContainer errors.
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Configuration of pages and actions for tournaments
    const pages = ["/tournaments"];
    const token = "";

    // Check if the current URL matches one of the configured pages
    if (!pages.some(page => window.location.href.includes(page))) {
        console.log("[Limitless Actions] The current URL does not match the configured pages. Exiting script.");
        return;
    }

    // Apply CSS style to make the `container` class full-width with a max-width
    const style = document.createElement("style");
    style.innerHTML = `
        .container {
            width: 100% !important;
            max-width: 1920px !important;
            margin: 0 auto !important; /* Center the content */
            padding-left: 0 !important;
            padding-right: 0 !important;
        }

        .action-button {
            border: none;
            background: transparent;
            color: black;
            cursor: pointer;
            padding: 4px;
            margin: 4px;
            transition: transform 0.2s ease, background-color 0.2s ease, color 0.2s ease;
        }

        .action-button:hover {
            transform: scale(1.2);
            background-color: rgba(0, 0, 0, 0.1);
            color: #333;
        }

        .badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 8px;
            margin: 2px;
            color: white;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
        }

        .badge i {
            margin-right: 4px;
        }

        .badge .remove-badge {
            margin-left: 8px;
            cursor: pointer;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);

    const postFormData = async (url, params) => {
        const formData = new FormData();

        // Ajouter les paramètres au FormData
        for (const key in params) {
            if (params.hasOwnProperty(key)) {
                formData.append(key, params[key]);
            }
        }

        // Effectuer la requête POST
        const response = await fetch(url, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Erreur HTTP : ${response.status}`);
        }

        return response.json(); // Retourner la réponse JSON
    };

    // Load action information from storage
    let storageData = {};
    const actionsConfig = [
        {
            name: "Interested",
            icon: "fa-heart",
            color: "#2E7D4C",
            storageKey: "LimitlessActions_Interested"
        },
        {
            name: "No Prize",
            icon: "fa-dollar-sign",
            color: "#D55E00",
            storageKey: "LimitlessActions_NoCash"
        },
        {
            name: "Hard Time",
            icon: "fa-clock",
            color: "#B23A6D",
            storageKey: "LimitlessActions_HardTime"
        },
        {
            name: "Special Format",
            icon: "fa-gamepad",
            color: "#6A0DAD",
            storageKey: "LimitlessActions_SpecialFormat"
        },
        {
            name: "Entry Fee",
            icon: "fa-ticket-alt",
            color: "#2C5A83",
            storageKey: "LimitlessActions_EntryFee"
        },
        {
            name: "Private",
            icon: "fa-lock",
            color: "#fe37d7",
            storageKey: "LimitlessActions_Private"
        }
    ];

    function saveActionData(action, organizer, value) {
        postFormData("https://goodloss.fr/api/tamperdata/update", {
            app: action.storageKey,
            token: token,
            key: organizer,
            value: value,
        });
        //localStorage.setItem(action.storageKey, JSON.stringify(storageData[action.storageKey]));
        console.log(`[Limitless Actions] Badge state for "${action.name}" saved.`);
    }

    function applyBadgeToOrganizer(organizer, action) {
        document.querySelectorAll(`tr[data-organizer="${organizer}"]`).forEach(row => {
            const badgeContainer = row.querySelector(".badge-container");
            if (!badgeContainer) {
                console.warn(`[Limitless Actions] badgeContainer missing for organizer "${organizer}".`);
                return;
            }

            if (!badgeContainer.querySelector(`.badge[data-action="${action.storageKey}"]`)) {
                const badge = document.createElement("span");
                badge.className = "badge";
                badge.style.backgroundColor = action.color;
                badge.setAttribute("data-action", action.storageKey);
                badge.innerHTML = `<i class="fas ${action.icon}"></i>`;

                const removeButton = document.createElement("span");
                removeButton.className = "remove-badge";
                removeButton.innerHTML = "&times;";
                removeButton.onclick = () => {
                    document.querySelectorAll(`tr[data-organizer="${organizer}"] .badge-container .badge[data-action="${action.storageKey}"]`).forEach(b => b.remove());
                    delete storageData[action.storageKey][organizer];
                    saveActionData(action, organizer, "false");
                    console.log(`[Limitless Actions] Badge "${action.name}" removed for organizer "${organizer}".`);
                };

                badge.appendChild(removeButton);
                badgeContainer.appendChild(badge);
            }
        });
    }

    function addActionColumnToTable(table) {
        console.log("ici", storageData);
        console.log("[Limitless Actions] Processing a table.");
        const headerRow = table.querySelector("tbody tr:first-child");
        if (headerRow) {
            const badgeHeader = document.createElement("th");
            badgeHeader.textContent = "Badges";
            headerRow.insertAdjacentElement("afterbegin", badgeHeader);

            const actionHeader = document.createElement("th");
            actionHeader.textContent = "Actions";
            headerRow.appendChild(actionHeader);
            console.log("[Limitless Actions] 'Badges' and 'Actions' columns added to header.");
        } else {
            console.log("[Limitless Actions] No first row found in tbody to add header.");
        }

        const rows = table.querySelectorAll("tbody tr:not(:first-child)");
        rows.forEach((row, index) => {
            const organizer = row.getAttribute("data-organizer");

            const badgeCell = document.createElement("td");
            const badgeContainer = document.createElement("div");
            badgeContainer.className = "badge-container";
            badgeCell.appendChild(badgeContainer);
            row.insertAdjacentElement("afterbegin", badgeCell);

            const actionCell = document.createElement("td");
            actionCell.classList.add("action-cell");

            actionsConfig.forEach(action => {
                if (organizer && storageData[action.storageKey][organizer] === "true") {
                    applyBadgeToOrganizer(organizer, action);
                }
            });

            actionsConfig.forEach(action => {
                const actionButton = document.createElement("button");
                actionButton.style.backgroundColor = action.color;
                actionButton.style.width = '32px';
                actionButton.className = `fas ${action.icon} action-button`;
                actionButton.title = action.name;

                actionButton.addEventListener("click", () => {
                    if (!storageData[action.storageKey][organizer]) {
                        storageData[action.storageKey][organizer] = true;
                        saveActionData(action, organizer, "true");
                        applyBadgeToOrganizer(organizer, action);
                        console.log(`[Limitless Actions] Badge "${action.name}" added for organizer "${organizer}".`);
                    }
                });

                actionCell.appendChild(actionButton);
            });

            row.appendChild(actionCell);
            console.log(`[Limitless Actions] Action buttons and badges added to row ${index + 1}.`);
        });
    }

    async function fetchStorageData() {
        let storageDataLocal = {};
        for (const action of actionsConfig) {
            const data = await postFormData("https://goodloss.fr/api/tamperdata/get", {
                app: action.storageKey,
                token: token
            });
            let dataFormatted = {};
            for (const d of data) {
                dataFormatted[d.sid] = d.value;
            }
            storageDataLocal[action.storageKey] = dataFormatted || {};
        }
        console.log(storageDataLocal);
        return storageDataLocal;
    }

    (async () => {
        try {
            storageData = await fetchStorageData();
            document.querySelectorAll("table").forEach((table, index) => {
                addActionColumnToTable(table);
                console.log(`[Limitless Actions] Table ${index + 1} processed.`);
            });

            console.log("[Limitless Actions] Script completed.");

        } catch (error) {
            console.error("Erreur lors de la requête :", error);
        }
    })();
})();
