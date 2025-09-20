import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './CirclePacking.css';

const CirclePacking = ({ data }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Get container dimensions
    const container = svgRef.current.parentElement;
    const containerRect = container.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    // Create the color scale
    const color = d3.scaleLinear()
      .domain([0, 5])
      .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
      .interpolate(d3.interpolateHcl);

    // Compute the layout
    const pack = data => d3.pack()
      .size([width, height])
      .padding(3)
      (d3.hierarchy(data)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value));
    
    const root = pack(data);

    // Create the SVG container
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("style", `display: block; background: ${color(0)}; cursor: pointer;`);

    // Append the nodes
    const node = svg.append("g")
      .selectAll("circle")
      .data(root.descendants().slice(1))
      .join("circle")
      .attr("fill", d => d.children ? color(d.depth) : "white")
      .attr("pointer-events", d => !d.children ? "none" : null)
      .on("mouseover", function() { d3.select(this).attr("stroke", "#000"); })
      .on("mouseout", function() { d3.select(this).attr("stroke", null); })
      .on("click", (event, d) => focus !== d && (zoom(event, d), event.stopPropagation()));

    // Append the text labels
    const label = svg.append("g")
      .style("font", "10px sans-serif")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .selectAll("text")
      .data(root.descendants())
      .join("text")
      .style("fill-opacity", d => d.parent === root ? 1 : 0)
      .style("display", d => d.parent === root ? "inline" : "none")
      .text(d => d.data.name);

    // Create the zoom behavior and set initial view to show all circles
    svg.on("click", (event) => zoom(event, root));
    let focus = root;
    let view;
    
    // Set initial view to show the entire root circle (all circles visible)
    const initialRadius = Math.max(root.r, width/2, height/2);
    zoomTo([root.x, root.y, initialRadius * 2]);

    function zoomTo(v) {
      const k = width / v[2];
      view = v;

      label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
      node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
      node.attr("r", d => d.r * k);
    }

    function zoom(event, d) {
      const focus0 = focus;
      focus = d;

      const transition = svg.transition()
        .duration(event.altKey ? 7500 : 750)
        .tween("zoom", d => {
          const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
          return t => zoomTo(i(t));
        });

      label
        .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
        .transition(transition)
        .style("fill-opacity", d => d.parent === focus ? 1 : 0)
        .on("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
        .on("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
    }

    // Handle window resize
    const handleResize = () => {
      if (!svgRef.current || !data) return;
      
      const container = svgRef.current.parentElement;
      const containerRect = container.getBoundingClientRect();
      const newWidth = containerRect.width;
      const newHeight = containerRect.height;
      
      // Update SVG dimensions
      svg.attr("viewBox", `-${newWidth / 2} -${newHeight / 2} ${newWidth} ${newHeight}`);
      
      // Recompute layout with new dimensions
      const newPack = data => d3.pack()
        .size([newWidth, newHeight])
        .padding(3)
        (d3.hierarchy(data)
          .sum(d => d.value)
          .sort((a, b) => b.value - a.value));
      
      const newRoot = newPack(data);
      
      // Update nodes and labels with new positions
      const newNodes = svg.select("g").selectAll("circle")
        .data(newRoot.descendants().slice(1));
      
      newNodes
        .transition()
        .duration(750)
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .attr("r", d => d.r);
      
      const newLabels = svg.select("g").selectAll("text")
        .data(newRoot.descendants());
      
      newLabels
        .transition()
        .duration(750)
        .attr("transform", d => `translate(${d.x},${d.y})`);
      
      // Update focus and view to show all circles
      focus = newRoot;
      const newInitialRadius = Math.max(newRoot.r, newWidth/2, newHeight/2);
      view = [focus.x, focus.y, newInitialRadius * 2];
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      svg.selectAll("*").remove();
    };
  }, [data]);

  return (
    <div className="circle-packing-container">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default CirclePacking;
