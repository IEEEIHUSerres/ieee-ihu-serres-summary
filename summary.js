'use strict';


function getConfig() {
    return {
        defaultThumbnail: "ieee.jpeg",
        defaultFile: "./summaryData.csv"
    }
}

function parseSummary(csvRawFile, defaultThumbnail) {
    const rows = csvRawFile.split('\n');

    // Remove the first row, contains the headers
    rows.shift();

    // Reverse list, to remove final line
    const reversedRows = rows.reverse();

    // Remove the first row, contains empty line
    reversedRows.shift();

    return reversedRows.map(value => parseSummaryItem(value, defaultThumbnail));
}

function parseSummaryItem(summaryItem, defaultThumbnail) {
    const summaryArrayData = summaryItem.split(';');

    return {
        title: summaryArrayData[0],
        date: summaryArrayData[1],
        type: summaryArrayData[2],
        thumbnail: ((summaryArrayData[3].length <= 1))
            ? `./img/${defaultThumbnail}`
            : `./img/${summaryArrayData[3]}`,
    };
}

function buildSummaryItemHTML(action) {
    const title = action.title;
    const date = action.date;
    const type = action.type;
    const thumbnail = action.thumbnail;

    return `<div class="summary-item text-center col-md-12 col-lg-4">
                <div style="margin: 20px">
                    <div class="summary-item-thumbnail">
                        <img src="${thumbnail}" alt="Thumbnail" class="rounded-circle col-12"/>
                    </div>
                    <div class="summary-item-info">
                        <h2 class="action-title">${title}</h2>
                        <h3 class="action-date">${date}</h3>
                        <h5 class="action-type">${type}</h5>
                    </div>
                </div>
            </div>`;
}

function renderSummary(config) {
    if (typeof config === "undefined") {
        config = getConfig();
    }

    if (typeof config.defaultThumbnail === "undefined") {
        config.defaultThumbnail = getConfig().defaultThumbnail
    }

    if (typeof config.defaultFile === "undefined") {
        config.defaultFile = getConfig().defaultFile
    }

    const xhr = new XMLHttpRequest();

    xhr.open('GET', config.defaultFile);

    xhr.onload = function () {
        if (xhr.status === 200) {
            parseSummary(xhr.responseText, config.defaultThumbnail)
                .forEach((summaryItem) => {
                    document.getElementById("summaryPlaceHolder").innerHTML += buildSummaryItemHTML(summaryItem);
                });
        } else {
            alert('Request failed.  Returned status of ' + xhr.status);
        }
    };

    xhr.send();
}
