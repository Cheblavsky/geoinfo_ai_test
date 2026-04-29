const state = {
    metadata: null,
    map: null,
    layerControl: null,
    baseLayer: null,
    boundaryLayer: null,
    pointsLayer: null,
    surfaceLayerGroup: null,
    surfaceOverlay: null,
    currentLanguage: window.DashboardI18n.defaultLanguage,
    currentParameter: null,
    currentTimeKey: null,
    currentPointPayload: null,
    currentSurfacePayload: null,
    currentPointLegend: [],
    currentSurfaceLegend: [],
    currentSummary: {
        parameter: "-",
        time: "-",
        visibleWells: "0",
        method: "-",
        min: "-",
        max: "-",
    },
    statusDescriptor: null,
    warningDescriptor: null,
};

function t(key, params = {}) {
    return window.DashboardI18n.t(state.currentLanguage, key, params);
}

function descriptorToText(descriptor) {
    if (!descriptor) {
        return "";
    }
    if (descriptor.kind === "raw") {
        return descriptor.message || "";
    }
    return t(descriptor.key, descriptor.params || {});
}

function setStatusContent(message, tone = "info") {
    const statusBox = document.getElementById("status-box");
    statusBox.textContent = message;
    statusBox.className = `status-box ${tone}`;
}

function setStatusByKey(key, tone = "info", params = {}) {
    state.statusDescriptor = { kind: "key", key, params, tone };
    setStatusContent(descriptorToText(state.statusDescriptor), tone);
}

function reapplyStatus() {
    if (!state.statusDescriptor) {
        return;
    }
    setStatusContent(descriptorToText(state.statusDescriptor), state.statusDescriptor.tone || "info");
}

function setWarningContent(message = "") {
    const warningBox = document.getElementById("warning-box");
    if (message) {
        warningBox.textContent = message;
        warningBox.classList.remove("hidden");
    } else {
        warningBox.textContent = "";
        warningBox.classList.add("hidden");
    }
}

function setWarningByDescriptor(descriptor = null) {
    state.warningDescriptor = descriptor;
    setWarningContent(descriptorToText(descriptor));
}

function clearWarning() {
    setWarningByDescriptor(null);
}

function reapplyWarning() {
    setWarningContent(descriptorToText(state.warningDescriptor));
}

function translateServerMessage(message) {
    if (!message) {
        return null;
    }

    const minPointsMatch = message.match(/At least\s+(\d+)\s+valid wells are needed for interpolation\./i);
    if (minPointsMatch) {
        return { kind: "key", key: "warnings.minPoints", params: { count: minPointsMatch[1] } };
    }

    if (message.startsWith("No valid points were found")) {
        return { kind: "key", key: "warnings.noValidPoints" };
    }

    if (message.startsWith("Interpolation was created, but nothing overlapped")) {
        return { kind: "key", key: "warnings.maskEmpty" };
    }

    if (message.startsWith("Unknown parameter")) {
        return { kind: "key", key: "errors.unknownParameter" };
    }

    if (message.startsWith("Unknown time value")) {
        return { kind: "key", key: "errors.unknownTime" };
    }

    if (message.startsWith("Request failed")) {
        return { kind: "key", key: "messages.requestFailed" };
    }

    return { kind: "key", key: "errors.generic" };
}

async function fetchJson(url) {
    const response = await fetch(url);
    const payload = await response.json();
    if (!response.ok) {
        const message = payload.error || payload.warning || "";
        const error = new Error(message || "Request failed.");
        error.descriptor = translateServerMessage(message) || { kind: "key", key: "messages.requestFailed" };
        error.payload = payload;
        throw error;
    }
    return payload;
}

function applyStaticTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((element) => {
        element.textContent = t(element.dataset.i18n);
    });
    document.title = t("pageTitle");
}

