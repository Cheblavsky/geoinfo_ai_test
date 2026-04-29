from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import geopandas as gpd
import matplotlib

matplotlib.use("Agg")

import matplotlib.colors as mcolors
import matplotlib.pyplot as plt
from matplotlib.path import Path as MplPath
import numpy as np
import pandas as pd
from flask import Flask, jsonify, render_template, request, url_for
from pyproj import Transformer

try:
    from scipy.interpolate import griddata
except Exception:
    griddata = None


BASE_DIR = Path(__file__).resolve().parent
CSV_PATH = Path(r"D:\Pan\Programming_for_geoinformatics\test\Szeged_with_coordinates.csv")
SHAPEFILE_PATH = Path(r"D:\Pan\Programming_for_geoinformatics\test\border_shapefile\border.shp")
OUTPUT_DIR = BASE_DIR / "static" / "outputs"

WEB_CRS = "EPSG:4326"
# Change this if the CSV coordinates are in a projected CRS such as EOV or UTM.
CSV_SOURCE_CRS = "EPSG:4326"
# Change this only if the boundary shapefile does not have a valid CRS in the .prj file.
BOUNDARY_FALLBACK_CRS = "EPSG:4326"

MIN_POINTS_FOR_INTERPOLATION = 3
TARGET_GRID_CELLS = 24000
GRID_PADDING_RATIO = 0.02
PURPLE_RAMP = ["#f3e8ff", "#d8b4fe", "#c084fc", "#9333ea", "#6b21a8", "#3b0764"]
PURPLE_CMAP = mcolors.LinearSegmentedColormap.from_list("dashboard_purple", PURPLE_RAMP)

COORDINATE_ALIASES = {
    "x": {"x", "lon", "lng", "long", "longitude", "eov_x", "utm_x", "coord_x", "easting"},
    "y": {"y", "lat", "latitude", "eov_y", "utm_y", "coord_y", "northing"},
}
TIME_ALIASES = {
    "single": {
        "date",
        "time",
        "datetime",
        "timestamp",
        "sampling_date",
        "measurement_date",
        "sample_date",
        "datum",
    },
    "year": {"year", "ev", "yyyy"},
    "month": {"month", "honap", "mm"},
    "day": {"day", "nap", "dd"},
}
WELL_ALIASES = {"well", "well_id", "well_name", "name", "station", "site", "kut", "wellnumber"}
EXCLUDED_PARAMETER_PREFIXES = ("log", "fac")
EXCLUDED_PARAMETER_NAMES = {
    "id",
    "ido",
    "index",
    "record",
    "row",
    "ev",
    "honap",
    "nap",
    "year",
    "month",
    "day",
}


@dataclass
class DatasetState:
    dataframe: pd.DataFrame
    boundary: gpd.GeoDataFrame
    boundary_geojson: dict[str, Any]
    boundary_bounds: list[list[float]]
    metadata: dict[str, Any]
    detection: dict[str, Any]


app = Flask(__name__)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def normalize_label(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "_", text).strip("_").lower()
    return text


def slugify(value: str) -> str:
    normalized = normalize_label(value)
    return normalized or "value"


def safe_float(value: Any) -> float:
    if pd.isna(value):
        return np.nan
    text = str(value).strip()
    if not text:
        return np.nan
    text = text.replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return np.nan


def tidy_scalar(value: Any) -> Any:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    if isinstance(value, (np.floating, float)):
        return round(float(value), 4)
    if isinstance(value, (np.integer, int)):
        return int(value)
    return value


def friendly_number(value: Any) -> str:
    numeric_value = safe_float(value)
    if np.isnan(numeric_value):
        text = str(value).strip()
        return text or "Unknown"
    if float(numeric_value).is_integer():
        return str(int(numeric_value))
    return f"{numeric_value:.2f}".rstrip("0").rstrip(".")


def read_csv_with_fallbacks(path: Path) -> pd.DataFrame:
    encodings = ["utf-8-sig", "utf-8", "cp1250", "latin1"]
    last_error: Exception | None = None
    for encoding in encodings:
        try:
            return pd.read_csv(path, encoding=encoding)
        except Exception as exc:
            last_error = exc
    raise RuntimeError(f"Could not read CSV file: {path}") from last_error


