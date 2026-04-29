# Szeged Wells Dashboard

This project is a beginner-friendly local Flask dashboard for geoinformatics. It reads well measurements from a CSV file, reads a project boundary from a shapefile, shows the wells on a Leaflet map, and creates an interpolated surface for the selected parameter and time step.

## Project Structure

```text
app.py
requirements.txt
README.md
templates/
    index.html
static/
    css/
        style.css
    js/
        dashboard.js
        i18n.js
    outputs/
```

## 1. Create a Virtual Environment

Open a terminal in:

```powershell
D:\Pan\Programming_for_geoinformatics\test
```

Create the virtual environment:

```powershell
python -m venv .venv
```

Activate it in PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

## 2. Install the Dependencies

```powershell
pip install -r requirements.txt
```

Notes:

- `scipy` is included so the backend can optionally support linear or cubic interpolation if you want to extend the frontend later.
- IDW is the reliable default interpolation method and is what the dashboard uses automatically.

## 3. Run the Dashboard

```powershell
python app.py
```

Flask will print a local address, usually:

```text
http://127.0.0.1:5000
```

Open that address in your browser.

## 4. What the Dashboard Does

- Detects coordinate columns automatically from the CSV.
- Detects the time information automatically.
- Detects available numeric parameter columns automatically.
- Shows the wells as colored point markers.
- Shows the boundary shapefile on the map.
- Builds an IDW interpolation surface for the selected parameter and time.
- Clips the interpolation result to the boundary mask when possible.
- Supports English, Chinese, Kurdish, and Hungarian interface text with saved language preference.

## 5. Important File Paths

The current project uses these Windows paths directly inside `app.py`:

- CSV file:

```python
CSV_PATH = Path(r"D:\Pan\Programming_for_geoinformatics\test\Szeged_with_coordinates.csv")
```

- Shapefile:

```python
SHAPEFILE_PATH = Path(r"D:\Pan\Programming_for_geoinformatics\test\border_shapefile\border.shp")
```

If you move the data files, update those constants in `app.py`.

## 6. Where to Change the CRS

If the CSV coordinates are not already longitude and latitude in `EPSG:4326`, change this line in `app.py`:

```python
CSV_SOURCE_CRS = "EPSG:4326"
```

Examples:

- Hungarian EOV: `CSV_SOURCE_CRS = "EPSG:23700"`
- UTM 34N: `CSV_SOURCE_CRS = "EPSG:32634"`

If the shapefile is missing CRS information, you can also change:

```python
BOUNDARY_FALLBACK_CRS = "EPSG:4326"
```

The backend converts all map data to `EPSG:4326` before sending it to Leaflet.

## 7. Notes About This Dataset

- The CSV includes Hungarian column names such as `kút`, `Év`, and `Hónap`.
- The backend normalizes column names internally so those fields can still be detected automatically.
- If the CSV has duplicate records for the same well and time step, the app averages them for mapping and interpolation.
- If there are too few valid points for a selected parameter and time, the dashboard shows a warning instead of crashing.

## 8. API Endpoints

- `/api/metadata`
- `/api/data?parameter=Cu&time=year_1__month_10`
- `/api/interpolation?parameter=Cu&time=year_1__month_10`

## 9. VS Code Tips

- Open the project folder in VS Code.
- Open a new terminal inside VS Code.
- Activate the virtual environment.
- Run `python app.py`.
- Open the printed local URL in your browser.

## 10. Teacher Assignment Checklist

- Interactive map included
- OpenStreetMap basemap included
- Wells loaded from the CSV file
- Parameter selection included
- Time-based change included
- Interpolation surface included
- GitHub submission-ready project included
