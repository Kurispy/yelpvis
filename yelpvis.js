var businessData, reviewData, remaining = 2;
var review, reviews, reviewByDate, reviewDates, reviewByLocation, reviewLocations;
var business, businessByLocation, businessLocations;
var map, reviewHeatmap, businessHeatmap;
var click = 0;
var markers = [];

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
    
var detailViewDisplay = d3.select("body").append("div")
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
    
var calHeatMapDisplay = d3.select("body").append("div")
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
    });
    
var calHeatMap = calHeatMapDisplay.append("div")
    .attr({
        id: "cal-heatmap"
    });

var button = calHeatMap.append("button")
    .attr("id", "business-name")
    .attr("class", "infoHeader");
    

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
    updateDetailViewDisplay(null);
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
            
            updateDetailViewDisplay(brush.extent());
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

function updateDetailViewDisplay(extent) {
    var reviewsPerDate;
    if(extent === null)
        reviewsPerDate = reviewDates.all();
    else {
        reviewsPerDate = reviewDates.all().filter(function(d, i) {
            return d.key >= extent[0].getTime() && d.key <= extent[1].getTime();
        });
    }
    
    detailViewDisplay.selectAll("*").remove();
    
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

    detailViewDisplay.append("text")
        .attr({
            class: "infoHeader",
            x: 240,
            y: 25,
            "text-anchor": "middle"
        })
        .text("Reviews Per Day");

    detailViewDisplay.append("g")
        .attr("transform", "translate(49, 170)")
        .attr("class", "axis")
        .call(xAxis);

    detailViewDisplay.append("g")
        .attr("transform", "translate(49, 50)")
        .attr("class", "axis")
        .call(yAxis);

    var bars = detailViewDisplay.append("g")
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
    if(markers.length != 0) {
        markers[0].setMap(null);
        markers = [];
    }
    businessLocations.reduce(reduceAdd, reduceRemove, reduceInitial);
    updateBusinessHeatmap();
    document.getElementById("cal-heatmap").style.display = 'none';
}

function setBusinessStarWeighting() {
    if(markers.length != 0) {
        markers[0].setMap(null);
        markers = [];
    }
    businessLocations.reduce(reduceAddSum("stars"), reduceRemoveSum("stars"), reduceInitial);
    click = 0;
    updateBusinessHeatmap();
    document.getElementById("cal-heatmap").style.display = 'block';
    document.getElementById("business-name").innerHTML = "Bertha's Cafe";
    cal.update({"1401609600": 4,"1401958800": 5,"1401804000": 5,"1401778800": 1,"1401962400": 5,
        "1402124400": 1,"1401980400": 1,"1401606000": 2,"1401886800": 4,"1401861600": 1,"1401800400": 7,
        "1401692400": 3,"1402045200": 29,"1402138800": 2,"1401883200": 22,"1401717600": 1,"1401696000": 5,
        "1401973200": 7,"1402149600": 2,"1401904800": 1,"1401714000": 9,"1401894000": 1,"1402041600": 5,
        "1401645600": 1,"1401613200": 4,"1401616800": 5,"1402128000": 3,"1401811200": 1,"1401796800": 11,
        "1401710400": 11,"1401652800": 1,"1401793200": 10,"1402034400": 1,"1401876000": 8,"1401789600": 5,
        "1401879600": 9,"1401706800": 14,"1401699600": 4,"1401890400": 1,"1402056000": 21,"1401688800": 2,
        "1401948000": 2,"1401786000": 4,"1401955200": 1,"1402038000": 3,"1401976800": 4,"1402052400": 20,
        "1401627600": 4,"1401872400": 5,"1401969600": 19,"1402117200": 1,"1401624000": 13,"1401868800": 2,
        "1401782400": 9,"1401721200": 3,"1402059600": 24,"1401966000": 16,"1402167600": 1,"1402063200": 2,
        "1401620400": 8,"1401631200": 1,"1401703200": 5,"1402048800": 34});
    var contentString = '<div id="content"><div id="businessName" class="markerText">Business Name: Bertha\'s Cafe</div>' +
            '<div id="numReviews" class="markerText">Reviews: 177</div>' +
            '<div id="numStars" class="markerText">Stars: 4.5</div>' +
            '<div id="category" class="markerText">Categories: Bakeries, Food, Breakfast & Brunch, Sandwiches, Restaurants</div>' + '</div>';
    var infowindow = new google.maps.InfoWindow({
        content: contentString
    });
    var marker = new google.maps.Marker({
        position: new google.maps.LatLng(33.4952159,-112.014454),
        map: map,
        title: "Bertha's Cafe"
    });
    google.maps.event.addListener(marker, 'click', function(){
        map.setCenter(marker.getPosition());
        infowindow.open(map,marker);
    });
    map.setCenter(marker.getPosition());
    infowindow.open(map,marker);
    markers.push(marker);
    click++;
}