def pick_best_column(columns: list[str], aliases: set[str]) -> str | None:
    normalized = {column: normalize_label(column) for column in columns}
    exact_matches = [column for column, norm in normalized.items() if norm in aliases]
    if exact_matches:
        return exact_matches[0]

    partial_matches: list[tuple[int, str]] = []
    for column, norm in normalized.items():
        tokens = norm.split("_")
        for alias in aliases:
            if alias in tokens or norm.startswith(f"{alias}_") or norm.endswith(f"_{alias}"):
                partial_matches.append((len(norm), column))
                break
    if partial_matches:
        partial_matches.sort(key=lambda item: item[0])
        return partial_matches[0][1]
    return None


def detect_columns(df: pd.DataFrame) -> dict[str, Any]:
    columns = list(df.columns)
    normalized = {column: normalize_label(column) for column in columns}

    x_column = pick_best_column(columns, COORDINATE_ALIASES["x"])
    y_column = pick_best_column(columns, COORDINATE_ALIASES["y"])
    well_column = pick_best_column(columns, WELL_ALIASES)

    year_column = pick_best_column(columns, TIME_ALIASES["year"])
    month_column = pick_best_column(columns, TIME_ALIASES["month"])
    day_column = pick_best_column(columns, TIME_ALIASES["day"])

    time_kind = None
    time_columns: list[str] = []

    if year_column and month_column and day_column:
        time_kind = "year_month_day"
        time_columns = [year_column, month_column, day_column]
    elif year_column and month_column:
        time_kind = "year_month"
        time_columns = [year_column, month_column]
    elif year_column:
        time_kind = "year"
        time_columns = [year_column]
    else:
        single_time_candidates = [
            column
            for column in columns
            if normalized[column] in TIME_ALIASES["single"] or normalized[column] in {"ido", "datum_ido"}
        ]
        for candidate in single_time_candidates:
            series = df[candidate]
            parsed = pd.to_datetime(series, errors="coerce", dayfirst=True)
            success_ratio = parsed.notna().mean()
            unique_ratio = series.nunique(dropna=True) / max(len(series), 1)
            if success_ratio >= 0.6 or unique_ratio < 0.5:
                time_kind = "single"
                time_columns = [candidate]
                break

    return {
        "x_column": x_column,
        "y_column": y_column,
        "well_column": well_column,
        "time_kind": time_kind,
        "time_columns": time_columns,
        "normalized_columns": normalized,
    }


