var treeData =
  {
    "name": "Presidential Terms",
    "children": [
      { 
        "name": "Clinton 1st Term",
        "children": [
          { "name": "RM: 208,820" },
          { "name": "RT: 5,159,709" },
        ]
      },
      { 
        "name": "Clinton 2nd Term",
        "children": [
          { "name": "RM: 660,826" },
          { "name": "RT: 6,261,550" },
        ]
      },
      { 
        "name": "Bush 1st Term",
        "children": [
          { "name": "RM: 805,957" },
          { "name": "RT: 4,473,357" },        
        ]
      },
      { 
        "name": "Bush 2nd Term",
        "children": [
          { "name": "RM: 1,206,582" },
          { "name": "RT: 3,842,954" },
        ]
      },
      { 
        "name": "Obama 1st Term",
        "children": [
          { "name": "RM: 1,568,188" },
          { "name": "RT: 1,607,517" },
        ]
      },
      { 
        "name": "Obama 2nd Term",
        "children": [
          { "name": "RM: 1,494,015" },
          { "name": "RT: 578,928" },
        ]
      },
      { 
        "name": "Trump 1st Term",
        "children": [
          { "name": "RM: 1,201,945" },
          { "name": "RT: 599,080" },
        ]
      },
    ]
  };

var margin = {top: 10, right: 0, bottom: 0, left: 120},
    width = 580 - margin.left - margin.right,
    height = 350 - margin.top - margin.bottom;

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate("
          + margin.left + "," + margin.top + ")");

var i = 0,
    duration = 750,
    root;

var treemap = d3.tree().size([height, width]);

root = d3.hierarchy(treeData, function(d) { return d.children; });
root.x0 = height / 2;
root.y0 = 0;

root.children.forEach(collapse);
update(root);
function collapse(d) {
  if(d.children) {
    d._children = d.children
    d._children.forEach(collapse)
    d.children = null
  }
}

function update(source) {

  var treeData = treemap(root);

  var nodes = treeData.descendants(),
      links = treeData.descendants().slice(1);

  nodes.forEach(function(d){ d.y = d.depth * 180});

  var node = svg.selectAll('g.node')
      .data(nodes, function(d) {return d.id || (d.id = ++i); });

  var nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr("transform", function(d) {
        return "translate(" + source.y0 + "," + source.x0 + ")";
    })
    .on('click', click);

  nodeEnter.append('circle')
      .attr('class', 'node')
      .attr('r', 1e-6)
      .style("fill", function(d) {
          return d._children ? "lightsteelblue" : "#fff";
      });

  nodeEnter.append('text')
      .attr("dy", ".35em")
      .attr("transform", "rotate(0)")
      .attr("x", function(d) {
          return d.children || d._children ? -13 : 13;
      })
      .attr("text-anchor", function(d) {
          return d.children || d._children ? "end" : "start";
      })
      .text(function(d) { return d.data.name; });

  var nodeUpdate = nodeEnter.merge(node);

  nodeUpdate.transition()
    .duration(duration)
    .attr("transform", function(d) { 
        return "translate(" + d.y + "," + d.x + ")";
     });

  nodeUpdate.select('circle.node')
    .attr('r', 10)
    .style("fill", function(d) {
        return d._children ? "darkred" : "#fff";
    })
    .attr('cursor', 'pointer');

  var nodeExit = node.exit().transition()
      .duration(duration)
      .attr("transform", function(d) {
          return "translate(" + source.y + "," + source.x + ")";
      })
      .remove();

  nodeExit.select('circle')
    .attr('r', 1e-6);

  nodeExit.select('text')
    .style('fill-opacity', 1e-6);

  var link = svg.selectAll('path.link')
      .data(links, function(d) { return d.id; });

  var linkEnter = link.enter().insert('path', "g")
      .attr("class", "link")
      .attr('d', function(d){
        var o = {x: source.x0, y: source.y0}
        return diagonal(o, o)
      });

  var linkUpdate = linkEnter.merge(link);

  linkUpdate.transition()
      .duration(duration)
      .attr('d', function(d){ return diagonal(d, d.parent) });

  var linkExit = link.exit().transition()
      .duration(duration)
      .attr('d', function(d) {
        var o = {x: source.x, y: source.y}
        return diagonal(o, o)
      })
      .remove();

  nodes.forEach(function(d){
    d.x0 = d.x;
    d.y0 = d.y;
  });

  function diagonal(s, d) {

    path = `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`

    return path
  }

  function click(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
    update(d);
  }
}