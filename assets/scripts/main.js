const width = 1500;
const height = 1000;
const barChartWidth = 800;


let colorMode = 'by-fatalities';
let actorMode = 'actor1'; // Default to Actor 1 and Ally


const tooltip = d3.select("#tooltip");
const svg = d3.select("#africa-map");
const barChartSVG = d3.select("#bar-chart"); 

barChartSVG.attr("width", barChartWidth)
           .attr("height", 500);


svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "white");

const projection = d3.geoMercator()
    .center([20, 0]) // Adjust these values to center the map
    .scale(500)
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

function drawLegend(colorScale, mode) {
    const legendWidth = 280 / 3;  // Divide by 3 as we have three segments
    const legendHeight = 20;
    const legendSvg = d3.select(`#legend-${mode}`);

    // Remove any existing legends
    legendSvg.selectAll("*").remove();

    const thresholds = [100, 1000];
    const colors = [colorScale(50), colorScale(500), colorScale(1500)];  // Mid values for each range

    thresholds.unshift(0);  // Add a starting value

// Draw each segment of the legend
thresholds.forEach((threshold, i) => {
    legendSvg.append("rect")
        .attr("x", legendWidth * i + 10)
        .attr("y", 10)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .attr("fill", colors[i]);

    legendSvg.append("text")
        .attr("x", legendWidth * i + (legendWidth / 2) + 10)
        .attr("y", 45)
        .attr("text-anchor", "middle")
        .text(() => {
            if (i === 0) return "< 100";
            else if (i === 1) return "100 - 1000";
            else return "> 1000";
        });
});
}