def build_time_fields(df: pd.DataFrame, detection: dict[str, Any]) -> tuple[pd.DataFrame, str]:
    working_df = df.copy()
    time_kind = detection["time_kind"]
    time_columns = detection["time_columns"]

    working_df["__time_key"] = None
    working_df["__time_label"] = None
    working_df["__time_order"] = np.nan

    if time_kind == "year_month_day":
        year_col, month_col, day_col = time_columns
        year_values = pd.to_numeric(working_df[year_col], errors="coerce")
        month_values = pd.to_numeric(working_df[month_col], errors="coerce")
        day_values = pd.to_numeric(working_df[day_col], errors="coerce")
        actual_years = year_values.dropna().between(1900, 2100).all()

        for index, (year_value, month_value, day_value) in enumerate(zip(year_values, month_values, day_values)):
            if np.isnan(year_value) or np.isnan(month_value) or np.isnan(day_value):
                continue
            year_int = int(year_value)
            month_int = int(month_value)
            day_int = int(day_value)
            if actual_years:
                label = f"{year_int:04d}-{month_int:02d}-{day_int:02d}"
                key = label
                order = year_int * 10000 + month_int * 100 + day_int
            else:
                label = f"Year {friendly_number(year_value)} / Month {month_int:02d} / Day {day_int:02d}"
                key = f"year_{friendly_number(year_value)}__month_{month_int:02d}__day_{day_int:02d}"
                order = year_value * 10000 + month_value * 100 + day_value
            working_df.at[index, "__time_key"] = key
            working_df.at[index, "__time_label"] = label
            working_df.at[index, "__time_order"] = order
        label_source = " + ".join(time_columns)
    elif time_kind == "year_month":
        year_col, month_col = time_columns
        year_values = pd.to_numeric(working_df[year_col], errors="coerce")
        month_values = pd.to_numeric(working_df[month_col], errors="coerce")
        actual_years = year_values.dropna().between(1900, 2100).all()

        for index, (year_value, month_value) in enumerate(zip(year_values, month_values)):
            if np.isnan(year_value) or np.isnan(month_value):
                continue
            month_int = int(month_value)
            if actual_years:
                year_int = int(year_value)
                label = f"{year_int:04d}-{month_int:02d}"
                key = label
                order = year_int * 100 + month_int
            else:
                label = f"Year {friendly_number(year_value)} / Month {month_int:02d}"
                key = f"year_{friendly_number(year_value)}__month_{month_int:02d}"
                order = year_value * 100 + month_value
            working_df.at[index, "__time_key"] = key
            working_df.at[index, "__time_label"] = label
            working_df.at[index, "__time_order"] = order
        label_source = " + ".join(time_columns)
    elif time_kind == "year":
        year_col = time_columns[0]
        year_values = pd.to_numeric(working_df[year_col], errors="coerce")
        actual_years = year_values.dropna().between(1900, 2100).all()

        for index, year_value in enumerate(year_values):
            if np.isnan(year_value):
                continue
            if actual_years:
                label = f"{int(year_value):04d}"
                key = label
            else:
                label = f"Year {friendly_number(year_value)}"
                key = f"year_{friendly_number(year_value)}"
            working_df.at[index, "__time_key"] = key
            working_df.at[index, "__time_label"] = label
            working_df.at[index, "__time_order"] = year_value
        label_source = year_col
    elif time_kind == "single":
        time_col = time_columns[0]
        raw_values = working_df[time_col]
        parsed_values = pd.to_datetime(raw_values, errors="coerce", dayfirst=True)

        if parsed_values.notna().mean() >= 0.6:
            labels = parsed_values.dt.strftime("%Y-%m-%d")
            orders = parsed_values.view("int64")
            working_df["__time_key"] = labels.where(parsed_values.notna(), None)
            working_df["__time_label"] = labels.where(parsed_values.notna(), None)
            working_df["__time_order"] = np.where(parsed_values.notna(), orders, np.nan)
        else:
            text_values = raw_values.astype(str).str.strip()
            working_df["__time_key"] = text_values.replace({"": None})
            working_df["__time_label"] = text_values.replace({"": None})
            working_df["__time_order"] = np.arange(len(working_df), dtype=float)
        label_source = time_col
    else:
        label_source = "No time column detected"

    return working_df, label_source


def prepare_coordinates(df: pd.DataFrame, detection: dict[str, Any]) -> pd.DataFrame:
    x_column = detection["x_column"]
    y_column = detection["y_column"]
    if not x_column or not y_column:
        raise RuntimeError("Could not detect coordinate columns in the CSV file.")

    working_df = df.copy()
    x_values = working_df[x_column].map(safe_float)
    y_values = working_df[y_column].map(safe_float)

    latlon_like = (
        x_values.dropna().between(-180, 180).all()
        and y_values.dropna().between(-90, 90).all()
        and x_values.notna().sum() > 0
        and y_values.notna().sum() > 0
    )

    if latlon_like:
        working_df["__lon"] = x_values
        working_df["__lat"] = y_values
    else:
        transformer = Transformer.from_crs(CSV_SOURCE_CRS, WEB_CRS, always_xy=True)
        lon_values, lat_values = transformer.transform(x_values.to_numpy(), y_values.to_numpy())
        working_df["__lon"] = lon_values
        working_df["__lat"] = lat_values

    return working_df


def prepare_well_labels(df: pd.DataFrame, detection: dict[str, Any]) -> pd.DataFrame:
    working_df = df.copy()
    well_column = detection["well_column"]

    if well_column:
        raw_labels = working_df[well_column].astype(str).str.strip()
        cleaned_labels = raw_labels.replace({"": None, "nan": None, "None": None})
        working_df["__well_label"] = cleaned_labels.map(
            lambda value: f"Well {friendly_number(value)}" if value is not None else None
        )
    else:
        working_df["__well_label"] = [f"Well {index + 1}" for index in range(len(working_df))]

    return working_df


