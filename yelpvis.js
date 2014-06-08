var userData, businessData, reviewData, remaining = 3;
var review, reviews, reviewByDate, reviewDates, reviewByLocation, reviewLocations;
var business, businessByLocation, businessLocations;
var map, reviewHeatmap, businessHeatmap;

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

var secondaryControlDisplay = d3.select("body").append("div")
    .attr("class", "displayDiv")
    .style({
        position: "absolute",
        left: "73%",
        top: "48.25%",
        width: "27%",
        height: "18.75%",
        "border-top": "2px solid black",
        "border-left": "2px solid black"
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
    reviewByLocation = review.dimension(function(d) {
        return d.latitude + ' ' + d.longitude;
    });
    reviewLocations = reviewByLocation.group();
    
    business = crossfilter(businessData);
    businessByLocation = business.dimension(function(d) {
        return d.latitude + ' ' + d.longitude;
    });
    businessLocations = businessByLocation.group();
    
    initMapDisplay();
    initTimescaleControl();
    initControlButtons();
}

function initMapDisplay() {
    var mapOptions = {
      center: new google.maps.LatLng(33.451162, -112.061603),
      zoom: 10
    };
    map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
    
    var reducedBusinessLocations = new google.maps.MVCArray(businessLocations.all().map(function(d, i) {
        var ltlg = d.key.split(' ');
        var latlng = new google.maps.LatLng(ltlg[0], ltlg[1]);
        return {location: latlng, weight: d.value};
    }));
    
    businessHeatmap = new google.maps.visualization.HeatmapLayer({
        data: reducedBusinessLocations,
        map: null,
        radius: 15
    });
    
    var reducedReviewLocations = new google.maps.MVCArray(reviewLocations.all().map(function(d, i) {
        var ltlg = d.key.split(' ');
        var latlng = new google.maps.LatLng(ltlg[0], ltlg[1]);
        return {location: latlng, weight: d.value};
    }));
    
    reviewHeatmap = new google.maps.visualization.HeatmapLayer({
        data: reducedReviewLocations,
        map: null,
        radius: 15
    });
}

// Listener closure
function setListener(object, d) {
    google.maps.event.addListener(object, 'click', function(event) {
        updateBusinessInfo(d);
    });
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
            
            updateReviewHeatmap();
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

function initControlButtons() {
    var reviewDiv = secondaryControlDisplay.append("div")
    .style({
        "text-align": "center",
        position: "absolute",
        left: "0px",
        top: "0px",
        width: "50%",
        height: "100%"
    });
    
    var businessDiv = secondaryControlDisplay.append("div")
    .style({
        "text-align": "center",
        position: "absolute",
        left: "50%",
        top: "0px",
        width: "50%",
        height: "100%"
    });
    
    
    
    reviewDiv.append("button")
        .attr({
            width: "100%",
            onclick: "toggleReviewHeatmap()"
        })
        .style({
            width: "100%"
        })
        .text("Toggle Review Heatmap");
    
    businessDiv.append("button")
        .attr({
            onclick: "toggleBusinessHeatmap()"
        })
        .style({
            width: "100%"
        })
        .text("Toggle Business Heatmap");
    
    businessDiv.append("br");
    
    businessDiv.append("text")
        .text("Weight by");

    businessDiv.append("br");
    
    businessDiv.append("input")
        .attr({
            type: "radio",
            name: "businessWeighting",
            value: "None",
            onclick: "setBusinessNoWeighting()"
        });
        
    businessDiv.append("text")
        .text("None");
        
    businessDiv.append("br");

    businessDiv.append("input")
        .attr({
            type: "radio",
            name: "businessWeighting",
            value: "Stars",
            onclick: "setBusinessStarWeighting()"
        });
    
    businessDiv.append("text")
        .text("Stars");
    
    businessDiv.append("br");
    
    businessDiv.append("input")
        .attr({
            type: "radio",
            name: "businessWeighting",
            value: "Reviews",
            onclick: "setBusinessReviewCountWeighting()"
        });
        
    businessDiv.append("text")
        .text("Reviews");
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

function updateReviewHeatmap() {
    reviewHeatmap.setData(new google.maps.MVCArray(reviewLocations.all().map(function(d, i) {
        var ltlg = d.key.split(' ');
        var latlng = new google.maps.LatLng(ltlg[0], ltlg[1]);
        return {location: latlng, weight: d.value};
    })));
}

function toggleReviewHeatmap() {
    reviewHeatmap.setMap(reviewHeatmap.getMap() ? null : map);
}

function updateBusinessHeatmap() {
    businessHeatmap.setData(new google.maps.MVCArray(businessLocations.all().map(function(d, i) {
        var ltlg = d.key.split(' ');
        var latlng = new google.maps.LatLng(ltlg[0], ltlg[1]);
        return {location: latlng, weight: d.value};
    })));
}

function toggleBusinessHeatmap() {
    businessHeatmap.setMap(businessHeatmap.getMap() ? null : map);
}

function setBusinessNoWeighting() {
    businessLocations.reduce(reduceAdd, reduceRemove, reduceInitial);
    updateBusinessHeatmap();
}

function setBusinessStarWeighting() {
    businessLocations.reduce(reduceAddSum("stars"), reduceRemoveSum("stars"), reduceInitial);
    updateBusinessHeatmap();
}

function setBusinessReviewCountWeighting() {
    businessLocations.reduce(reduceAddSum("review_count"), reduceRemoveSum("review_count"), reduceInitial);
    updateBusinessHeatmap();
}

function reduceAdd(p, v) {
    return p + 1;
}

function reduceRemove(p, v) {
    return p - 1;
}

function reduceAddSum(attr) {
  return function(p,v) {
    return p + v[attr];
  };
}
function reduceRemoveSum(attr) {
  return function(p,v) {
    return p - v[attr];
  };
}

function reduceInitial() {
    return 0;
}