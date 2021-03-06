var businessData, reviewData, remaining = 2;
var review, reviews, reviewByDate, reviewDates, reviewByLocation, reviewLocations;
var business, businessByLocation, businessLocations, businessByReviewAmount, businessReviewAmounts;
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
    
var reviewDetailDisplay = d3.select("body").append("div")
    .attr("class", "displayDiv")
    .style({
        position: "absolute",
        left: "0px",
        top: "67%",
        width: "50%",
        height: "33%",
        "border-top": "2px solid black"
    })
    .append("svg")
    .attr({
        class: "display",
        width: "100%",
        height: "100%",
        viewBox: "0 0 480 195"
    });
    
var businessDetailDisplay = d3.select("body").append("div")
    .attr("class", "displayDiv")
    .style({
        position:"absolute",
        left: "50%",
        top: "67%",
        width: "50%",
        height: "33%",
        "text-align": "center",
        "border-top": "2px solid black",
        "border-left": "2px solid black"
    })
    .append("svg")
    .attr({
        class: "display",
        width: "100%",
        height: "100%",
        viewBox: "0 0 480 195"
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
    businessByReviewAmount = business.dimension(function(d) {
        return d.review_count;
    });
    businessReviewAmounts = businessByReviewAmount.group();
    
    initMapDisplay();
    initReviewTimescaleControl();
    initBusinessControl();
    initControlButtons();
    updateReviewDetailDisplay(null);
    updateBusinessDetailDisplay(null);
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

function initReviewTimescaleControl() {
    var reviewsPerDate = reviewDates.all();
    controlDisplay.append("text")
        .attr({
            class: "infoHeader",
            x: 73,
            y: 15,
            "text-anchor": "middle"
        })
        .text("Reviews");
    
    var height = 214, width = 104;

    var timescaleController = controlDisplay.append("g")
        .attr("transform", "translate(21, 23)");

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
            
            updateReviewDetailDisplay(brush.extent());
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

function initBusinessControl() {
    var businessesPerReviewAmount = businessReviewAmounts.all();
    
    controlDisplay.append("text")
        .attr({
            class: "infoHeader",
            x: 203,
            y: 15,
            "text-anchor": "middle"
        })
        .text("Businesses");
    
    var height = 214, width = 104;

    var timescaleController = controlDisplay.append("g")
        .attr("transform", "translate(151, 23)");

    var xScale = d3.scale.linear()
        .domain([0, d3.max(businessesPerReviewAmount, function(d) { return d.value; })])
        .range([0, width]);

    var yScale = d3.scale.linear()
        .domain([0, d3.max(businessesPerReviewAmount, function(d) { return d.key; })])
        .range([0, height]);

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left")
        .tickSize(0);

    var brush = d3.svg.brush()
        .y(yScale)
        .on("brush", function() {
            businessByReviewAmount.filterRange(brush.extent());
            
            updateBusinessDetailDisplay(brush.extent());
            updateBusinessHeatmap();
            
        });
        
    timescaleController.append("g")
        .attr("class", "timeAxis")
        .call(yAxis);

    timescaleController.selectAll("rect")
        .data(businessesPerReviewAmount)
        .enter()
        .append("rect")
        .attr("id", function(d, i) {
            return i + 1;
        })
        .attr("width", function(d) {
            return xScale(d.value);
        })
        .attr("height", (height / businessesPerReviewAmount.length) - (.01 * height / businessesPerReviewAmount.length))
        .attr("y", function(d, i) {
            return (height / businessesPerReviewAmount.length) * i;
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

    reviewDiv.append("button")
        .attr({
            onclick: "changeReviewGradient()"
        })
        .style({
            width: "100%"
        })
        .text("Change Colors");

    reviewDiv.append("br");
    
    reviewDiv.append("text")
        .text("Weight by");

    reviewDiv.append("br");
    
    reviewDiv.append("input")
        .attr({
            type: "radio",
            name: "reviewWeighting",
            value: "None",
            onclick: "setReviewNoWeighting()"
        });
        
    reviewDiv.append("text")
        .text("None");
        
    reviewDiv.append("br");

    reviewDiv.append("input")
        .attr({
            type: "radio",
            name: "reviewWeighting",
            value: "Good",
            onclick: "setReviewGoodWeighting()"
        });
    
    reviewDiv.append("text")
        .text("Good");

    reviewDiv.append("input")
        .attr({
            type: "radio",
            name: "reviewWeighting",
            value: "Surprise",
            onclick: "setReviewSurpriseWeighting()"
        });
    
    reviewDiv.append("text")
        .text("Surprise");

    reviewDiv.append("input")
        .attr({
            type: "radio",
            name: "reviewWeighting",
            value: "Hyped",
            onclick: "setReviewHypedWeighting()"
        });
    
    reviewDiv.append("text")
        .text("Hyped");

    reviewDiv.append("input")
        .attr({
            type: "radio",
            name: "reviewWeighting",
            value: "Bad",
            onclick: "setReviewBadWeighting()"
        });
    
    reviewDiv.append("text")
        .text("Bad");
    
    reviewDiv.append("br");
    
    reviewDiv.append("input")
        .attr({
            type: "radio",
            name: "reviewWeighting",
            value: "Fans",
            onclick: "setReviewFansWeighting()"
        });
        
    reviewDiv.append("text")
        .text("Fans");
    
    businessDiv.append("button")
        .attr({
            onclick: "toggleBusinessHeatmap()"
        })
        .style({
            width: "100%"
        })
        .text("Toggle Business Heatmap");

    businessDiv.append("button")
        .attr({
            onclick: "changeBusinessGradient()"
        })
        .style({
            width: "100%"
        })
        .text("Change Colors");
    
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

function updateReviewDetailDisplay(extent) {
    var reviewsPerDate;
    if(extent === null)
        reviewsPerDate = reviewDates.all();
    else {
        reviewsPerDate = reviewDates.all().filter(function(d, i) {
            return d.key >= extent[0].getTime() && d.key <= extent[1].getTime();
        });
    }
    
    reviewDetailDisplay.selectAll("*").remove();
    
    // Scales
    var xScale = d3.time.scale()
        .domain([d3.min(reviewsPerDate, function(d) { return d.key; }),
            d3.max(reviewsPerDate, function(d) { return d.key; })])
        .range([0, 400]);

    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient("bottom")
        .tickSize(1)
        .ticks(5);
    
    var yScale = d3.scale.linear()
        .domain([0, d3.max(reviewsPerDate, function(d) { return d.value; })])
        .range([120, 0]);

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left")
        .tickSize(1)
        .ticks(5);

    reviewDetailDisplay.append("text")
        .attr({
            class: "infoHeader",
            x: 240,
            y: 25,
            "text-anchor": "middle"
        })
        .text("Reviews Per Day");

    reviewDetailDisplay.append("g")
        .attr("transform", "translate(49, 170)")
        .attr("class", "axis")
        .call(xAxis);

    reviewDetailDisplay.append("g")
        .attr("transform", "translate(49, 50)")
        .attr("class", "axis")
        .call(yAxis);

    var bars = reviewDetailDisplay.append("g")
            .attr("transform", "translate(50, 50)");

    // Enter
    bars.selectAll("rect")
        .data(reviewsPerDate)
        .enter()
        .append("rect")
        .attr("x", function(d, i) {
            return i * (400 / reviewsPerDate.length);
        })
        .attr("y", function(d) {
            return yScale(d.value);
        })
        .attr("width", (400 / reviewsPerDate.length))
        .attr("height", function(d) {
            return 120 - yScale(d.value);
        })
        .attr("fill", "steelblue");
}

function updateBusinessDetailDisplay(extent) {
    var businessesPerReviewAmount;
    if(extent === null)
        businessesPerReviewAmount = businessReviewAmounts.all();
    else {
        businessesPerReviewAmount = businessReviewAmounts.all().filter(function(d, i) {
            return d.key >= extent[0] && d.key <= extent[1];
        });
    }
    
    businessDetailDisplay.selectAll("*").remove();
    
    // Scales
    var xScale = d3.scale.linear()
        .domain([0, d3.max(businessesPerReviewAmount, function(d) { return d.key; })])
        .range([0, 400]);

    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient("bottom")
        .tickSize(1)
        .ticks(5);
    
    var yScale = d3.scale.linear()
        .domain([0, d3.max(businessesPerReviewAmount, function(d) { return d.value; })])
        .range([120, 0]);

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left")
        .tickSize(1)
        .ticks(5);

    businessDetailDisplay.append("text")
        .attr({
            class: "infoHeader",
            x: 240,
            y: 25,
            "text-anchor": "middle"
        })
        .text("Businesses Per Review Count");

    businessDetailDisplay.append("g")
        .attr("transform", "translate(49, 170)")
        .attr("class", "axis")
        .call(xAxis);

    businessDetailDisplay.append("g")
        .attr("transform", "translate(49, 50)")
        .attr("class", "axis")
        .call(yAxis);

    var bars = businessDetailDisplay.append("g")
            .attr("transform", "translate(50, 50)");

    // Enter
    bars.selectAll("rect")
        .data(businessesPerReviewAmount)
        .enter()
        .append("rect")
        .attr("x", function(d, i) {
            return i * (400 / businessesPerReviewAmount.length);
        })
        .attr("y", function(d) {
            return yScale(d.value);
        })
        .attr("width", (400 / businessesPerReviewAmount.length))
        .attr("height", function(d) {
            return 120 - yScale(d.value);
        })
        .attr("fill", "steelblue");
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

function changeReviewGradient() {
  var gradient = [
    'rgba(0, 0, 0, 0)',
    'rgba(0, 0, 255, 1)',
    'rgba(0, 255, 255, 1)',
    'rgba(0, 255, 0, 1)'
  ];
  reviewHeatmap.set('gradient', reviewHeatmap.get('gradient') ? null : gradient);
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

function changeBusinessGradient() {
  var gradient = [
    'rgba(0, 0, 0, 0)',
    'rgba(0, 0, 255, 1)',
    'rgba(0, 255, 255, 1)',
    'rgba(0, 255, 0, 1)'
  ];
  businessHeatmap.set('gradient', businessHeatmap.get('gradient') ? null : gradient);
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

function setReviewNoWeighting() {
    reviewLocations.reduce(reduceAdd, reduceRemove, reduceInitial);
    updateReviewHeatmap();
}

function setReviewGoodWeighting() {
    reviewLocations.reduce(reduceAddText(0), reduceRemoveText(0), reduceInitial);
    updateReviewHeatmap();
}

function setReviewSurpriseWeighting() {
    reviewLocations.reduce(reduceAddText(1), reduceRemoveText(1), reduceInitial);
    updateReviewHeatmap();
}

function setReviewHypedWeighting() {
    reviewLocations.reduce(reduceAddText(2), reduceRemoveText(2), reduceInitial);
    updateReviewHeatmap();
}

function setReviewBadWeighting() {
    reviewLocations.reduce(reduceAddText(3), reduceRemoveText(3), reduceInitial);
    updateReviewHeatmap();
}

function setReviewFansWeighting() {
    reviewLocations.reduce(reduceAddSum("f"), reduceRemoveSum("f"), reduceInitial);
    updateReviewHeatmap();
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

function reduceAddDeviation(attr) {
    return function(p,v) {
        return p + (2.5 - Math.abs((2.5 - v[attr])));
    };
}

function reduceRemoveDeviation(attr) {
    return function(p,v) {
        return p - (2.5 - Math.abs((2.5 - v[attr])));
    };
}

function reduceAddText(attr) {
    return function(p,v) {
        if(v.text === "")
            return p;
        else {
            var words = v.text.split(" ");
            return p + (+words[attr]);
        }
    };
}

function reduceRemoveText(attr) {
  return function(p,v) {
        if(v.text === "")
            return p;
        else {
            var words = v.text.split(" ");
            return p - (+words[attr]);
        }
    };
}

function reduceInitial() {
    return 0;
}