function populateLanguageSelector() {
    const selector = document.getElementById("language-select");
    if (!selector) {
        return;
    }

    if (selector.options.length === 0) {
        Object.entries(window.DashboardI18n.languageLabels).forEach(([code, label]) => {
            const option = document.createElement("option");
            option.value = code;
            option.textContent = label;
            selector.appendChild(option);
        });
    }

    selector.value = state.currentLanguage;
}

function applyLanguageDirection() {
    const isRtl = window.DashboardI18n.isRtlLanguage(state.currentLanguage);
    document.documentElement.lang = state.currentLanguage;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.body.dir = isRtl ? "rtl" : "ltr";
}

function getSavedLanguage() {
    const savedLanguage = window.localStorage.getItem(window.DashboardI18n.storageKey);
    if (window.DashboardI18n.isSupportedLanguage(savedLanguage)) {
        return savedLanguage;
    }
    return window.DashboardI18n.defaultLanguage;
}

function formatTimeLabelFromKey(timeKey, fallbackLabel = "") {
    if (!timeKey) {
        return fallbackLabel;
    }

    const yearMonthDayMatch = timeKey.match(/^year_(.+)__month_(\d{2})__day_(\d{2})$/);
    if (yearMonthDayMatch) {
        return t("timeFormats.yearMonthDay", {
            yearLabel: t("timeWords.year"),
            monthLabel: t("timeWords.month"),
            dayLabel: t("timeWords.day"),
            year: yearMonthDayMatch[1],
            month: yearMonthDayMatch[2],
            day: yearMonthDayMatch[3],
        });
    }

    const yearMonthMatch = timeKey.match(/^year_(.+)__month_(\d{2})$/);
    if (yearMonthMatch) {
        return t("timeFormats.yearMonth", {
            yearLabel: t("timeWords.year"),
            monthLabel: t("timeWords.month"),
            year: yearMonthMatch[1],
            month: yearMonthMatch[2],
        });
    }

    const yearOnlyMatch = timeKey.match(/^year_(.+)$/);
    if (yearOnlyMatch) {
        return t("timeFormats.yearOnly", {
            yearLabel: t("timeWords.year"),
            year: yearOnlyMatch[1],
        });
    }

    return fallbackLabel || timeKey;
}

function getTimeInfo(parameter = state.currentParameter, timeKey = state.currentTimeKey) {
    if (!state.metadata || !parameter || !timeKey) {
        return null;
    }
    const options = state.metadata.available_times_by_parameter[parameter] || [];
    return options.find((option) => option.key === timeKey) || null;
}

function getLocalizedTimeLabel(timeInfo) {
    if (!timeInfo) {
        return "";
    }
    return formatTimeLabelFromKey(timeInfo.key, timeInfo.label);
}

function formatTimeOptionLabel(option) {
    const label = getLocalizedTimeLabel(option);
    if (option.point_count) {
        return t("messages.valuesCount", { label, count: option.point_count });
    }
    return label;
}

function buildLayerControl() {
    if (!state.map) {
        return;
    }

    if (state.layerControl) {
        state.map.removeControl(state.layerControl);
    }

    state.layerControl = L.control.layers(
        { [t("layers.openStreetMap")]: state.baseLayer },
        {
            [t("layers.boundary")]: state.boundaryLayer,
            [t("layers.wellPoints")]: state.pointsLayer,
            [t("layers.surface")]: state.surfaceLayerGroup,
        },
        { collapsed: false }
    ).addTo(state.map);
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

    buildLayerControl();
    state.map.setView([46.25, 20.15], 12);
}

