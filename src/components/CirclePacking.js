import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './CirclePacking.css';

const CirclePacking = ({ data, selectedDate, currentUserId = 'user1', onDateChange }) => {
  const svgRef = useRef();
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(true);

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

    // Helper function to check if current user has read a node
    const hasUserRead = (nodeData) => {
      return nodeData.readBy && nodeData.readBy.includes(currentUserId);
    };

    // Helper function to check if a group/category is read
    // A group is read if its summary is read OR all its children are read
    const isGroupRead = (nodeData) => {
      if (!nodeData.children) return false;
      
      // Check if summary is read
      const summary = nodeData.children.find(child => child.isSummary);
      if (summary && hasUserRead(summary)) {
        return true;
      }
      
      // Check if all non-summary children are read
      const nonSummaryChildren = nodeData.children.filter(child => !child.isSummary);
      if (nonSummaryChildren.length === 0) return false;
      
      return nonSummaryChildren.every(child => {
        if (child.children) {
          return isGroupRead(child); // Recursive check for nested groups
        } else {
          return hasUserRead(child); // Check leaf nodes
        }
      });
    };

    // Helper function to get the appropriate color based on reading status
    const getNodeColor = (d) => {
      if (d.data.isSummary) {
        return hasUserRead(d.data) ? d3.color(summaryColor).brighter(0.3) : d3.color(summaryColor).darker(0.4);
      } else if (d.children) {
        const baseColor = color(d.depth % 5);
        return isGroupRead(d.data) ? d3.color(baseColor).brighter(0.4) : baseColor;
      } else {
        return hasUserRead(d.data) ? "#F0F0F0" : "white";
      }
    };

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

      const isRead = hasUserRead(nodeData);
      const isGroupReadStatus = nodeData.children ? isGroupRead(nodeData) : false;
      const readCount = nodeData.readBy ? nodeData.readBy.length : 0;

      // Populate panel content first
      summaryPanel.innerHTML = `
        <div class="summary-header">
          <h3>${nodeData.name}</h3>
          <div class="reading-status">
            <span class="status-indicator ${isRead ? 'read' : 'unread'}">
              ${isRead ? 'READ' : 'UNREAD'}
            </span>
            ${nodeData.children ? `
              <span class="group-status ${isGroupReadStatus ? 'group-read' : 'group-unread'}">
                Group: ${isGroupReadStatus ? 'COMPLETE' : 'INCOMPLETE'}
              </span>
            ` : ''}
            <span class="read-count">${readCount} team members read this</span>
          </div>
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
          <div class="reading-controls">
            <button 
              class="btn ${isRead ? 'btn-secondary' : 'btn-primary'}"
              onclick="toggleReadingStatus('${nodeData.name}', ${isRead})"
            >
              ${isRead ? 'Mark as Unread' : 'Mark as Read'}
            </button>
          </div>
        </div>
      `;

      // Make toggleReadingStatus available globally
      window.toggleReadingStatus = (articleName, currentlyRead) => {
        // This would typically update the data and trigger a re-render
        console.log('Toggle reading status:', articleName, !currentlyRead);
        // For now, just log - you can implement the actual update logic
      };

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

    // Append the nodes with smooth transitions
    const node = svg.append("g")
      .selectAll("circle")
      .data(root.descendants().slice(1), d => d.data.name) // Use name as key for proper tracking
      .join(
        enter => enter.append("circle")
          .attr("fill", d => getNodeColor(d))
          .attr("stroke", d => {
            if (d.data.isSummary) {
              return hasUserRead(d.data) ? d3.color(summaryColor).brighter(0.2) : d3.color(summaryColor).darker(0.6);
            } else if (d.children) {
              const baseColor = color(d.depth % 5);
              return isGroupRead(d.data) ? d3.color(baseColor).brighter(0.2) : d3.color(baseColor).darker(0.4);
            } else {
              return hasUserRead(d.data) ? "#8EA4B7" : "#748BB8";
            }
          })
          .attr("stroke-width", d => {
            if (d.data.isSummary) {
              return hasUserRead(d.data) ? 2 : 2;
            } else if (d.children) {
              return isGroupRead(d.data) ? 2 : 3;
            } else {
              return hasUserRead(d.data) ? 2 : 1;
            }
          })
          .attr("opacity", 0)
          .attr("r", 0)
          .attr("transform", d => `translate(${d.x},${d.y})`)
          .call(enter => enter.transition()
            .duration(800)
            .ease(d3.easeCubicInOut)
            .attr("opacity", 1)
            .attr("r", d => d.r)
          ),
        update => update
          .call(update => update.transition()
            .duration(600)
            .ease(d3.easeCubicInOut)
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .attr("r", d => d.r)
            .attr("fill", d => getNodeColor(d))
            .attr("stroke", d => {
              if (d.data.isSummary) {
                return hasUserRead(d.data) ? d3.color(summaryColor).brighter(0.2) : d3.color(summaryColor).darker(0.6);
              } else if (d.children) {
                const baseColor = color(d.depth % 5);
                return isGroupRead(d.data) ? d3.color(baseColor).brighter(0.2) : d3.color(baseColor).darker(0.4);
              } else {
                return hasUserRead(d.data) ? "#8EA4B7" : "#748BB8";
              }
            })
            .attr("stroke-width", d => {
              if (d.data.isSummary) {
                return hasUserRead(d.data) ? 2 : 2;
              } else if (d.children) {
                return isGroupRead(d.data) ? 2 : 3;
              } else {
                return hasUserRead(d.data) ? 2 : 1;
              }
            })
          ),
        exit => exit
          .call(exit => exit.transition()
            .duration(400)
            .ease(d3.easeCubicInOut)
            .attr("opacity", 0)
            .attr("r", 0)
            .remove()
          )
      )
      .attr("pointer-events", d => (!d.children && !d.data.description) ? "none" : null)
      .on("mouseover", function(event, d) { 
        d3.select(this).transition()
          .duration(200)
          .attr("stroke-width", 3);
      })
      .on("mouseout", function(event, d) { 
        const strokeWidth = d.data.isSummary ? 2 :
                           d.children ? (isGroupRead(d.data) ? 2 : 3) :
                           (hasUserRead(d.data) ? 2 : 1);
        d3.select(this).transition()
          .duration(200)
          .attr("stroke-width", strokeWidth);
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        if (d.data.isSummary || (!d.children && d.data.description)) {
          showSummaryPanel(d.data);
        } else if (focus !== d && d.children && !d.data.isSummary) {
          hideSummaryPanel();
          zoom(event, d);
        }
      });

    // Append the text labels with smooth transitions
    const label = svg.append("g")
      .style("font", "10px sans-serif")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .selectAll("text")
      .data(root.descendants(), d => d.data.name) // Use name as key for proper tracking
      .join(
        enter => enter.append("text")
          .text(d => d.data.name)
          .style("fill-opacity", 0)
          .attr("transform", d => `translate(${d.x},${d.y})`)
          .call(enter => enter.transition()
            .duration(800)
            .delay(200)
            .ease(d3.easeCubicInOut)
            .style("fill-opacity", d => d.parent === root ? 1 : 0)
            .style("display", d => d.parent === root ? "inline" : "none")
          ),
        update => update
          .call(update => update.transition()
            .duration(600)
            .ease(d3.easeCubicInOut)
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .style("fill-opacity", d => d.parent === root ? 1 : 0)
            .style("display", d => d.parent === root ? "inline" : "none")
          ),
        exit => exit
          .call(exit => exit.transition()
            .duration(400)
            .ease(d3.easeCubicInOut)
            .style("fill-opacity", 0)
            .remove()
          )
      );

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
        .duration(1200)
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
        .duration(event.altKey ? 15000 : 1000)
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
      
      const newRoot = newPack(dataWithSummaries);
      
      // Update nodes and labels with new positions
      const newNodes = svg.select("g").selectAll("circle")
        .data(newRoot.descendants().slice(1));
      
      newNodes
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .attr("r", d => d.r);
      
      const newLabels = svg.select("g").selectAll("text")
        .data(newRoot.descendants());
      
      newLabels
        .transition()
        .duration(1000)
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
  }, [data, selectedDate, currentUserId]);

  return (
    <div className="circle-packing-container">
      <svg ref={svgRef}></svg>
      <div className="date-controls-above-legend">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange && onDateChange(e.target.value)}
          className="date-input-in-legend"
        />
        <div className="date-arrows-in-legend">
          <button 
            className="date-arrow-in-legend"
            onClick={() => onDateChange && onDateChange(new Date(new Date(selectedDate).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0])}
            title="Previous day"
          >
            ←
          </button>
          <button 
            className="date-arrow-in-legend"
            onClick={() => onDateChange && onDateChange(new Date(new Date(selectedDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])}
            title="Next day"
          >
            →
          </button>
        </div>
      </div>
      <div className={`reading-legend ${isLegendCollapsed ? 'collapsed' : ''}`}>
        <div className="legend-header" onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}>
          <div className="legend-title">Reading Status</div>
          <div className="legend-toggle">
            <span className={`toggle-icon ${isLegendCollapsed ? 'collapsed' : ''}`}>▼</span>
          </div>
        </div>
        {!isLegendCollapsed && (
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color read-article"></div>
              <span>Read Article</span>
            </div>
            <div className="legend-item">
              <div className="legend-color unread-article"></div>
              <span>Unread Article</span>
            </div>
            <div className="legend-item">
              <div className="legend-color read-summary"></div>
              <span>Read Summary</span>
            </div>
            <div className="legend-item">
              <div className="legend-color unread-summary"></div>
              <span>Unread Summary</span>
            </div>
            <div className="legend-item">
              <div className="legend-color read-group"></div>
              <span>Read Group</span>
            </div>
            <div className="legend-item">
              <div className="legend-color unread-group"></div>
              <span>Unread Group</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CirclePacking;
