/*--------------------------------------------------------------------
GGR472 LAB 4: Incorporating GIS Analysis into web maps using Turf.js 
--------------------------------------------------------------------*/

/*--------------------------------------------------------------------
Step 1: INITIALIZE MAP
--------------------------------------------------------------------*/
// Define access token
mapboxgl.accessToken = 'pk.eyJ1Ijoic2FuaW5nMTIxNiIsImEiOiJjbHMyOWZleTgwaWVnMmtvOWphdnlxM3liIn0.z0dydDvm-LW0qRPM0BgsGw'; //****ADD YOUR PUBLIC ACCESS TOKEN*****

// Initialize map and edit to your preference
const map = new mapboxgl.Map({
    container: 'map', // container id in HTML
    style: 'mapbox://styles/saning1216/cltq8v8mm005g01o492j6df75',  // ****ADD MAP STYLE HERE *****
    center: [-79.39, 43.7],  // starting point, longitude/latitude
    zoom: 10 // starting zoom level
});

/*--------------------------------------------------------------------
Step 2: VIEW GEOJSON POINT DATA ON MAP
--------------------------------------------------------------------*/
//HINT: Create an empty variable
//      Use the fetch method to access the GeoJSON from your online repository
//      Convert the response to JSON format and then store the response in your new variable

// Fetch GeoJSON from URL and store response

let collisgeojson;
fetch('https://raw.githubusercontent.com/saning1216/GGR472-Lab4/main/data/pedcyc_collision_06-21.geojson')
    .then(response => response.json())
    .then(response => {
        console.log(response); //Check response in console
        collisgeojson = response; // Store geojson as variable using URL from fetch response
    });

/*--------------------------------------------------------------------
    Step 3: CREATE BOUNDING BOX AND HEXGRID
--------------------------------------------------------------------*/
//HINT: All code to create and view the hexgrid will go inside a map load event handler
//      First create a bounding box around the collision point data then store as a feature collection variable
//      Access and store the bounding box coordinates as an array variable
//      Use bounding box coordinates as argument in the turf hexgrid function

map.on('load', () => {

    let bboxgeojson;
    let bbox = turf.envelope(collisgeojson); // Create a bounding box (envelope) around the collision points data
    let bboxscaled = turf.transformScale(bbox, 1.10); // Scale the bounding box up by 10%
    
    // Put the resulting scaled envelope in a geojson format FeatureCollection
    bboxgeojson = {
        "type": "FeatureCollection",
        "features": [bboxscaled]
    };

    map.addSource('collis-bbox', {
        type: 'geojson',
        data: bboxgeojson
    });

    // Add a new layer to visualize the bounding box
    map.addLayer({
        id: 'bbox-layer',
        type: 'line',
        source: 'collis-bbox',
        layout: {},
        paint: {
            'line-color': '#DF2979',
            'line-width': 2
        }
    });
    
    console.log(bbox)
    console.log(bbox.geometry.coordinates)

    // Create a hexgrid within the bounding box
    // must be in the order [minX, minY, maxX, maxY]
    let bboxcoords = [
        bboxscaled.geometry.coordinates[0][0][0], // minX
        bboxscaled.geometry.coordinates[0][0][1], // minY
        bboxscaled.geometry.coordinates[0][2][0], // maxX
        bboxscaled.geometry.coordinates[0][2][1]  // maxY
    ];
    
    // Create a grid of 0.5km hexagons inside the spatial limits of the bboxcoords feature
    let hexgeojson = turf.hexGrid(bboxcoords, 0.5, { units: 'kilometers' });
    

/*--------------------------------------------------------------------
Step 4: AGGREGATE COLLISIONS BY HEXGRID
--------------------------------------------------------------------*/
//HINT: Use Turf collect function to collect all '_id' properties from the collision points data for each heaxagon
//      View the collect output in the console. Where there are no intersecting points in polygons, arrays will be empty

    let collishex = turf.collect(hexgeojson,collisgeojson, '_id', 'values');
    //Count the number of features inside of each hexagon, and identify maximum value
    let maxcollis = 0; // Initialize a variable "maxcollis" to record the maximum number of collisions in any hexagon

    collishex.features.forEach((feature) => {
    // Count the number of collected features in each hexagon and assign this count number to the COUNT property
        feature.properties.COUNT = feature.properties.values.length

        if (feature.properties.COUNT > maxcollis) { //If the current hexagon's count is greater than the "maxcollis",
            console.log(feature);  // Log the feature with the new maximum collision count
            maxcollis = feature.properties.COUNT // Update the "maxcollis" to the new maximum count
        }
});


    // Add the hexgrid as a source to the map
    map.addSource('hexgrid', {
        type: 'geojson',
        data: hexgeojson
    });
    
    // Add a new layer to the map to visualize the hexgrid
    map.addLayer({
        id: 'hexgrid-layer',
        type: 'fill',
        source: 'hexgrid',
        paint: {
            'fill-color': [
                'step',
                ['get', 'COUNT'],
                '#F8FFAF',     // The maximum intersecting points are <10, the hexagon color is light yellow
                10, '#FE52A8', // The maximum intersecting points are >=10, the hexagon color is pink
                25, '#AF1531'  // The maximum intersecting ponits are >=25, the hexagon color is dark red
            ],
            'fill-opacity': 0.5,
            'fill-outline-color': '#F16409'
        }
    });
});