def detect_parameter_columns(df: pd.DataFrame, detection: dict[str, Any]) -> list[str]:
    excluded_columns = {
        detection.get("x_column"),
        detection.get("y_column"),
        detection.get("well_column"),
        *detection.get("time_columns", []),
    }
    parameters: list[str] = []

    for column in df.columns:
        if column in excluded_columns or column.startswith("__"):
            continue

        normalized = normalize_label(column)
        if normalized in EXCLUDED_PARAMETER_NAMES:
            continue
        if any(normalized.startswith(prefix) for prefix in EXCLUDED_PARAMETER_PREFIXES):
            continue

        numeric_values = pd.to_numeric(df[column], errors="coerce")
        valid_count = int(numeric_values.notna().sum())
        if valid_count < 4:
            continue

        parameters.append(column)

    return parameters


def list_time_options(df: pd.DataFrame) -> list[dict[str, Any]]:
    if "__time_key" not in df:
        return []

    time_table = (
        df.dropna(subset=["__time_key", "__time_label"])
        .groupby("__time_key", dropna=False)
        .agg(label=("__time_label", "first"), order=("__time_order", "min"))
        .sort_values(["order", "label"], kind="stable")
        .reset_index()
    )

    return [
        {
            "key": record["__time_key"],
            "label": record["label"],
        }
        for record in time_table.to_dict(orient="records")
    ]


def list_times_by_parameter(df: pd.DataFrame, parameters: list[str]) -> dict[str, list[dict[str, Any]]]:
    time_lookup: dict[str, list[dict[str, Any]]] = {}
    for parameter in parameters:
        numeric_values = pd.to_numeric(df[parameter], errors="coerce")
        valid_rows = df[numeric_values.notna() & df["__lon"].notna() & df["__lat"].notna() & df["__time_key"].notna()].copy()
        if valid_rows.empty:
            time_lookup[parameter] = []
            continue

        grouped = (
            valid_rows.assign(__value=numeric_values.loc[valid_rows.index])
            .groupby("__time_key", dropna=False)
            .agg(label=("__time_label", "first"), order=("__time_order", "min"), point_count=("__value", "count"))
            .sort_values(["order", "label"], kind="stable")
            .reset_index()
        )

        time_lookup[parameter] = [
            {
                "key": record["__time_key"],
                "label": record["label"],
                "point_count": int(record["point_count"]),
            }
            for record in grouped.to_dict(orient="records")
        ]
    return time_lookup


def load_boundary() -> gpd.GeoDataFrame:
    boundary = gpd.read_file(SHAPEFILE_PATH)
    if boundary.crs is None:
        boundary = boundary.set_crs(BOUNDARY_FALLBACK_CRS)
    return boundary.to_crs(WEB_CRS)


def make_boundary_geojson(boundary: gpd.GeoDataFrame) -> dict[str, Any]:
    return json.loads(boundary.to_json())


def bounds_to_leaflet(bounds: tuple[float, float, float, float]) -> list[list[float]]:
    min_x, min_y, max_x, max_y = bounds
    return [[float(min_y), float(min_x)], [float(max_y), float(max_x)]]


def build_legend(min_value: float, max_value: float, steps: int = 5) -> list[dict[str, Any]]:
    if np.isnan(min_value) or np.isnan(max_value):
        return []
    if np.isclose(min_value, max_value):
        values = np.repeat(min_value, steps)
    else:
        values = np.linspace(min_value, max_value, steps)

    legend_items: list[dict[str, Any]] = []
    for value in values:
        legend_items.append({"value": round(float(value), 4), "color": value_to_color(value, min_value, max_value)})
    return legend_items


def value_to_color(value: float, min_value: float, max_value: float, alpha: float = 1.0) -> str:
    if np.isnan(value):
        return "#d1d5db"

    if np.isclose(min_value, max_value):
        normalized = 0.5
    else:
        normalized = np.clip((value - min_value) / (max_value - min_value), 0.0, 1.0)

    rgba = PURPLE_CMAP(normalized)
    red = int(round(rgba[0] * 255))
    green = int(round(rgba[1] * 255))
    blue = int(round(rgba[2] * 255))
    if alpha >= 1.0:
        return f"#{red:02x}{green:02x}{blue:02x}"
    alpha_int = int(round(alpha * 255))
    return f"#{red:02x}{green:02x}{blue:02x}{alpha_int:02x}"


