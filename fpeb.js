const urls = {
    map: "states-albers-10m.json",
  
    airports:
      "https://raw.githubusercontent.com/kespinal83/project_datavis78000/main/airports.csv",

    flights:
      "https://raw.githubusercontent.com/kespinal83/project_datavis78000/main/flights.csv",
  };
  
  const svg  = d3.select("svg");
  const width  = parseInt(svg.attr("width"));
  const height = parseInt(svg.attr("height"));
  const hypotenuse = Math.sqrt(width * width + height * height);
  const projection = d3.geoAlbers().scale(1440).translate([480, 300]);
  
  const scales = {
    airports: d3.scaleSqrt()
      .range([4, 18]),

    segments: d3.scaleLinear()
      .domain([0, hypotenuse])
      .range([1, 10])
  };
  
  const g = {
    basemap:  svg.select("g#basemap"),
    flights:  svg.select("g#flights"),
    airports: svg.select("g#airports"),
    voronoi:  svg.select("g#voronoi")
  };
  
  console.assert(g.basemap.size()  === 1);
  console.assert(g.flights.size()  === 1);
  console.assert(g.airports.size() === 1);
  console.assert(g.voronoi.size()  === 1);
  
  const tooltip = d3.select("text#tooltip");
  console.assert(tooltip.size() === 1);
  
  d3.json(urls.map).then(drawMap);
  
  const promises = [
    d3.csv(urls.airports, typeAirport),
    d3.csv(urls.flights,  typeFlight)
  ];
  
  Promise.all(promises).then(processData);
  
  function processData(values) {
    console.assert(values.length === 2);
  
    let airports = values[0];
    let flights  = values[1];
  
    console.log("airports: " + airports.length);
    console.log(" flights: " + flights.length);
  
    let iata = new Map(airports.map(node => [node.iata, node]));
  
    flights.forEach(function(link) {
      link.source = iata.get(link.origin);
      link.target = iata.get(link.destination);
  
      link.source.outgoing += link.count;
      link.target.incoming += link.count;
    });
  
    let old = airports.length;
    airports = airports.filter(airport => airport.x >= 0 && airport.y >= 0);
    console.log(" removed: " + (old - airports.length) + " airports out of bounds");
  
    old = airports.length;
    airports = airports.filter(airport => airport.state !== "NA");
    console.log(" removed: " + (old - airports.length) + " airports with NA state");
  
    old = airports.length;
    airports = airports.filter(airport => airport.outgoing > 0 && airport.incoming > 0);
    console.log(" removed: " + (old - airports.length) + " airports without flights");

    airports.sort((a, b) => d3.descending(a.outgoing, b.outgoing));
  
    old = airports.length;
    airports = airports.slice(0, 50);
    console.log(" removed: " + (old - airports.length) + " airports with low outgoing degree");
  
    drawAirports(airports);
    drawPolygons(airports);

    iata = new Map(airports.map(node => [node.iata, node]));
  
    old = flights.length;
    flights = flights.filter(link => iata.has(link.source.iata) && iata.has(link.target.iata));
    console.log(" removed: " + (old - flights.length) + " flights");
  
    drawFlights(airports, flights);
  
    console.log({airports: airports});
    console.log({flights: flights});
  }
  
  function drawMap(map) {
    map.objects.states.geometries = map.objects.states.geometries.filter(isContinental);
    let land = topojson.merge(map, map.objects.states.geometries);
    let path = d3.geoPath();

    g.basemap.append("path")
      .datum(land)
      .attr("class", "land")
      .attr("d", path);
  
    g.basemap.append("path")
      .datum(topojson.mesh(map, map.objects.states, (a, b) => a !== b))
      .attr("class", "border interior")
      .attr("d", path);
  
    g.basemap.append("path")
      .datum(topojson.mesh(map, map.objects.states, (a, b) => a === b))
      .attr("class", "border exterior")
      .attr("d", path);
  }
  
  function drawAirports(airports) {
    const extent = d3.extent(airports, d => d.outgoing);
    scales.airports.domain(extent);
  
    g.airports.selectAll("circle.airport")
      .data(airports, d => d.iata)
      .enter()
      .append("circle")
      .attr("r",  d => scales.airports(d.outgoing))
      .attr("cx", d => d.x) 
      .attr("cy", d => d.y) 
      .attr("class", "airport")
      .each(function(d) {
        d.bubble = this;
      });
  }
  
  function drawPolygons(airports) {
    const geojson = airports.map(function(airport) {
      return {
        type: "Feature",
        properties: airport,
        geometry: {
          type: "Point",
          coordinates: [airport.longitude, airport.latitude]
        }
      };
    });
  
    const polygons = d3.geoVoronoi().polygons(geojson);
    console.log(polygons);
  
    g.voronoi.selectAll("path")
      .data(polygons.features)
      .enter()
      .append("path")
      .attr("d", d3.geoPath(projection))
      .attr("class", "voronoi")
      .on("mouseover", function(d) {
        let airport = d.properties.site.properties;
  
        d3.select(airport.bubble)
          .classed("highlight", true);
  
        d3.selectAll(airport.flights)
          .classed("highlight", true)
          .raise();
  
        tooltip.style("display", null);
        tooltip.style("visibility", "hidden");
        tooltip.attr("text-anchor", "middle");
        tooltip.attr("dy", -scales.airports(airport.outgoing) - 4);
        tooltip.attr("x", airport.x);
        tooltip.attr("y", airport.y);
  
        tooltip.text(airport.name + " in " + airport.city + ", " + airport.state);
  
        let bbox = tooltip.node().getBBox();
  
        if (bbox.x <= 0) {
          tooltip.attr("text-anchor", "start");
        }
        else if (bbox.x + bbox.width >= width) {
          tooltip.attr("text-anchor", "end");
        }
  
        tooltip.style("visibility", "visible");
      })
      .on("mouseout", function(d) {
        let airport = d.properties.site.properties;
  
        d3.select(airport.bubble)
          .classed("highlight", false);
  
        d3.selectAll(airport.flights)
          .classed("highlight", false);
  
        d3.select("text#tooltip").style("visibility", "hidden");
      })
      .on("dblclick", function(d) {
        let toggle = d3.select(this).classed("highlight");
        d3.select(this).classed("highlight", !toggle);
      });
  }
  
  function drawFlights(airports, flights) {
    let bundle = generateSegments(airports, flights);

    let line = d3.line()
      .curve(d3.curveBundle)
      .x(airport => airport.x)
      .y(airport => airport.y);
  
    let links = g.flights.selectAll("path.flight")
      .data(bundle.paths)
      .enter()
      .append("path")
      .attr("d", line)
      .attr("class", "flight")
      .each(function(d) {
        d[0].flights.push(this);
      });
  
    let layout = d3.forceSimulation()
      .alphaDecay(0.1)
      .force("charge", d3.forceManyBody()
        .strength(10)
        .distanceMax(scales.airports.range()[1] * 2)
      )
      .force("link", d3.forceLink()
        .strength(0.7)
        .distance(0)
      )
      .on("tick", function(d) {
        links.attr("d", line);
      })
      .on("end", function(d) {
        console.log("layout complete");
      });
  
    layout.nodes(bundle.nodes).force("link").links(bundle.links);
  }
  
  function generateSegments(nodes, links) {
    let bundle = {nodes: [], links: [], paths: []};
  
    bundle.nodes = nodes.map(function(d, i) {
      d.fx = d.x;
      d.fy = d.y;
      return d;
    });
  
    links.forEach(function(d, i) {
      let length = distance(d.source, d.target);

      let total = Math.round(scales.segments(length));
  
      let xscale = d3.scaleLinear()
        .domain([0, total + 1]) 
        .range([d.source.x, d.target.x]);
  
      let yscale = d3.scaleLinear()
        .domain([0, total + 1])
        .range([d.source.y, d.target.y]);
  
      let source = d.source;
      let target = null;
  
      let local = [source];
  
      for (let j = 1; j <= total; j++) {
        target = {
          x: xscale(j),
          y: yscale(j)
        };
  
        local.push(target);
        bundle.nodes.push(target);
  
        bundle.links.push({
          source: source,
          target: target
        });
  
        source = target;
      }
  
      local.push(d.target);
  
      bundle.links.push({
        source: target,
        target: d.target
      });
  
      bundle.paths.push(local);
    });
  
    return bundle;
  }
  
  function isContinental(state) {
    const id = parseInt(state.id);
    return id < 60 && id !== 2 && id !== 15;
  }
  
  function typeAirport(airport) {
    airport.longitude = parseFloat(airport.longitude);
    airport.latitude  = parseFloat(airport.latitude);
  
    const coords = projection([airport.longitude, airport.latitude]);
    airport.x = coords[0];
    airport.y = coords[1];
  
    airport.outgoing = 0;  
    airport.incoming = 0;  
  
    airport.flights = [];  
  
    return airport;
  }
  
  function typeFlight(flight) {
    flight.count = parseInt(flight.count);
    return flight;
  }
  
  function distance(source, target) {
    const dx2 = Math.pow(target.x - source.x, 2);
    const dy2 = Math.pow(target.y - source.y, 2);
  
    return Math.sqrt(dx2 + dy2);
  }