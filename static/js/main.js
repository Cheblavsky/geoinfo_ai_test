const state = {
    metadata: null,
    map: null,
    layerControl: null,
    baseLayer: null,
    boundaryLayer: null,
    pointsLayer: null,
    surfaceLayerGroup: null,
    surfaceOverlay: null,
};

function setStatus(message, tone = "info") {
    const statusBox = document.getElementById("status-box");
    statusBox.textContent = message;
    statusBox.className = `status-box ${tone}`;
}

function setWarning(message = "") {
    const warningBox = document.getElementById("warning-box");
    if (message) {
        warningBox.textContent = message;
        warningBox.classList.remove("hidden");
    } else {
        warningBox.textContent = "";
        warningBox.classList.add("hidden");
    }
}

async function fetchJson(url) {
    const response = await fetch(url);
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error || "Request failed.");
    }
    return payload;
}

function createMap() {
    state.baseLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
    });

    state.boundaryLayer = L.geoJSON(null, {
        style: {
            color: "#6b21a8",
            weight: 3,
            fillColor: "#d8b4fe",
            fillOpacity: 0.08,
        },
    });

    state.pointsLayer = L.layerGroup();
    state.surfaceLayerGroup = L.layerGroup();

    state.map = L.map("map", {
        zoomControl: true,
        layers: [state.baseLayer, state.boundaryLayer, state.pointsLayer, state.surfaceLayerGroup],
    });

    state.layerControl = L.control.layers(
        { OpenStreetMap: state.baseLayer },
        {
            Boundary: state.boundaryLayer,
            "Well points": state.pointsLayer,
            "Interpolation surface": state.surfaceLayerGroup,
        },
        { collapsed: false }
    ).addTo(state.map);

    state.map.setView([46.25, 20.15], 12);
}

function fillMetadata(metadata) {
    document.getElementById("coord-x").textContent = metadata.coordinate_columns.x || "Not detected";
    document.getElementById("coord-y").textContent = metadata.coordinate_columns.y || "Not detected";
    document.getElementById("time-source").textContent = metadata.time_column || "Not detected";
    document.getElementById("well-source").textContent = metadata.well_column || "Generated labels";
}

function renderLegend(targetId, legendItems, emptyMessage) {
    const container = document.getElementById(targetId);
    if (!legendItems || legendItems.length === 0) {
        container.className = "legend-scale empty-legend";
        container.textContent = emptyMessage;
        return;
    }

    container.className = "legend-scale";
    container.innerHTML = legendItems
        .map(
            (item) => `
                <div class="legend-item">
                    <span class="legend-swatch" style="background:${item.color}"></span>
                    <span>${item.value}</span>
                </div>
            `
        )
        .join("");
}

function renderMapLegend(pointLegend, surfaceLegend) {
    const mapLegend = document.getElementById("map-legend");
    const pointSection = pointLegend && pointLegend.length
        ? `
            <div class="legend-block">
                <h3>Well Points</h3>
                ${pointLegend
                    .map(
                        (item) => `
                            <div class="legend-item">
                                <span class="legend-swatch" style="background:${item.color}"></span>
                                <span>${item.value}</span>
                            </div>
                        `
                    )
                    .join("")}
            </div>
        `
        : '<div class="legend-block"><div class="empty-legend">No point data loaded yet.</div></div>';

    const surfaceSection = surfaceLegend && surfaceLegend.length
        ? `
            <div class="legend-block">
                <h3>Interpolated Surface</h3>
                ${surfaceLegend
                    .map(
                        (item) => `
                            <div class="legend-item">
                                <span class="legend-swatch" style="background:${item.color}"></span>
                                <span>${item.value}</span>
                            </div>
                        `
                    )
                    .join("")}
            </div>
        `
        : '<div class="legend-block"><div class="empty-legend">No surface loaded yet.</div></div>';

    mapLegend.innerHTML = `<h3>Map Legend</h3>${pointSection}${surfaceSection}`;
}

function updateTimeOptions(parameter, preferredTime = null) {
    const timeSelect = document.getElementById("time-select");
    const options = state.metadata.available_times_by_parameter[parameter] || [];

    timeSelect.innerHTML = "";
    options.forEach((option) => {
        const element = document.createElement("option");
        element.value = option.key;
        element.textContent = option.point_count ? `${option.label} (${option.point_count} values)` : option.label;
        timeSelect.appendChild(element);
    });

    const validKeys = new Set(options.map((option) => option.key));
    if (preferredTime && validKeys.has(preferredTime)) {
        timeSelect.value = preferredTime;
    } else if (options.length > 0) {
        timeSelect.value = options[options.length - 1].key;
    }

    timeSelect.disabled = options.length === 0;
}

function fillParameterOptions(metadata) {
    const parameterSelect = document.getElementById("parameter-select");
    parameterSelect.innerHTML = "";

    metadata.parameters.forEach((parameter) => {
        const option = document.createElement("option");
        option.value = parameter;
        option.textContent = parameter;
        parameterSelect.appendChild(option);
    });

    if (metadata.default_parameter) {
        parameterSelect.value = metadata.default_parameter;
    }
}

function renderBoundary(boundaryGeojson, boundaryBounds) {
    state.boundaryLayer.clearLayers();
    state.boundaryLayer.addData(boundaryGeojson);
    if (boundaryBounds) {
        state.map.fitBounds(boundaryBounds, { padding: [16, 16] });
    }
}

