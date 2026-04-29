# Step Report

## Step title
Initial dashboard build with Flask, Leaflet, CSV loading, boundary map, and IDW interpolation

## What was done
In this step, a complete first version of the local geoinformatics dashboard was built.

The project now includes:

- a Flask backend
- a Leaflet web map
- automatic reading of the CSV well dataset
- automatic reading of the shapefile boundary
- automatic detection of coordinate, time, and parameter columns
- well point display with colored markers
- popup information for each well
- interpolation of the selected parameter for the selected time
- a purple-themed interface
- setup instructions in the README

This step created the main working structure of the dashboard so it can be run locally in VS Code.

## Files created
- `app.py`
  Main Flask application. It loads the CSV and shapefile, detects columns, prepares map data, serves API endpoints, and creates interpolation overlay images.

- `templates/index.html`
  Main dashboard page. It contains the map area, control panel, legends, and status messages.

- `static/css/style.css`
  Styles for the dashboard. It defines the purple theme, layout, cards, controls, and responsive map page design.

- `static/js/main.js`
  Frontend logic for the dashboard. It loads metadata, updates dropdowns, requests well data and interpolation results, updates the Leaflet map, and shows legends and messages.

- `requirements.txt`
  Python dependency list needed to run the project.

- `README.md`
  Beginner-friendly instructions for creating a virtual environment, installing packages, running the app, and changing paths or CRS settings.

- `static/outputs/.gitkeep`
  Keeps the output folder in the project structure so interpolation images can be saved there.

- `static/outputs/cu__year_3_month_09__idw.png`
  Example interpolation image generated during testing.

## Files modified
- None from an earlier project state.

This was the initial build step, so the main project files were created rather than edited from existing versions.

## Data used
The dashboard uses these local data sources:

- CSV file:
  `D:\Pan\Programming_for_geoinformatics\test\Szeged_with_coordinates.csv`

- Shapefile boundary:
  `D:\Pan\Programming_for_geoinformatics\test\border_shapefile\border.shp`

The shapefile folder also includes the related `.dbf`, `.shx`, and `.prj` files that are needed by the shapefile.

## Main features added
- Flask web application with one main dashboard page
- OpenStreetMap basemap with Leaflet
- Boundary shapefile display on the map
- Automatic coordinate column detection
- Automatic time column detection
- Automatic numeric parameter detection
- Parameter dropdown
- Time/date dropdown based on available data
- Well markers colored by selected parameter value
- Popups showing well name, parameter value, time, and sample count
- IDW interpolation for the selected parameter and time
- Surface clipping or masking to the project boundary
- Raster overlay image display on the map
- Point legend and interpolation legend
- Layer control, zoom, and pan support
- Loading, success, and warning messages

## How to test
1. Open a terminal in the project folder:
   `D:\Pan\Programming_for_geoinformatics\test`

2. Create a virtual environment:
   `python -m venv .venv`

3. Activate the environment in PowerShell:
   `.\.venv\Scripts\Activate.ps1`

4. Install the dependencies:
   `pip install -r requirements.txt`

5. Run the Flask app:
   `python app.py`

6. Open the browser at:
   `http://127.0.0.1:5000`

7. Check that:
   - the page loads
   - the map appears
   - the project boundary is visible
   - wells appear as colored points
   - changing the parameter updates the points
   - changing the time updates the points
   - clicking the refresh button generates and displays an interpolation surface
   - legends and status messages are shown

## Assumptions
- The CSV file path and shapefile path are fixed in `app.py` and are assumed to exist at those locations.
- The CSV coordinates are assumed to already be in `EPSG:4326` unless `CSV_SOURCE_CRS` is changed manually.
- The backend converts spatial data to `EPSG:4326` for Leaflet display.
- Time detection is based on the detected `Év` and `Hónap` columns for this dataset.
- Duplicate records for the same well and time are averaged before mapping and interpolation.
- IDW is used as the reliable default interpolation method.
- Optional SciPy interpolation support is included only if SciPy is installed and usable.

## Known limitations
- The dataset time values are shown as logical labels like `Year 1 / Month 10`, not real calendar dates.
- Some parameter-time combinations may have missing values, so fewer wells may appear than expected.
- The interpolation output files are saved in `static/outputs` and are not cleaned automatically.
- The frontend currently uses a time dropdown, not a slider.
- The interpolation method is not yet selectable from the UI.
- The app currently uses local hard-coded data paths in `app.py`.

## Next recommended step
The next logical step is to improve usability and control of the interpolation workflow.

Recommended next work:

- improve the time selector and labels
- optionally add interpolation method selection in the UI
- improve validation and warning messages
- optionally manage or clean old output raster files
- refine the interface based on how the dashboard feels during real use
