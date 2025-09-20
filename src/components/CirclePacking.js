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

    // Create the color scale using chart colors
    const chartColors = ["#748BB8", "#9EAECE", "#D6DDEA", "#B0926D", "#8EA4B7"];
    const color = d3.scaleOrdinal()
      .domain([0, 1, 2, 3, 4])
      .range(chartColors);

    // Compute the layout with horizontal arrangement
    const pack = data => d3.pack()
      .size([width, height])
      .padding(3)
      (d3.hierarchy(data)
        .sum(d => d.value)
        .sort((a, b) => a.value - b.value)); // Reverse sort for horizontal arrangement
    
    const root = pack(data);

    // Create the SVG container
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("style", `display: block; background: #F1F1F2; cursor: pointer;`);

    // Append the nodes
    const node = svg.append("g")
      .selectAll("circle")
      .data(root.descendants().slice(1))
      .join("circle")
      .attr("fill", d => d.children ? color(d.depth % 5) : "white")
      .attr("pointer-events", d => !d.children ? "none" : null)
      .on("mouseover", function() { d3.select(this).attr("stroke", "#000"); })
      .on("mouseout", function() { d3.select(this).attr("stroke", null); })
      .on("click", (event, d) => {
        event.stopPropagation();
        if (focus !== d) {
          zoom(event, d);
        }
      });

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
    svg.on("click", (event) => {
      // If clicking on empty space (not on a circle), return to initial view
      const target = event.target;
      if (target === svg.node()) {
        resetToInitialView();
      }
    });
    let focus = root;
    let view;
    
    // Set initial view to show the entire root circle (all circles visible)
    const initialRadius = Math.max(root.r, width/2, height/2);
    zoomTo([root.x, root.y, initialRadius * 2]);

    function resetToInitialView() {
      const transition = svg.transition()
        .duration(1500)
        .ease(d3.easeCubicInOut)
        .tween("zoom", d => {
          const initialRadius = Math.max(root.r, width/2, height/2);
          const i = d3.interpolateZoom(view, [root.x, root.y, initialRadius * 2]);
          return t => zoomTo(i(t));
        });

      focus = root;
      
      label
        .transition(transition)
        .style("fill-opacity", d => d.parent === root ? 1 : 0)
        .on("start", function(d) { if (d.parent === root) this.style.display = "inline"; })
        .on("end", function(d) { if (d.parent !== root) this.style.display = "none"; });
    }

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

      // Calculate optimal zoom level to show all children without cutting them off
      let targetRadius;
      if (d.children && d.children.length > 0) {
        // Find the maximum radius needed to contain all children
        const maxChildRadius = Math.max(...d.children.map(child => child.r));
        const maxChildDistance = Math.max(...d.children.map(child => 
          Math.sqrt((child.x - d.x) ** 2 + (child.y - d.y) ** 2) + child.r
        ));
        // Add padding but keep zoom level reasonable
        targetRadius = Math.max(maxChildDistance * 1.5, d.r * 3);
      } else {
        // For leaf nodes, use a moderate zoom level
        targetRadius = d.r * 4;
      }

      const transition = svg.transition()
        .duration(event.altKey ? 15000 : 1500)
        .ease(d3.easeCubicInOut)
        .tween("zoom", d => {
          // Always center on the selected circle
          const i = d3.interpolateZoom(view, [focus.x, focus.y, targetRadius]);
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
          .sort((a, b) => a.value - b.value)); // Reverse sort for horizontal arrangement
      
      const newRoot = newPack(data);
      
      // Update nodes and labels with new positions
      const newNodes = svg.select("g").selectAll("circle")
        .data(newRoot.descendants().slice(1));
      
      newNodes
        .transition()
        .duration(1500)
        .ease(d3.easeCubicInOut)
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .attr("r", d => d.r);
      
      const newLabels = svg.select("g").selectAll("text")
        .data(newRoot.descendants());
      
      newLabels
        .transition()
        .duration(1500)
        .ease(d3.easeCubicInOut)
        .attr("transform", d => `translate(${d.x},${d.y})`);
      
      // Update focus and view to show all circles
      focus = newRoot;
      const newInitialRadius = Math.max(newRoot.r, newWidth/2, newHeight/2);
      zoomTo([focus.x, focus.y, newInitialRadius * 2]);
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