$("#business-name").on("click", function(){
    if(document.getElementById("business-name").innerHTML != "Pizzeria Bianco") {
        $.getJSON("data/popular_star.json", function(json){
            document.getElementById("business-name").innerHTML = json[click]["name"];
            cal.update(json[click]["checkin_time"]);
            if(markers.length != 0) {
                markers[0].setMap(null);
                markers = [];
            }

            var contentString = '<div id="content"><div id="businessName" class="markerText">Business Name: ' + json[click]["name"] + '</div>' +
            '<div id="numReviews" class="markerText">Reviews: ' + json[click]["review_count"] + '</div>' +
            '<div id="numStars" class="markerText">Stars: ' + json[click]["stars"] + '</div>' +
            '<div id="category" class="markerText">Categories: ' + json[click]["categories"] + '</div>' + '</div>';

            var infowindow = new google.maps.InfoWindow({
                content: contentString
            });

            var marker = new google.maps.Marker({
                position: new google.maps.LatLng(json[click]["latitude"],json[click]["longitude"]),
                map: map,
                title: json[click]["name"]
            });
            google.maps.event.addListener(marker, 'click', function(){
                map.setCenter(marker.getPosition());
                infowindow.open(map,marker);
            });
            map.setCenter(marker.getPosition());
            infowindow.open(map,marker);
            markers.push(marker);

            // update iterator
            click+=1;
            if(click == 74)
                click = 0;
        });
    }
});

function setBusinessReviewCountWeighting() {
    if(markers.length != 0){
        markers[0].setMap(null);
        markers = [];
    }
    businessLocations.reduce(reduceAddSum("review_count"), reduceRemoveSum("review_count"), reduceInitial);
    updateBusinessHeatmap();
    document.getElementById("cal-heatmap").style.display = 'block';
    document.getElementById("business-name").innerHTML = "Pizzeria Bianco";
    cal.update({"1401984000": 19,"1401638400": 9,"1401642000": 10,"1402092000": 4,"1401876000": 10,
        "1402081200": 29,"1401886800": 10,"1401818400": 34,"1401879600": 13,"1402002000": 17,
        "1401652800": 4,"1402063200": 26,"1402048800": 15,"1401656400": 3,"1401980400": 18,
        "1401660000": 1,"1402120800": 1,"1401814800": 17,"1402095600": 1,"1401706800": 19,
        "1401894000": 12,"1401890400": 11,"1401822000": 29,"1401897600": 19,"1401912000": 18,
        "1402005600": 6,"1401901200": 25,"1401904800": 27,"1402066800": 25,"1401732000": 23,
        "1401915600": 6,"1402167600": 1,"1401908400": 38,"1401796800": 16,"1401703200": 5,
        "1401962400": 6,"1401800400": 13,"1402077600": 25,"1401710400": 17,"1401919200": 5,
        "1401742800": 4,"1401620400": 13,"1401872400": 1,"1401804000": 9,"1401807600": 7,
        "1401735600": 14,"1401987600": 15,"1401811200": 12,"1402070400": 34,"1401699600": 3,
        "1401645600": 13,"1402056000": 26,"1401829200": 19,"1401994800": 21,"1402052400": 21,
        "1401825600": 17,"1401631200": 11,"1401739200": 20,"1401991200": 28,"1402059600": 28,
        "1402038000": 1,"1401717600": 7,"1401728400": 14,"1401969600": 28,"1401649200": 17,
        "1401721200": 13,"1401832800": 1,"1402084800": 23,"1401724800": 17,"1401883200": 16,
        "1402074000": 33,"1401616800": 5,"1401750000": 1,"1401966000": 17,"1401973200": 13,
        "1401624000": 11,"1401789600": 2,"1402088400": 16,"1401627600": 8,"1402135200": 1,
        "1402171200": 2,"1401976800": 12,"1401714000": 5,"1401746400": 1,"1401998400": 29,
        "1401634800": 7,"1401793200": 18,"1402045200": 1});
    var contentString = '<div id="content"><div id="businessName" class="markerText">Business Name: Pizzeria Bianco</div>' +
            '<div id="numReviews" class="markerText">Reviews: 1124</div>' +
            '<div id="numStars" class="markerText">Stars: 4</div>' +
            '<div id="category" class="markerText">Categories: Italian, Pizza, Sandwiches, Restaurants</div>' + '</div>';
    var infowindow = new google.maps.InfoWindow({
        content: contentString
    });
    var marker = new google.maps.Marker({
        position: new google.maps.LatLng(33.449233,-112.065458),
        map: map,
        title: 'Pizzeria Bianco'
    });
    google.maps.event.addListener(marker, 'click', function(){
        map.setCenter(marker.getPosition());
        infowindow.open(map,marker);
    });
    map.setCenter(marker.getPosition());
    infowindow.open(map,marker);
    markers.push(marker);
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