def compute_grid_shape(bounds: tuple[float, float, float, float]) -> tuple[int, int]:
    min_x, min_y, max_x, max_y = bounds
    width = max(max_x - min_x, 1e-6)
    height = max(max_y - min_y, 1e-6)

    columns = int(np.sqrt(TARGET_GRID_CELLS * width / height))
    rows = int(TARGET_GRID_CELLS / max(columns, 1))

    return max(columns, 80), max(rows, 80)


def geometry_to_paths(geometry: Any) -> list[tuple[MplPath, list[MplPath]]]:
    polygons: list[Any] = []
    geom_type = getattr(geometry, "geom_type", None)

    if geom_type == "Polygon":
        polygons = [geometry]
    elif geom_type == "MultiPolygon":
        polygons = list(geometry.geoms)
    else:
        return []

    paths: list[tuple[MplPath, list[MplPath]]] = []
    for polygon in polygons:
        exterior_path = MplPath(np.asarray(polygon.exterior.coords))
        interior_paths = [MplPath(np.asarray(ring.coords)) for ring in polygon.interiors]
        paths.append((exterior_path, interior_paths))
    return paths


def build_mask(geometry: Any, grid_x: np.ndarray, grid_y: np.ndarray) -> np.ndarray:
    paths = geometry_to_paths(geometry)
    if not paths:
        return np.ones_like(grid_x, dtype=bool)

    flat_points = np.column_stack([grid_x.ravel(), grid_y.ravel()])
    mask = np.zeros(flat_points.shape[0], dtype=bool)

    for exterior_path, interior_paths in paths:
        polygon_mask = exterior_path.contains_points(flat_points, radius=1e-12)
        for interior_path in interior_paths:
            polygon_mask &= ~interior_path.contains_points(flat_points, radius=1e-12)
        mask |= polygon_mask

    return mask.reshape(grid_x.shape)


def aggregate_points(df: pd.DataFrame, parameter: str, time_key: str) -> pd.DataFrame:
    filtered = df[df["__time_key"] == time_key].copy()
    if filtered.empty:
        return filtered

    filtered["__value"] = pd.to_numeric(filtered[parameter], errors="coerce")
    filtered = filtered.dropna(subset=["__lon", "__lat", "__value"])
    if filtered.empty:
        return filtered

    grouped = (
        filtered.groupby("__well_label", dropna=False)
        .agg(
            lon=("__lon", "mean"),
            lat=("__lat", "mean"),
            value=("__value", "mean"),
            time_label=("__time_label", "first"),
            sample_count=("__value", "count"),
        )
        .reset_index()
        .rename(columns={"__well_label": "well_label"})
    )
    grouped["well_label"] = grouped["well_label"].fillna("Unnamed well")
    return grouped


def make_point_features(grouped: pd.DataFrame, parameter: str) -> dict[str, Any]:
    if grouped.empty:
        return {
            "type": "FeatureCollection",
            "features": [],
            "stats": {
                "point_count": 0,
                "min_value": None,
                "max_value": None,
                "legend": [],
            },
        }

    min_value = float(grouped["value"].min())
    max_value = float(grouped["value"].max())
    legend = build_legend(min_value, max_value)

    features: list[dict[str, Any]] = []
    for record in grouped.to_dict(orient="records"):
        color = value_to_color(float(record["value"]), min_value, max_value)
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [float(record["lon"]), float(record["lat"])]},
                "properties": {
                    "well": record["well_label"],
                    "parameter": parameter,
                    "value": round(float(record["value"]), 4),
                    "time": record["time_label"],
                    "sample_count": int(record["sample_count"]),
                    "color": color,
                },
            }
        )

    return {
        "type": "FeatureCollection",
        "features": features,
        "stats": {
            "point_count": len(features),
            "min_value": round(min_value, 4),
            "max_value": round(max_value, 4),
            "legend": legend,
        },
    }


