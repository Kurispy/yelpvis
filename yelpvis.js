var user, business, remaining = 2;

// Displays a map with bus route overlays
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

d3.json("data/user.json", function(data) {
    user = data;
    if(!--remaining)
        processData();
});

d3.json("data/business.json", function(data) {
    business = data;
    if(!--remaining)
        processData();
});

// Main function
function processData() {
    initMapDisplay();
}

function initMapDisplay() {
    var mapOptions = {
      center: new google.maps.LatLng(33.451162, -112.061603),
      zoom: 10
    };
    var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
    
    business.forEach(function(d, i){
        var marker = new google.maps.Marker({
            position: new google.maps.LatLng(d.latitude, d.longitude),
            map: map
        });
    });
}