function fillMetadata(metadata) {
    document.getElementById("coord-x").textContent = metadata.coordinate_columns.x || t("messages.notDetected");
    document.getElementById("coord-y").textContent = metadata.coordinate_columns.y || t("messages.notDetected");
    document.getElementById("time-source").textContent = metadata.time_column || t("messages.notDetected");
    document.getElementById("well-source").textContent = metadata.well_column || t("messages.generatedLabels");
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

function renderMapLegend(pointLegend = [], surfaceLegend = []) {
    const mapLegend = document.getElementById("map-legend");
    const pointSection = pointLegend.length
        ? `
            <div class="legend-block">
                <h3>${t("legend.points")}</h3>
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
        : `<div class="legend-block"><div class="empty-legend">${t("messages.noPointDataYet")}</div></div>`;

    const surfaceSection = surfaceLegend.length
        ? `
            <div class="legend-block">
                <h3>${t("legend.surface")}</h3>
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
        : `<div class="legend-block"><div class="empty-legend">${t("messages.noSurfaceLoadedYet")}</div></div>`;

    mapLegend.innerHTML = `<h3>${t("legend.mapTitle")}</h3>${pointSection}${surfaceSection}`;
}

function updateTimeOptions(parameter, preferredTime = null) {
    const timeSelect = document.getElementById("time-select");
    const options = state.metadata.available_times_by_parameter[parameter] || [];

    timeSelect.innerHTML = "";
    options.forEach((option) => {
        const element = document.createElement("option");
        element.value = option.key;
        element.textContent = formatTimeOptionLabel(option);
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

function fillParameterOptions(metadata, preferredParameter = null) {
    const parameterSelect = document.getElementById("parameter-select");
    parameterSelect.innerHTML = "";

    metadata.parameters.forEach((parameter) => {
        const option = document.createElement("option");
        option.value = parameter;
        option.textContent = parameter;
        parameterSelect.appendChild(option);
    });

    parameterSelect.value = preferredParameter || metadata.default_parameter || "";
}

function renderBoundary(boundaryGeojson, boundaryBounds) {
    state.boundaryLayer.clearLayers();
    state.boundaryLayer.addData(boundaryGeojson);
    if (boundaryBounds) {
        state.map.fitBounds(boundaryBounds, { padding: [16, 16] });
    }
}

function formatDisplayValue(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    const numberValue = Number(value);
    if (!Number.isNaN(numberValue) && Number.isFinite(numberValue)) {
        if (Number.isInteger(numberValue)) {
            return String(numberValue);
        }
        return numberValue.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    }

    return String(value);
}

function setSummaryValues(values = {}) {
    state.currentSummary = {
        ...state.currentSummary,
        ...values,
    };

    document.getElementById("summary-parameter").textContent = state.currentSummary.parameter || "-";
    document.getElementById("summary-time").textContent = state.currentSummary.time || "-";
    document.getElementById("summary-count").textContent = state.currentSummary.visibleWells || "0";
    document.getElementById("summary-method").textContent = state.currentSummary.method || "-";
    document.getElementById("summary-min").textContent = state.currentSummary.min || "-";
    document.getElementById("summary-max").textContent = state.currentSummary.max || "-";
}

function buildMapBounds() {
    let bounds = null;

    const extendBounds = (layerBounds) => {
        if (!layerBounds || !layerBounds.isValid || !layerBounds.isValid()) {
            return;
        }
        if (!bounds) {
            bounds = L.latLngBounds(layerBounds.getSouthWest(), layerBounds.getNorthEast());
        } else {
            bounds.extend(layerBounds);
        }
    };

    extendBounds(state.boundaryLayer.getBounds());

    state.pointsLayer.eachLayer((layer) => {
        if (typeof layer.getBounds === "function") {
            extendBounds(layer.getBounds());
        } else if (typeof layer.getLatLng === "function") {
            const latLng = layer.getLatLng();
            if (latLng) {
                if (!bounds) {
                    bounds = L.latLngBounds(latLng, latLng);
                } else {
                    bounds.extend(latLng);
                }
            }
        }
    });

    return bounds;
}

function resetMapView() {
    if (!state.map) {
        return;
    }

    const bounds = buildMapBounds();
    if (bounds && bounds.isValid()) {
        state.map.fitBounds(bounds, { padding: [16, 16], maxZoom: 14 });
    }
}

function buildPopup(properties) {
    const timeInfo = getTimeInfo();
    const localizedTime = getLocalizedTimeLabel(timeInfo) || properties.time;

    return `
        <div class="popup-card">
            <h3 class="popup-title">${properties.well}</h3>
            <p class="popup-meta"><strong>${t("popup.well")}:</strong> ${properties.well}</p>
            <p class="popup-meta"><strong>${properties.parameter}:</strong> ${properties.value}</p>
            <p class="popup-meta"><strong>${t("popup.time")}:</strong> ${localizedTime}</p>
            <p class="popup-meta"><strong>${t("popup.sampleCount")}:</strong> ${properties.sample_count}</p>
        </div>
    `;
}

function renderPoints(payload) {
    state.currentPointPayload = payload;
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
    state.currentPointLegend = stats.legend || [];
    setSummaryValues({
        visibleWells: formatDisplayValue(stats.point_count ?? 0),
        min: formatDisplayValue(stats.min_value),
        max: formatDisplayValue(stats.max_value),
    });
    renderLegend("point-legend", state.currentPointLegend, t("messages.noPointValuesAvailable"));
    return state.currentPointLegend;
}

function updateSummary(parameter, timeLabel) {
    setSummaryValues({
        parameter: parameter || "-",
        time: timeLabel || "-",
    });
}

function applySurfaceOpacity() {
    const opacity = Number(document.getElementById("opacity-slider").value) / 100;
    document.getElementById("opacity-value").textContent = `${Math.round(opacity * 100)}%`;
    if (state.surfaceOverlay) {
        state.surfaceOverlay.setOpacity(opacity);
    }
}

function renderSurface(payload) {
    state.currentSurfacePayload = payload;
    state.surfaceLayerGroup.clearLayers();
    state.surfaceOverlay = null;

    if (!payload.overlay_url) {
        state.currentSurfaceLegend = [];
        const warningDescriptor = translateServerMessage(payload.warning);
        const emptyMessage = warningDescriptor ? descriptorToText(warningDescriptor) : t("messages.noSurfaceAvailable");
        setSummaryValues({
            method: "-",
            min: formatDisplayValue(payload.min_value ?? state.currentSummary.min),
            max: formatDisplayValue(payload.max_value ?? state.currentSummary.max),
        });
        renderLegend("surface-legend", [], emptyMessage);
        return state.currentSurfaceLegend;
    }

    const opacity = Number(document.getElementById("opacity-slider").value) / 100;
    state.surfaceOverlay = L.imageOverlay(payload.overlay_url, payload.bounds, { opacity });
    state.surfaceOverlay.addTo(state.surfaceLayerGroup);

    state.currentSurfaceLegend = payload.legend || [];
    setSummaryValues({
        method: (payload.method || "IDW").toUpperCase(),
        min: formatDisplayValue(payload.min_value),
        max: formatDisplayValue(payload.max_value),
    });
    renderLegend("surface-legend", state.currentSurfaceLegend, t("messages.noSurfaceLegendAvailable"));
    return state.currentSurfaceLegend;
}

function applyLanguage(language, { persist = true } = {}) {
    const nextLanguage = window.DashboardI18n.isSupportedLanguage(language)
        ? language
        : window.DashboardI18n.defaultLanguage;

    state.currentLanguage = nextLanguage;
    if (persist) {
        window.localStorage.setItem(window.DashboardI18n.storageKey, nextLanguage);
    }

    applyLanguageDirection();
    applyStaticTranslations();
    populateLanguageSelector();

    if (state.map) {
        buildLayerControl();
    }

    if (state.metadata) {
        fillMetadata(state.metadata);
        fillParameterOptions(state.metadata, state.currentParameter || state.metadata.default_parameter);
        updateTimeOptions(
            state.currentParameter || state.metadata.default_parameter,
            state.currentTimeKey || state.metadata.default_time
        );
    } else {
        renderLegend("point-legend", [], t("messages.noPointDataYet"));
        renderLegend("surface-legend", [], t("messages.noSurfaceLoadedYet"));
    }

    if (state.currentPointPayload) {
        renderPoints(state.currentPointPayload);
    }

    if (state.currentSurfacePayload) {
        renderSurface(state.currentSurfacePayload);
    }

    renderMapLegend(state.currentPointLegend, state.currentSurfaceLegend);

    if (state.currentParameter || state.currentTimeKey) {
        const timeInfo = getTimeInfo();
        updateSummary(state.currentParameter, getLocalizedTimeLabel(timeInfo) || state.currentTimeKey);
    }

    setSummaryValues();

    applySurfaceOpacity();
    reapplyStatus();
    reapplyWarning();
}

async function refreshDashboard(forceInterpolation = true) {
    const parameter = document.getElementById("parameter-select").value;
    const timeKey = document.getElementById("time-select").value;

    if (!parameter || !timeKey) {
        setStatusByKey("messages.chooseSelection", "info");
        return;
    }

    state.currentParameter = parameter;
    state.currentTimeKey = timeKey;

    const timeInfo = getTimeInfo(parameter, timeKey);
    document.getElementById("refresh-btn").disabled = true;
    updateSummary(parameter, getLocalizedTimeLabel(timeInfo) || timeKey);
    setSummaryValues({
        visibleWells: "0",
        method: "-",
        min: "-",
        max: "-",
    });
    clearWarning();
    setStatusByKey("messages.loadingUpdate", "info");

    try {
        const pointPayload = await fetchJson(`/api/data?parameter=${encodeURIComponent(parameter)}&time=${encodeURIComponent(timeKey)}`);
        const pointLegend = renderPoints(pointPayload);

        let surfaceLegend = state.currentSurfaceLegend;
        if (forceInterpolation) {
            const interpolationPayload = await fetchJson(`/api/interpolation?parameter=${encodeURIComponent(parameter)}&time=${encodeURIComponent(timeKey)}`);
            surfaceLegend = renderSurface(interpolationPayload);
            if (interpolationPayload.warning) {
                setWarningByDescriptor(translateServerMessage(interpolationPayload.warning));
            }
            setStatusByKey(
                interpolationPayload.overlay_url ? "messages.loadedWellsAndSurface" : "messages.loadedWellsNoSurface",
                interpolationPayload.overlay_url ? "success" : "info",
                {
                    count: pointPayload.stats.point_count,
                    method: (interpolationPayload.method || "IDW").toUpperCase(),
                }
            );
        }

        renderMapLegend(pointLegend, surfaceLegend);
    } catch (error) {
        console.error(error);
        setWarningByDescriptor(error.descriptor || { kind: "key", key: "errors.generic" });
        setStatusByKey("messages.updateFailed", "error");
        renderMapLegend(state.currentPointLegend, state.currentSurfaceLegend);
    } finally {
        document.getElementById("refresh-btn").disabled = false;
    }
}

async function initializeDashboard() {
    createMap();
    applySurfaceOpacity();
    setStatusByKey("messages.loadingMetadata", "info");

    try {
        const metadata = await fetchJson("/api/metadata");
        state.metadata = metadata;

        fillMetadata(metadata);
        fillParameterOptions(metadata, metadata.default_parameter);
        updateTimeOptions(metadata.default_parameter, metadata.default_time);
        renderBoundary(metadata.boundary_geojson, metadata.boundary_bounds);

        setStatusByKey("messages.metadataLoaded", "success");
        await refreshDashboard(true);
    } catch (error) {
        console.error(error);
        setWarningByDescriptor(error.descriptor || { kind: "key", key: "errors.generic" });
        setStatusByKey("messages.initFailed", "error");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    applyLanguage(getSavedLanguage(), { persist: false });
    initializeDashboard();

    document.getElementById("language-select").addEventListener("change", (event) => {
        applyLanguage(event.target.value, { persist: true });
    });

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

    document.getElementById("reset-view-btn").addEventListener("click", () => {
        resetMapView();
    });

    document.getElementById("opacity-slider").addEventListener("input", () => {
        applySurfaceOpacity();
    });
});