// Load the data
Promise.all([
    d3.json("assets/data/africa.geojson"),
    d3.csv("assets/data/african_conflicts_copy.csv")
]).then(([africaData, csvData]) => {

    // Create color scales for fatalities:
    const maxFatalities = d3.max(csvData, d => +d.FATALITIES);

    const colorScaleFatalities = d3.scaleThreshold()
    .domain([100, 1000])
    .range([d3.interpolateReds(0.3), d3.interpolateReds(0.6), d3.interpolateReds(1)]);

    const colorScaleOccurrences = d3.scaleThreshold()
        .domain([100, 1000])
        .range([d3.interpolateBlues(0.3), d3.interpolateBlues(0.6), d3.interpolateBlues(1)]);


    // Create color scales for occurrences:
    const occurrencesCount = csvData.reduce((acc, curr) => {
        acc[curr.country_code] = (acc[curr.country_code] || 0) + 1;
        return acc;
    }, {});
    const maxOccurrences = d3.max(Object.values(occurrencesCount));


    const colorScale = d3.scaleSequential(d3.interpolateReds)
        .domain([0, d3.max(csvData, d => +d.FATALITIES)]);
 

    const africanCountryCodes = [
        "DZA", "AGO", "BEN", "BWA", "BFA", "BDI", "CPV", "CMR", "CAF", "TCD", 
        "COM", "COG", "COD", "DJI", "EGY", "GNQ", "ERI", "SWZ", "ETH", "GAB", 
        "GMB", "GHA", "GIN", "GNB", "CIV", "KEN", "LSO", "LBR", "LBY", "MDG", 
        "MWI", "MLI", "MRT", "MUS", "MAR", "MOZ", "NAM", "NER", "NGA", "RWA", 
        "STP", "SEN", "SYC", "SLE", "SOM", "ZAF", "SSD", "SDN", "TZA", "TGO", 
        "TUN", "UGA", "ZMB", "ZWE"
    ];
    
     // and so on for all African countries
    africaData.features = africaData.features.filter(feature => africanCountryCodes.includes(feature.id));


    // // Join the CSV data with the GeoJSON countries by matching country codes
    africaData.features.forEach(d => {
        const match = csvData.find(row => row.country_code === d.id); // Use d.id instead of d.properties.country_code
        if (match) {
            console.log("Match found for country code:", d.id);
            Object.assign(d.properties, match);
        } else {
            console.log("No match found for country code:", d.id);
        }
    });

    function getFatalitiesForCountryAndYear(data, country_code, year) {
        const filteredData = data.filter(row => row.YEAR === year && row.country_code === country_code);
        const totalFatalities = filteredData.reduce((sum, row) => sum + Number(row.FATALITIES), 0);
        return totalFatalities;
    }


    function getEventDataForYear(data, year) {
        // Filter the data by the selected year
        const filteredData = data.filter(d => d.YEAR === year);
    
        // Group by event type and count occurrences
        const eventCounts = {};
        filteredData.forEach(d => {
            if (!eventCounts[d.EVENT_TYPE]) {
                eventCounts[d.EVENT_TYPE] = 0;
            }
            eventCounts[d.EVENT_TYPE]++;
        });
    
        // Convert the object to an array of { eventType, count }
        return Object.keys(eventCounts).map(key => ({
            eventType: key,
            count: eventCounts[key]
        }));
    }


     // Draw the map
     svg.selectAll("path")
     .data(africaData.features)
     .enter().append("path")
     .attr("d", path)
     .style("fill", d => {
         const selectedYear = d3.select("#year-dropdown").node().value;
         const totalFatalities = getFatalitiesForCountryAndYear(csvData, d.id, selectedYear);
         return colorScale(totalFatalities);
     })
     .attr("stroke", "black") // This adds the boundary between countries
     .attr("stroke-width", "1")
     .on("mouseover", function(event, d) {
         // Find the match for the hovered country in the filtered CSV data
         const selectedYear = d3.select("#year-dropdown").node().value;
         const totalFatalities = getFatalitiesForCountryAndYear(csvData, d.id, selectedYear);
         const matches = csvData.filter(row => row.country_code === d.id && row.YEAR == selectedYear);
         const totalOccurrences = matches.length;

         if (matches.length > 0) {
            // Update tooltip content
            tooltip.html(`
                <strong>Country:</strong> ${d.properties.name} <br>
                <strong>Total Fatalities:</strong> ${totalFatalities} <br>
                <strong>Actors:</strong> ${matches[0].ACTOR1} <br>
                <strong>Total Conflicts:</strong> ${totalOccurrences}
            `);
            
            // Position and show tooltip
            tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px")
                    .style("display", "block");
        }
    })
    .on("mouseout", function() {
        // Hide tooltip
        tooltip.style("display", "none");
    });



      //add country name
      svg.selectAll("text")
      .data(africaData.features)
      .enter().append("text")
      .attr("x", d => {
          const centroid = path.centroid(d);
          const bounds = path.bounds(d);
          const width = bounds[1][0] - bounds[0][0];
          
          // Adjust the x-position based on the width of the country
          return centroid[0] - width * 0.1;
      })
      .attr("y", d => path.centroid(d)[1])
      .attr("text-anchor", "middle")
      .attr("font-size", "8px")  // Adjust font-size to make it smaller
      .attr("fill", "black")
      .text(d => d.properties.name);
  
      // You can also add interactivity, tooltips, etc. here.
  
      drawLegend(colorScaleFatalities, 'fatalities'); // Draw default legend


      d3.select("#by-fatalities").on("click", function() {
        colorMode = 'by-fatalities';
        updateVisualizationForYear(d3.select("#year-dropdown").node().value);
        drawLegend(colorScaleFatalities, 'fatalities');
        d3.select("#by-fatalities").classed("active", true);
        d3.select("#by-occurrences").classed("active", false);
    });
    
    d3.select("#by-occurrences").on("click", function() {
        colorMode = 'by-occurrences';
        updateVisualizationForYear(d3.select("#year-dropdown").node().value);
        drawLegend(colorScaleOccurrences, 'occurrences');
        d3.select("#by-fatalities").classed("active", false);
        d3.select("#by-occurrences").classed("active", true);
    });

// Function to update the visualization based on the selected year:
function updateVisualizationForYear(year) {
    const filteredData = csvData.filter(row => row.YEAR === year);

    if(colorMode === 'by-fatalities') {
        // color based on fatalities
        svg.selectAll("path")
            .style("fill", d => {
                const totalFatalities = getFatalitiesForCountryAndYear(csvData, d.id, year);
                if(totalFatalities === 0) {
                    return "white";
                }
                return colorScaleFatalities(totalFatalities);
            });
    } else if(colorMode === 'by-occurrences') {
        // color based on occurrences
        svg.selectAll("path")
            .style("fill", d => {
                const occurrences = filteredData.filter(row => row.country_code === d.id).length;
                if(occurrences === 0) {
                    return "white";
                }
                return colorScaleOccurrences(occurrences);
            });
    }
}


function drawBarChartForYear(year) {
    // Filter data for the selected year
    const yearData = csvData.filter(d => d.YEAR == year);

    // Create a dictionary to store actor-ally pairs and their counts
    const actorAllyCounts = {};

    yearData.forEach(d => {
        let actor, ally;
        if (actorMode === 'actor1') {
            actor = d.ACTOR1;
            ally = d.ALLY_ACTOR_1;
        } else {
            actor = d.ACTOR2;
            ally = d.ALLY_ACTOR_2;
        }

        if (!actorAllyCounts[actor]) {
            actorAllyCounts[actor] = {};
        }
        if (ally && !actorAllyCounts[actor][ally]) {
            actorAllyCounts[actor][ally] = 0;
        }
        if (ally) {
            actorAllyCounts[actor][ally]++;
        }
    });

    // Convert the dictionary to a flat data structure suitable for D3
    const flattenedData = [];
    Object.keys(actorAllyCounts).forEach(actor => {
        const allies = actorAllyCounts[actor];
        Object.keys(allies).forEach(ally => {
            flattenedData.push({
                actor: actor,
                ally: ally,
                count: allies[ally]
            });
        });
    });

    // Sort the data and get the top 5
    const top5 = flattenedData.sort((a, b) => b.count - a.count).slice(0, 5);

    // Set up SVG for the bar chart
    const barChartSVG = d3.select("#bar-chart");
    barChartSVG.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 100, left: 60 };  // Adjusted bottom margin
    const width = barChartWidth - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Define scales
    const xScale = d3.scaleBand()
        .domain(top5.map(d => `${d.actor} and ${d.ally}`))
        .range([margin.left, width - margin.right])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(top5, d => d.count)])
        .range([height - margin.bottom, margin.top]);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Draw bars
    barChartSVG.selectAll("rect")
        .data(top5)
        .enter().append("rect")
        .attr("x", d => xScale(`${d.actor} and ${d.ally}`))
        .attr("y", d => yScale(d.count))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - margin.bottom - yScale(d.count))
        .attr("fill", d => colorScale(d.ally));

    // Add axes
    const xAxis = d3.axisBottom(xScale);

    barChartSVG.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(xAxis)
        .selectAll("text")
        .remove();  // Remove the default single-line labels

    // Add multi-line x-axis labels
    barChartSVG.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)  // Reset vertical positioning of labels
    .selectAll("g")
    .data(top5)
    .enter().append("g")
    .attr("transform", d => `translate(${xScale(`${d.actor} and ${d.ally}`) + xScale.bandwidth() / 2}, 0)`)
    .append("text")
    .attr("text-anchor", "end")
    .attr("dy", ".35em") // To vertically center the text
    .attr("transform", "rotate(-40)") // Rotate the labels
    .style("font-size", "6px")
    .selectAll("tspan")
    .data(d => [d.actor, `(${d.ally})`]) // Split into actor and ally lines
    .enter().append("tspan")
    .attr("x", 0)
    .attr("dy", "1.4em")  // Space out vertically even more
    .text(d => d);

    // Add y-axis
    barChartSVG.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale));

    // Add title
    barChartSVG.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text(`Top Actor-Ally Combinations for ${year}`);
}