def idw_interpolation(points_x: np.ndarray, points_y: np.ndarray, values: np.ndarray, grid_x: np.ndarray, grid_y: np.ndarray) -> np.ndarray:
    dx = grid_x[..., np.newaxis] - points_x
    dy = grid_y[..., np.newaxis] - points_y
    distances = np.hypot(dx, dy)

    zero_distance = distances < 1e-12
    weights = 1.0 / np.maximum(distances, 1e-12) ** 2
    interpolated = np.sum(weights * values, axis=2) / np.sum(weights, axis=2)

    if np.any(zero_distance):
        direct_hits = zero_distance.any(axis=2)
        hit_indices = np.argmax(zero_distance, axis=2)
        interpolated[direct_hits] = values[hit_indices[direct_hits]]

    return interpolated


def scipy_interpolation(
    points_x: np.ndarray,
    points_y: np.ndarray,
    values: np.ndarray,
    grid_x: np.ndarray,
    grid_y: np.ndarray,
    method: str,
) -> np.ndarray | None:
    if griddata is None or method not in {"linear", "cubic"}:
        return None

    try:
        return griddata(np.column_stack([points_x, points_y]), values, (grid_x, grid_y), method=method)
    except Exception:
        return None


def render_overlay(grid_values: np.ndarray, min_value: float, max_value: float, output_path: Path) -> None:
    if np.isclose(min_value, max_value):
        normalized = np.full_like(grid_values, 0.5, dtype=float)
    else:
        normalized = np.clip((grid_values - min_value) / (max_value - min_value), 0.0, 1.0)

    rgba = PURPLE_CMAP(normalized)
    rgba[..., 3] = np.where(np.isnan(grid_values), 0.0, 0.72)
    rgba[np.isnan(grid_values)] = (0.0, 0.0, 0.0, 0.0)

    plt.imsave(output_path, np.flipud(rgba))