// Add a click event listener to the 'hexgrid-layer'
map.on('click', 'hexgrid-layer', (e) => {
    // Create a new popup at the location of the click
    new mapboxgl.Popup()
        
        .setLngLat(e.lngLat) // Set the location of the popup to the coordinates of the click event
        
        .setHTML("<b>Collision Count:</b> " + e.features[0].properties.COUNT)// Once clicked, there will be a popup to show the collision count at the hexagon
        // e.features[0] is the first feature at the click event point
        .addTo(map); // Add the popup to the map
});


// /*--------------------------------------------------------------------
// Step 5: FINALIZE YOUR WEB MAP
// --------------------------------------------------------------------*/
//HINT: Think about the display of your data and usability of your web map.
//      Update the addlayer paint properties for your hexgrid using:
//        - an expression
//        - The COUNT attribute
//        - The maximum number of collisions found in a hexagon
//      Add a legend and additional functionality including pop-up windows

//Add navigation and zoom controls
const navtools= new mapboxgl.NavigationControl();
document.getElementById('nav-tools').appendChild(navtools.onAdd(map));

const zoomtools= new mapboxgl.FullscreenControl();
document.getElementById('zoom-tools').appendChild(zoomtools.onAdd(map));

//Add a Legend//
map.on('load', function () {

    const legend = document.createElement('div');
    legend.className = 'legend';
    legend.innerHTML = `
        <h4>Collision Count in Toronto</h4>
        <div><span style="background-color: #F8FFAF; width: 24px; height: 24px; display: inline-block;"></span> Low Collision Count (0-9)</div>
        <div><span style="background-color: #FE52A8; width: 24px; height: 24px; display: inline-block;"></span> Medium Collision Count (10-24)</div>
        <div><span style="background-color: #AF1531; width: 24px; height: 24px; display: inline-block;"></span> High Collision Count (>=25)</div>
    `;
    // Add the legend to the map
    map.getContainer().appendChild(legend);
});

//Add a layer control to toggle collision points on and off//
map.on('load', function() {
    map.addSource('collision-data', {
        type: 'geojson',
        data: collisgeojson 
    });

    map.addLayer({
        id: 'collisions',
        type: 'circle',
        source: 'collision-data',
        layout: {
            'visibility': 'none'
        }, //set the layer invisible by default//
        paint: {
            'circle-radius': 4,
            'circle-color': '#77CEE8'
        }
    });

    // Toggle layer to show the collision points
    document.getElementById('toggle-collisions').addEventListener('change', function(e) {
        map.setLayoutProperty('collisions', 'visibility', e.target.checked ? 'visible' : 'none');
    });
});