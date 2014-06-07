var dataURL = "./data/updated_business.json";
$.getJSON(dataURL, function(data) {
    var myLatlng = new google.maps.LatLng(33.485428,-112.061766);
    var mapOptions = {
      zoom: 7,
      center: myLatlng
    };
    var map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
    var markers = [];
    var markerClusterer;
    for(var i = 0; i < data.length; i++) {
        var lat = data[i].latitude;
        var lon = data[i].longitude;
        var name = data[i].name;
        var star = data[i].stars;
        var count = data[i].review_count;
        var infowindow = new google.maps.InfoWindow();

        myLatlng = new google.maps.LatLng(lat, lon);

        var contentString = '<div id="content">'+
            '<div id="siteNotice">'+
            '</div>'+
            '<h1 id="firstHeading" class="firstHeading">' + 'Business Name: ' + name + '</h1>'+
            '<h1 id="secondHeading" class="secondHeading">' + 'Average User Review: ' + star + '</h1>'+
            '<h1 id="thirdHeading" class="thirdHeading">' + 'Number of Reviews: ' + count + '</h1>'+
            '</div>';


        var marker = new google.maps.Marker({
            position: myLatlng,
            map: map,
            title: name
        });

        markers.push(marker);

        google.maps.event.addListener(marker, 'click', (function(marker, i) {
            return function() {
              infowindow.setContent(contentString);
              infowindow.open(map, marker);
            }
        })(marker, i));
    }
    markerClusterer = new MarkerClusterer(map, markers, mapOptions);
});

        // google.maps.event.addDomListener(window, 'load', initialize);