function buildPopup(properties) {
    return `
        <div class="popup-card">
            <h3 class="popup-title">${properties.well}</h3>
            <p class="popup-meta"><strong>${properties.parameter}:</strong> ${properties.value}</p>
            <p class="popup-meta"><strong>Time:</strong> ${properties.time}</p>
            <p class="popup-meta"><strong>Samples averaged:</strong> ${properties.sample_count}</p>
        </div>
    `;
}

function renderPoints(payload) {
    state.pointsLayer.clearLayers();

    const geojsonLayer = L.geoJSON(payload, {
        pointToLayer: (feature, latlng) => {
            const { color } = feature.properties;
            return L.circleMarker(latlng, {
                radius: 7,
                color: "#ffffff",
                weight: 1.5,
                fillColor: color,
                fillOpacity: 0.96,
            });
        },
        onEachFeature: (feature, layer) => {
            layer.bindPopup(buildPopup(feature.properties));
        },
    });

    geojsonLayer.addTo(state.pointsLayer);

    const stats = payload.stats || {};
    document.getElementById("summary-count").textContent = stats.point_count ?? 0;
    renderLegend("point-legend", stats.legend || [], "No point values available.");
    return stats.legend || [];
}

function updateSummary(parameter, timeLabel) {
    document.getElementById("summary-parameter").textContent = parameter || "-";
    document.getElementById("summary-time").textContent = timeLabel || "-";
}

function applySurfaceOpacity() {
    const opacity = Number(document.getElementById("opacity-slider").value) / 100;
    document.getElementById("opacity-value").textContent = `${Math.round(opacity * 100)}%`;
    if (state.surfaceOverlay) {
        state.surfaceOverlay.setOpacity(opacity);
    }
}

function renderSurface(payload) {
    state.surfaceLayerGroup.clearLayers();
    state.surfaceOverlay = null;

    if (!payload.overlay_url) {
        renderLegend("surface-legend", [], payload.warning || "No interpolation surface available.");
        return [];
    }

    const opacity = Number(document.getElementById("opacity-slider").value) / 100;
    state.surfaceOverlay = L.imageOverlay(payload.overlay_url, payload.bounds, { opacity });
    state.surfaceOverlay.addTo(state.surfaceLayerGroup);

    renderLegend("surface-legend", payload.legend || [], "No interpolation legend available.");
    return payload.legend || [];
}

async function refreshDashboard(forceInterpolation = true) {
    const parameter = document.getElementById("parameter-select").value;
    const timeKey = document.getElementById("time-select").value;

    if (!parameter || !timeKey) {
        setStatus("Choose a parameter and a time value to continue.", "info");
        return;
    }

    const timeOptions = state.metadata.available_times_by_parameter[parameter] || [];
    const timeInfo = timeOptions.find((option) => option.key === timeKey);

    document.getElementById("refresh-btn").disabled = true;
    updateSummary(parameter, timeInfo ? timeInfo.label : timeKey);
    setWarning("");
    setStatus("Loading well points and interpolation...", "info");

    try {
        const pointPayload = await fetchJson(`/api/data?parameter=${encodeURIComponent(parameter)}&time=${encodeURIComponent(timeKey)}`);
        const pointLegend = renderPoints(pointPayload);

        let surfaceLegend = [];
        if (forceInterpolation) {
            const interpolationPayload = await fetchJson(`/api/interpolation?parameter=${encodeURIComponent(parameter)}&time=${encodeURIComponent(timeKey)}`);
            surfaceLegend = renderSurface(interpolationPayload);
            if (interpolationPayload.warning) {
                setWarning(interpolationPayload.warning);
            }
            setStatus(
                interpolationPayload.overlay_url
                    ? `Loaded ${pointPayload.stats.point_count} wells and refreshed the ${interpolationPayload.method.toUpperCase()} surface.`
                    : `Loaded ${pointPayload.stats.point_count} wells. Interpolation is unavailable for this selection.`,
                interpolationPayload.overlay_url ? "success" : "info"
            );
        }

        renderMapLegend(pointLegend, surfaceLegend);
    } catch (error) {
        console.error(error);
        setWarning(error.message);
        setStatus("Something went wrong while updating the map.", "error");
        renderLegend("surface-legend", [], "No interpolation surface available.");
        renderMapLegend([], []);
    } finally {
        document.getElementById("refresh-btn").disabled = false;
    }
}

async function initializeDashboard() {
    createMap();
    applySurfaceOpacity();
    setStatus("Loading dashboard metadata...", "info");

    try {
        const metadata = await fetchJson("/api/metadata");
        state.metadata = metadata;

        fillMetadata(metadata);
        fillParameterOptions(metadata);
        updateTimeOptions(metadata.default_parameter, metadata.default_time);
        renderBoundary(metadata.boundary_geojson, metadata.boundary_bounds);

        setStatus("Metadata loaded. Building the first map view...", "success");
        await refreshDashboard(true);
    } catch (error) {
        console.error(error);
        setWarning(error.message);
        setStatus("The dashboard could not be initialized.", "error");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initializeDashboard();

    document.getElementById("parameter-select").addEventListener("change", async (event) => {
        const parameter = event.target.value;
        updateTimeOptions(parameter);
        await refreshDashboard(true);
    });

    document.getElementById("time-select").addEventListener("change", async () => {
        await refreshDashboard(true);
    });

    document.getElementById("refresh-btn").addEventListener("click", async () => {
        await refreshDashboard(true);
    });

    document.getElementById("opacity-slider").addEventListener("input", () => {
        applySurfaceOpacity();
    });
});