def pad_bounds(bounds: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
    min_x, min_y, max_x, max_y = bounds
    x_padding = max((max_x - min_x) * GRID_PADDING_RATIO, 1e-5)
    y_padding = max((max_y - min_y) * GRID_PADDING_RATIO, 1e-5)
    return min_x - x_padding, min_y - y_padding, max_x + x_padding, max_y + y_padding


@lru_cache(maxsize=1)
def load_state() -> DatasetState:
    dataframe = read_csv_with_fallbacks(CSV_PATH)
    dataframe.columns = [str(column).strip() for column in dataframe.columns]

    detection = detect_columns(dataframe)
    dataframe, time_label_source = build_time_fields(dataframe, detection)
    dataframe = prepare_coordinates(dataframe, detection)
    dataframe = prepare_well_labels(dataframe, detection)

    parameters = detect_parameter_columns(dataframe, detection)
    boundary = load_boundary()
    boundary_geojson = make_boundary_geojson(boundary)
    boundary_bounds = bounds_to_leaflet(tuple(boundary.total_bounds))

    available_times = list_time_options(dataframe)
    times_by_parameter = list_times_by_parameter(dataframe, parameters)
    default_parameter = parameters[0] if parameters else None
    default_time = times_by_parameter.get(default_parameter, [{}])[-1].get("key") if default_parameter and times_by_parameter.get(default_parameter) else None

    metadata = {
        "coordinate_columns": {"x": detection["x_column"], "y": detection["y_column"]},
        "well_column": detection["well_column"],
        "time_column": time_label_source,
        "time_detection": detection["time_kind"],
        "parameters": parameters,
        "available_times": available_times,
        "available_times_by_parameter": times_by_parameter,
        "default_parameter": default_parameter,
        "default_time": default_time,
        "boundary_geojson": boundary_geojson,
        "boundary_bounds": boundary_bounds,
        "available_methods": ["idw"] + (["linear", "cubic"] if griddata is not None else []),
    }

    return DatasetState(
        dataframe=dataframe,
        boundary=boundary,
        boundary_geojson=boundary_geojson,
        boundary_bounds=boundary_bounds,
        metadata=metadata,
        detection=detection,
    )


def validate_parameter(state: DatasetState, parameter: str) -> None:
    if parameter not in state.metadata["parameters"]:
        raise ValueError(f"Unknown parameter: {parameter}")


def validate_time_key(state: DatasetState, parameter: str, time_key: str) -> None:
    valid_times = {item["key"] for item in state.metadata["available_times_by_parameter"].get(parameter, [])}
    if time_key not in valid_times:
        raise ValueError(f"Unknown time value for {parameter}: {time_key}")


@app.route("/")
def index() -> str:
    return render_template("index.html")


@app.route("/api/metadata")
def api_metadata() -> Any:
    state = load_state()
    return jsonify(state.metadata)


@app.route("/api/data")
def api_data() -> Any:
    state = load_state()
    parameter = request.args.get("parameter", "").strip()
    time_key = request.args.get("time", "").strip()

    try:
        validate_parameter(state, parameter)
        validate_time_key(state, parameter, time_key)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    grouped = aggregate_points(state.dataframe, parameter, time_key)
    payload = make_point_features(grouped, parameter)
    return jsonify(payload)


@app.route("/api/interpolation")
def api_interpolation() -> Any:
    state = load_state()
    parameter = request.args.get("parameter", "").strip()
    time_key = request.args.get("time", "").strip()
    requested_method = request.args.get("method", "idw").strip().lower() or "idw"

    try:
        validate_parameter(state, parameter)
        validate_time_key(state, parameter, time_key)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    grouped = aggregate_points(state.dataframe, parameter, time_key)
    if grouped.empty:
        return jsonify(
            {
                "ok": False,
                "warning": "No valid points were found for the selected parameter and time.",
                "overlay_url": None,
                "bounds": state.boundary_bounds,
            }
        )

    if len(grouped) < MIN_POINTS_FOR_INTERPOLATION:
        return jsonify(
            {
                "ok": False,
                "warning": f"At least {MIN_POINTS_FOR_INTERPOLATION} valid wells are needed for interpolation.",
                "overlay_url": None,
                "bounds": state.boundary_bounds,
                "point_count": int(len(grouped)),
            }
        )

    min_value = float(grouped["value"].min())
    max_value = float(grouped["value"].max())
    padded_bounds = pad_bounds(tuple(state.boundary.total_bounds))
    columns, rows = compute_grid_shape(padded_bounds)
    min_x, min_y, max_x, max_y = padded_bounds
    x_coords = np.linspace(min_x, max_x, columns)
    y_coords = np.linspace(min_y, max_y, rows)
    grid_x, grid_y = np.meshgrid(x_coords, y_coords)

    points_x = grouped["lon"].to_numpy(dtype=float)
    points_y = grouped["lat"].to_numpy(dtype=float)
    values = grouped["value"].to_numpy(dtype=float)

    interpolation_method = "idw"
    grid_values: np.ndarray | None = None
    if requested_method in {"linear", "cubic"}:
        grid_values = scipy_interpolation(points_x, points_y, values, grid_x, grid_y, requested_method)
        if grid_values is not None:
            interpolation_method = requested_method

    if grid_values is None:
        grid_values = idw_interpolation(points_x, points_y, values, grid_x, grid_y)

    boundary_union = state.boundary.geometry.unary_union
    mask = build_mask(boundary_union, grid_x, grid_y)
    clipped_grid = np.where(mask, grid_values, np.nan)

    if np.isnan(clipped_grid).all():
        return jsonify(
            {
                "ok": False,
                "warning": "Interpolation was created, but nothing overlapped the boundary mask.",
                "overlay_url": None,
                "bounds": bounds_to_leaflet(padded_bounds),
            }
        )

    output_name = f"{slugify(parameter)}__{slugify(time_key)}__{interpolation_method}.png"
    output_path = OUTPUT_DIR / output_name
    render_overlay(clipped_grid, min_value, max_value, output_path)

    overlay_url = url_for("static", filename=f"outputs/{output_name}", v=int(output_path.stat().st_mtime))
    legend = build_legend(min_value, max_value)

    return jsonify(
        {
            "ok": True,
            "overlay_url": overlay_url,
            "bounds": bounds_to_leaflet(padded_bounds),
            "legend": legend,
            "min_value": round(min_value, 4),
            "max_value": round(max_value, 4),
            "point_count": int(len(grouped)),
            "method": interpolation_method,
            "warning": None,
        }
    )


@app.errorhandler(Exception)
def handle_error(error: Exception) -> tuple[Any, int]:
    return jsonify({"error": str(error)}), 500


if __name__ == "__main__":
    app.run(debug=True)
