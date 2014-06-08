var click = 0;
var cal = new CalHeatMap();

// change click to get business id
$.getJSON("data/checkin.json", function(json){
    document.getElementById("business-name").innerHTML = json[click]["business_id"];
    cal.init({
        itemSelector: "#cal-heatmap",
        domain: "day",
        rowLimit: 1,
        domainGutter: 0,
        data: json[click]["checkin_time"],
        start: new Date(2014, 5, 1),
        cellSize: 15,
        cellPadding: 5,
        range: 7,
        considerMissingDataAsZero: true,
        verticalOrientation: true,
        displayLegend: true,
        label: {
            position: "left",
            offset: {
                x: 20,
                y: 12
            },
            width: 110
        },
        legend: [1, 2, 3, 4, 5, 10],
        legendColors: ["#ecf5e2", "#232181"]
    });

    $("#business-name").on("click", function(){
        click+=1;
        document.getElementById("business-name").innerHTML = json[click]["business_id"];
        cal.update(json[click]["checkin_time"])
    });
    
    document.getElementById("weekday0").innerHTML = "Sunday";
    document.getElementById("weekday1").innerHTML = "Monday";
    document.getElementById("weekday2").innerHTML = "Tuesday";
    document.getElementById("weekday3").innerHTML = "Wednesday";
    document.getElementById("weekday4").innerHTML = "Thursday";
    document.getElementById("weekday5").innerHTML = "Friday";
    document.getElementById("weekday6").innerHTML = "Saturday"; 
});