var userData, businessData, reviewData, remaining = 3;
var review, reviews, reviewByDate, reviewDates;
var business, businessById;
var reviewLocations;
var reviewHeatmap;

var mapDisplay = d3.select("body").append("div")
    .attr({
        id: "map-canvas",
        class: "displayDiv"
    })
    .style({
        position: "absolute",
        left: "0px",
        top: "0px",
        width: "73%",
        height: "67%"
    });
    
var controlDisplay = d3.select("body").append("div")
    .attr("class", "displayDiv")
    .style({
        position: "absolute",
        left: "73%",
        top: "0px",
        width: "27%",
        height: "48.25%",
        "border-left": "2px solid black"
    })
    .append("svg")
    .attr({
        class: "display",
        width: "100%",
        height: "100%",
        viewBox: "0 0 260 260"
    });

var businessInfoDisplay = d3.select("body").append("div")
    .attr("class", "displayDiv")
    .style({
        position: "absolute",
        left: "73%",
        top: "48.25%",
        width: "27%",
        height: "18.75%",
        "border-top": "2px solid black",
        "border-left": "2px solid black"
    })
    .append("svg")
    .attr({
        class: "display",
        width: "100%",
        height: "100%",
        viewBox: "0 0 260 105"
    });

d3.json("data/user.json", function(data) {
    userData = data;
    if(!--remaining)
        processData();
});

d3.json("data/business.json", function(data) {
    businessData = data;
    if(!--remaining)
        processData();
});

d3.json("data/review.json", function(error, data) {
    reviewData = data;
    if(!--remaining)
        processData();
});

// Main function
function processData() {
    review = crossfilter(reviewData);
    reviews = review.groupAll();
    reviewByDate = review.dimension(function(d) {
        var ymd = d.date.split('-');
        return (new Date(ymd[0], ymd[1] - 1, ymd[2])).getTime();
    });
    reviewDates = reviewByDate.group();
    
    business = crossfilter(businessData);
    businessById = business.dimension(function(d) {
        return d.business_id;
    });
    
    initMapDisplay();
    initTimescaleControl();
}

function initMapDisplay() {
    var mapOptions = {
      center: new google.maps.LatLng(33.451162, -112.061603),
      zoom: 10
    };
    var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
    
    var businessLocations = new google.maps.MVCArray(businessData.map(function(d, i) {
        // We can set up markers at the same time
        var marker = new google.maps.Marker({
            position: new google.maps.LatLng(d.latitude, d.longitude),
            map: null
        });
        setListener(marker, d);
        
        return new google.maps.LatLng(d.latitude, d.longitude);
    }));
    
    var businessHeatmap = new google.maps.visualization.HeatmapLayer({
        data: businessLocations,
        map: null,
        radius: 15
    });
    
    var businesses = businessById.bottom(Infinity);
    
    reviewLocations = new google.maps.MVCArray(reviewByDate.top(Infinity).map(function(d, i) {
        // Get Lat/Long for each id
        var b = businesses[getIndex(businesses, "business_id", d.business_id)];
        return new google.maps.LatLng(b.latitude, b.longitude);
    }));
    
    reviewHeatmap = new google.maps.visualization.HeatmapLayer({
        data: reviewLocations,
        map: map,
        radius: 15
    });
}

// Listener closure
function setListener(object, d) {
    google.maps.event.addListener(object, 'click', function(event) {
        updateBusinessInfo(d);
    });
}

function updateBusinessInfo(d) {
    businessInfoDisplay.selectAll("*").remove();
    
    businessInfoDisplay.append("text")
        .attr({
            class: "infoHeader",
            x: 0,
            y: 20
        })
        .text(d.name);
}

function initTimescaleControl() {
    var reviewsPerDate = reviewDates.all();
    var height = 234, width = 130;

    var timescaleController = controlDisplay.append("g")
        .attr("transform", "translate(26, 13)");

    var xScale = d3.scale.linear()
        .domain([0, d3.max(reviewsPerDate, function(d) { return d.value; })])
        .range([0, width]);

    var yScale = d3.time.scale()
        .domain([d3.min(reviewsPerDate, function(d) { return d.key; }),
            d3.max(reviewsPerDate, function(d) { return d.key; })])
        .range([0, height]);

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left")
        .tickSize(0);

    var brush = d3.svg.brush()
        .y(yScale)
        .on("brush", function() {
            reviewByDate.filterRange(brush.extent());
            
            var businesses = businessById.bottom(Infinity);
            
            reviewHeatmap.setData(new google.maps.MVCArray(reviewByDate.top(Infinity).map(function(d, i) {
                // Get Lat/Long for each id
                var b = businesses[getIndex(businesses, "business_id", d.business_id)];
                return new google.maps.LatLng(b.latitude, b.longitude);
            })));
        });
        
    timescaleController.append("g")
        .attr("class", "timeAxis")
        .call(yAxis);

    timescaleController.selectAll("rect")
        .data(reviewsPerDate)
        .enter()
        .append("rect")
        .attr("id", function(d, i) {
            return i + 1;
        })
        .attr("width", function(d) {
            return xScale(d.value);
        })
        .attr("height", (height / reviewsPerDate.length) - (.01 * height / reviewsPerDate.length))
        .attr("y", function(d, i) {
            return (height / reviewsPerDate.length) * i;
        })
        .attr("fill", "steelblue");

    var gBrush = timescaleController.append("g")
        .attr("class", "brush")
        .call(brush);

    gBrush.selectAll("rect")
        .attr("width", width);
}

// Find the index of the element in array of which the attr equal value
// Array should be sorted in ascending order
function getIndex(array, attr, value) {
    var low = 0, high = array.length - 1, i;
    while (low <= high) {
        i = Math.floor((low + high) / 2);
        if (array[i][attr] < value) {
            low = i + 1;
            continue;
        }
        if (array[i][attr] > value) {
            high = i - 1;
            continue; 
        }
        return i;
    }
    return null;
}