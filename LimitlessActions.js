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

    // Load action information from storage
    const storageData = {};
    const actionsConfig = [
        {
            name: "Interested",
            icon: "fa-heart",
            color: "#2E7D4C",
            storageKey: "interestedOrganizers"
        },
        {
            name: "No Prize",
            icon: "fa-dollar-sign",
            color: "#D55E00",
            storageKey: "noCashPrizeOrganizers"
        },
        {
            name: "Hard Time",
            icon: "fa-clock",
            color: "#B23A6D",
            storageKey: "difficultTimeOrganizers"
        },
        {
            name: "Special Format",
            icon: "fa-gamepad",
            color: "#6A0DAD",
            storageKey: "specificFormatOrganizers"
        },
        {
            name: "Entry Fee",
            icon: "fa-ticket-alt",
            color: "#2C5A83",
            storageKey: "entryFeeOrganizers"
        }
    ];

    actionsConfig.forEach(action => {
        storageData[action.storageKey] = JSON.parse(localStorage.getItem(action.storageKey) || "{}");
    });

    function saveActionData(action) {
        localStorage.setItem(action.storageKey, JSON.stringify(storageData[action.storageKey]));
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
                badge.innerHTML = `<i class="fas ${action.icon}"></i> ${action.name}`;

                const removeButton = document.createElement("span");
                removeButton.className = "remove-badge";
                removeButton.innerHTML = "&times;";
                removeButton.onclick = () => {
                    document.querySelectorAll(`tr[data-organizer="${organizer}"] .badge-container .badge[data-action="${action.storageKey}"]`).forEach(b => b.remove());
                    delete storageData[action.storageKey][organizer];
                    saveActionData(action);
                    console.log(`[Limitless Actions] Badge "${action.name}" removed for organizer "${organizer}".`);
                };

                badge.appendChild(removeButton);
                badgeContainer.appendChild(badge);
            }
        });
    }

    function addActionColumnToTable(table) {
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
                if (organizer && storageData[action.storageKey][organizer]) {
                    applyBadgeToOrganizer(organizer, action);
                }
            });

            actionsConfig.forEach(action => {
                const actionButton = document.createElement("button");
                actionButton.className = `fas ${action.icon} action-button`;
                actionButton.title = action.name;

                actionButton.addEventListener("click", () => {
                    if (!storageData[action.storageKey][organizer]) {
                        storageData[action.storageKey][organizer] = true;
                        saveActionData(action);
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

    function addImportExportButtons() {
        const filterVisibleDiv = document.querySelector(".filter-visible");
        if (filterVisibleDiv) {
            const exportButton = document.createElement("button");
            exportButton.textContent = "Export Data";
            exportButton.className = "regular small import-export-button";
            exportButton.addEventListener("click", () => {
                const dataToExport = {};
                actionsConfig.forEach(action => {
                    dataToExport[action.storageKey] = storageData[action.storageKey];
                });
                const dataStr = JSON.stringify(dataToExport, null, 2);
                prompt("Here are your exported data:", dataStr);
            });

            const importButton = document.createElement("button");
            importButton.textContent = "Import Data";
            importButton.className = "regular small import-export-button";
            importButton.addEventListener("click", () => {
                const dataStr = prompt("Paste your exported data here:");
                if (dataStr) {
                    try {
                        const importedData = JSON.parse(dataStr);
                        actionsConfig.forEach(action => {
                            if (importedData[action.storageKey]) {
                                storageData[action.storageKey] = importedData[action.storageKey];
                                saveActionData(action);
                                Object.keys(importedData[action.storageKey]).forEach(organizer => {
                                    applyBadgeToOrganizer(organizer, action);
                                });
                            }
                        });
                        alert("Data imported successfully!");
                    } catch (e) {
                        alert("Error importing data. Please check the format.");
                    }
                }
            });

            filterVisibleDiv.appendChild(exportButton);
            filterVisibleDiv.appendChild(importButton);
            console.log("[Limitless Actions] Import and Export buttons added to filter-visible div.");
        } else {
            console.warn("[Limitless Actions] The .filter-visible div is not found.");
        }
    }

    document.querySelectorAll("table").forEach((table, index) => {
        addActionColumnToTable(table);
        console.log(`[Limitless Actions] Table ${index + 1} processed.`);
    });

    addImportExportButtons();

    console.log("[Limitless Actions] Script completed.");
})();