d3.select("#actor1-toggle").on("click", function() {
    actorMode = 'actor1';
    drawBarChartForYear(d3.select("#year-dropdown").node().value);
    d3.select("#actor1-toggle").classed("active", true);
    d3.select("#actor2-toggle").classed("active", false);
});

d3.select("#actor2-toggle").on("click", function() {
    actorMode = 'actor2';
    drawBarChartForYear(d3.select("#year-dropdown").node().value);
    d3.select("#actor1-toggle").classed("active", false);
    d3.select("#actor2-toggle").classed("active", true);
});


function drawHistogram(year) {
    const data = getEventDataForYear(csvData, year);

    const svg = d3.select("#histogram");
    svg.selectAll("*").remove();  // Clear previous histogram

    const margin = { top: 20, right: 20, bottom: 60, left: 50 };
    const width = 520 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const xScale = d3.scaleBand()
        .domain(data.map(d => d.eventType))
        .range([0, width])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)])
        .range([height, 0]);

        g.selectAll("rect")
        .data(data)
        .enter().append("rect")
        .attr("x", d => xScale(d.eventType))
        .attr("y", d => yScale(d.count))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - yScale(d.count))
        .attr("fill", "steelblue");

    // Add x-axis
    g.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale).tickSize(0))
        .selectAll("text")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)")
        .style("text-anchor", "end")
        .style("font-size", "12px");

    // Add y-axis
    g.append("g")
        .call(d3.axisLeft(yScale));

    // Add title
    g.append("text")
        .attr("x", (width / 2))             
        .attr("y", -10)
        .attr("text-anchor", "middle")  
        .style("font-size", "14px") 
        .style("font-weight", "bold")  
        .text(`Conflict Types for ${year}`);
    }

    d3.select("#year-dropdown").on("change", function() {
        const selectedYear = d3.select(this).node().value;
        updateVisualizationForYear(selectedYear);
        drawHistogram(selectedYear);
        drawBarChartForYear(selectedYear);
    });
    
    d3.select("#by-fatalities").classed("active", true);  // Mark the default mode as active
    
    const defaultYear = d3.select("#year-dropdown").node().value;
    drawHistogram(defaultYear);

    drawBarChartForYear(d3.select("#year-dropdown").node().value);

    
    
    }).catch(error => {
        console.error("Error loading data:", error);
    });

     


    
    


