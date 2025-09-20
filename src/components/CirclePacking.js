import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './CirclePacking.css';

const CirclePacking = ({ data, selectedDate }) => {
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
    const summaryColor = "#D8C9B6"; // Beige tone for summary bubbles
    const color = d3.scaleOrdinal()
      .domain([0, 1, 2, 3, 4])
      .range(chartColors);

    // Filter data based on selected date (selected date and 7 days back)
    const filterDataByDate = (node, selectedDate) => {
      const selectedDateTime = new Date(selectedDate);
      const sevenDaysAgo = new Date(selectedDateTime);
      sevenDaysAgo.setDate(selectedDateTime.getDate() - 7);
      
      // Create a filtered copy of the node
      const filteredNode = { ...node };
      
      if (node.children) {
        filteredNode.children = node.children
          .map(child => filterDataByDate(child, selectedDate))
          .filter(child => {
            // Keep the node if it has children (parent nodes) or if it matches the date criteria
            if (child.children && child.children.length > 0) {
              return true; // Keep parent nodes that have filtered children
            }
            
            // For leaf nodes, check if they have a timestamp within the date range
            if (child.timestamp) {
              const nodeDate = new Date(child.timestamp);
              return nodeDate >= sevenDaysAgo && nodeDate <= selectedDateTime;
            }
            
            // For summary nodes, keep them if they have filtered children
            if (child.isSummary) {
              return child.children && child.children.length > 0;
            }
            
            return false; // Remove nodes that don't match criteria
          });
      }
      
      return filteredNode;
    };

    const filteredData = filterDataByDate(data, selectedDate);
    const dataWithSummaries = filteredData;

    // Summary panel functionality
    const showSummaryPanel = (nodeData) => {
      // Find the summary panel and main container
      const summaryPanel = document.getElementById('pulse-summary-panel');
      const mainContainer = summaryPanel?.closest('.pulse-insights-main');
      if (!summaryPanel || !mainContainer) return;

      // Update layout class
      mainContainer.classList.remove('full-width');
      mainContainer.classList.add('with-panel');

      // Populate panel content first
      summaryPanel.innerHTML = `
        <div class="summary-header">
          <h3>${nodeData.name}</h3>
        </div>
        <div class="summary-content">
          <div class="info-section">
            <h4>Description</h4>
            <p>${nodeData.description || 'No description available'}</p>
          </div>
          ${nodeData.timestamp ? `
            <div class="info-section">
              <h4>Published</h4>
              <p>${new Date(nodeData.timestamp).toLocaleDateString()}</p>
            </div>
          ` : ''}
          ${nodeData.lastUpdated ? `
            <div class="info-section">
              <h4>Last Updated</h4>
              <p>${new Date(nodeData.lastUpdated).toLocaleDateString()}</p>
            </div>
          ` : ''}
          ${nodeData.value ? `
            <div class="info-section">
              <h4>Relevance Score</h4>
              <p>${nodeData.value}%</p>
            </div>
          ` : ''}
        </div>
      `;

      // Trigger animation after a small delay to ensure content is rendered
      setTimeout(() => {
        summaryPanel.classList.add('visible');
      }, 10);
    };

    const hideSummaryPanel = () => {
      const summaryPanel = document.getElementById('pulse-summary-panel');
      const mainContainer = summaryPanel?.closest('.pulse-insights-main');
      if (!summaryPanel || !mainContainer) return;

      // Remove visible class to trigger hide animation
      summaryPanel.classList.remove('visible');
      
      // Update layout class
      mainContainer.classList.remove('with-panel');
      mainContainer.classList.add('full-width');
      
      // Reset content after animation completes
      setTimeout(() => {
        summaryPanel.innerHTML = `
          <div class="summary-placeholder">
            <p>Click on a summary or article to view details</p>
          </div>
        `;
      }, 400); // Match the CSS transition duration
    };

    // Compute the layout with horizontal arrangement
    const pack = data => d3.pack()
      .size([width, height])
      .padding(3)
      (d3.hierarchy(data)
        .sum(d => d.value)
        .sort((a, b) => a.value - b.value)); // Reverse sort for horizontal arrangement
    
    const root = pack(dataWithSummaries);

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
      .attr("fill", d => {
        if (d.data.isSummary) {
          return summaryColor;
        } else if (d.children) {
          return color(d.depth % 5);
        } else {
          return "white";
        }
      })
      .attr("pointer-events", d => (!d.children && !d.data.description) ? "none" : null)
      .on("mouseover", function() { d3.select(this).attr("stroke", "#000"); })
      .on("mouseout", function() { d3.select(this).attr("stroke", null); })
      .on("click", (event, d) => {
        event.stopPropagation();
        if (d.data.isSummary || (!d.children && d.data.description)) {
          // Show summary panel only for summaries or leaf nodes (nodes with no children)
          showSummaryPanel(d.data);
        } else if (focus !== d && d.children && !d.data.isSummary) {
          // Zoom only for parent nodes with children and hide summary panel
          hideSummaryPanel();
          zoom(event, d);
        }
      });

    // Append the text labels with background highlights
    const label = svg.append("g")
      .style("font", "10px sans-serif")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .selectAll("text")
      .data(root.descendants())
      .join("text")
      .style("fill-opacity", d => d.parent === root ? 1 : 0)
      .style("display", d => d.parent === root ? "inline" : "none")
      .style("fill", "#333")
      .style("filter", "drop-shadow(1px 1px 2px rgba(255, 255, 255, 0.8))")
      .text(d => d.data.name);

    // Create the zoom behavior and set initial view to show all circles
    svg.on("click", (event) => {
      // If clicking on empty space (not on a circle), return to initial view
      const target = event.target;
      if (target === svg.node()) {
        hideSummaryPanel();
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
        .style("fill", "#333")
        .style("filter", "drop-shadow(1px 1px 2px rgba(255, 255, 255, 0.8))")
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
        .style("fill", "#333")
        .style("filter", "drop-shadow(1px 1px 2px rgba(255, 255, 255, 0.8))")
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
      
      const newRoot = newPack(dataWithSummaries);
      
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
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .style("fill", "#333")
        .style("filter", "drop-shadow(1px 1px 2px rgba(255, 255, 255, 0.8))");
      
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
  }, [data, selectedDate]);

  return (
    <div className="circle-packing-container">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default CirclePacking;
