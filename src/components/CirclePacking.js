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

    // Define color scheme
    const unreadArticleColor = "white"; // White background for unread articles
    const readArticleColor = "#F5F5F5"; // Grayish background for read articles
    const unreadGroupColor = "#748BB8"; // Blue background for unread groups
    const readGroupColor = "#D6DDEA"; // Light blue background for read groups
    const summaryColor = "#D8C9B6"; // Beige tone for summary bubbles
    const unreadArticleOutline = "#748BB8"; // Blue outline for unread articles
    const readArticleOutline = "#CCCCCC"; // Gray outline for read articles
    const unreadGroupOutline = "#4A6FA5"; // Darker blue outline for unread groups
    const readGroupOutline = "#C4D1E8"; // Light blue outline for read groups

    // Helper function to check if a node has been read
    // Something is read if the readBy array is not empty
    const hasUserRead = (nodeData) => {
      return nodeData.readBy && nodeData.readBy.length > 0;
    };

    // Helper function to check if a group/category is read
    // A group is read if it has been marked as read in its readBy array
    // OR if its summary is read OR all its children are read
    // OR if any parent in the hierarchy is read (cascading read behavior)
    const isGroupRead = (d3Node) => {
      const nodeData = d3Node.data;
      
      // First check if the group itself has been marked as read
      if (hasUserRead(nodeData)) {
        return true;
      }
      
      // Check if any parent in the hierarchy is read (cascading read behavior)
      let currentParent = d3Node.parent;
      while (currentParent && currentParent.data) {
        if (hasUserRead(currentParent.data)) {
          return true;
        }
        currentParent = currentParent.parent;
      }
      
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
          // For nested groups, we need to find the corresponding D3 node
          // This is a simplified check - in practice, we'd need to traverse the D3 hierarchy
          return isGroupRead({ data: child, parent: d3Node }); // Pass parent context
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
        // For groups, use blue color scheme based on read status
        return isGroupRead(d) ? readGroupColor : unreadGroupColor;
      } else {
        // For individual articles, use white/gray color scheme based on read status
        return hasUserRead(d.data) ? readArticleColor : unreadArticleColor;
      }
    };

    // Helper function to get the appropriate stroke color based on reading status
    const getNodeStrokeColor = (d) => {
      if (d.data.isSummary) {
        return hasUserRead(d.data) ? d3.color(summaryColor).brighter(0.2) : d3.color(summaryColor).darker(0.6);
      } else if (d.children) {
        // For groups, use blue outline scheme based on read status
        return isGroupRead(d) ? readGroupOutline : unreadGroupOutline;
      } else {
        // For individual articles, use blue/gray outline scheme based on read status
        return hasUserRead(d.data) ? readArticleOutline : unreadArticleOutline;
      }
    };

    // Helper function to check if text fits in circle and wrap if needed
    // More lenient - only hide text when circle is truly too small
    const processTextForCircle = (text, maxWidth, fontSize = 10, maxLines = 4) => {
      const words = text.split(' ');
      const lines = [];
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        // More generous text width calculation (0.5 * fontSize per character)
        const testWidth = testLine.length * fontSize * 0.5;
        
        if (testWidth < maxWidth) {
          currentLine = testLine;
        } else {
          lines.push(currentLine);
          currentLine = words[i];
        }
      }
      lines.push(currentLine);
      
      // Only consider text too long if it has more than maxLines AND the circle is very small
      // For larger circles, allow more lines
      const minCircleSize = 30; // Minimum radius to show text
      const isTooSmall = maxWidth < minCircleSize;
      const isTooManyLines = lines.length > maxLines;
      
      if (isTooSmall || (isTooManyLines && maxWidth < 60)) {
        return { lines: [], tooLong: true };
      }
      
      return { lines, tooLong: false };
    };

    // Since input.json doesn't have date fields, show all data
    const filterDataByDate = (node, selectedDate) => {
      // Create a copy of the node with all its children
      const filteredNode = { ...node };
      
      if (node.children) {
        // Process all children recursively (no date filtering)
        const filteredChildren = node.children.map(child => filterDataByDate(child, selectedDate));
        filteredNode.children = filteredChildren;
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
      const isGroupReadStatus = nodeData.children ? isGroupRead({ data: nodeData, parent: null }) : false;
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
            <div class="description-content">${nodeData.description || (nodeData.children ? `This group contains ${nodeData.children.length} items` : 'No description available')}</div>
          </div>
          ${nodeData.source ? `
            <div class="info-section">
              <h4>Source</h4>
              <div class="source-content">
                <a href="${nodeData.source}" target="_blank" rel="noopener noreferrer" class="source-link">
                  ${nodeData.source}
                </a>
              </div>
            </div>
          ` : ''}
          ${nodeData.relevancy ? `
            <div class="info-section">
              <h4>Relevancy Score</h4>
              <p>${nodeData.relevancy}/10</p>
            </div>
          ` : ''}
          ${nodeData.count ? `
            <div class="info-section">
              <h4>Article Count</h4>
              <p>${nodeData.count} articles</p>
            </div>
          ` : ''}
          ${nodeData.children && nodeData.children.length > 0 ? `
            <div class="info-section">
              <h4>Contents</h4>
              <div class="children-list">
                ${nodeData.children.map(child => `
                  <div class="child-item ${child.isSummary ? 'summary-item' : ''}">
                    <span class="child-name">${child.name}</span>
                    ${child.isSummary ? '<span class="child-type">Summary</span>' : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          ${nodeData.reasoning ? `
            <div class="info-section">
              <h4>Portfolio Reasoning</h4>
              <div class="reasoning-content">
                ${Object.entries(nodeData.reasoning).map(([portfolio, reasoning]) => `
                  <div class="reasoning-item">
                    <strong>${portfolio.replace('port_', 'Portfolio ')}:</strong>
                    <div class="reasoning-text">${reasoning}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          <div class="reading-controls">
            <button 
              class="btn ${isRead ? 'btn-secondary' : 'btn-primary'}"
              onclick="toggleReadingStatus('${nodeData.name}', ${isRead})"
            >
              ${isRead ? 'Mark as Unread' : 'Mark as Read'}
            </button>
            ${!nodeData.isSummary && nodeData.source ? `
              <button 
                class="btn btn-source"
                onclick="window.open('${nodeData.source}', '_blank')"
              >
                Source
              </button>
            ` : ''}
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

    // Create tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "circle-tooltip")
      .style("position", "absolute")
      .style("padding", "8px 12px")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", "1000")
      .style("max-width", "300px")
      .style("word-wrap", "break-word");

    // Append the nodes with smooth transitions
    const node = svg.append("g")
      .selectAll("circle")
      .data(root.descendants().slice(1), d => d.data.name) // Use name as key for proper tracking
      .join(
        enter => enter.append("circle")
          .attr("fill", d => getNodeColor(d))
          .attr("stroke", d => getNodeStrokeColor(d))
          .attr("stroke-width", d => {
            if (d.data.isSummary) {
              return hasUserRead(d.data) ? 2 : 2;
            } else if (d.children) {
              return isGroupRead(d) ? 2 : 3;
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
            .attr("stroke", d => getNodeStrokeColor(d))
            .attr("stroke-width", d => {
              if (d.data.isSummary) {
                return hasUserRead(d.data) ? 2 : 2;
              } else if (d.children) {
                return isGroupRead(d) ? 2 : 3;
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
        
        // Show tooltip only if text is too long to display
        const maxWidth = d.r * 1.8;
        const textResult = processTextForCircle(d.data.name, maxWidth, 10, 4);
        if (textResult.tooLong) {
          tooltip
            .style("opacity", 1)
            .html(d.data.name)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        }
      })
      .on("mouseout", function(event, d) { 
        const strokeWidth = d.data.isSummary ? 2 :
                           d.children ? (isGroupRead(d) ? 2 : 3) :
                           (hasUserRead(d.data) ? 2 : 1);
        d3.select(this).transition()
          .duration(200)
          .attr("stroke-width", strokeWidth);
        
        // Hide tooltip
        tooltip.style("opacity", 0);
      })
      .on("mousemove", function(event, d) {
        // Update tooltip position on mouse move
        const maxWidth = d.r * 1.8;
        const textResult = processTextForCircle(d.data.name, maxWidth, 10, 4);
        if (textResult.tooLong) {
          tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        }
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        if (d.data.isSummary || (!d.children && d.data.description)) {
          // Show summary panel for summaries or articles with descriptions
          showSummaryPanel(d.data);
        } else if (d.children && !d.data.isSummary) {
          // For groupings, show summary panel AND zoom
          showSummaryPanel(d.data);
          if (focus !== d) {
            zoom(event, d);
          }
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
        enter => {
          const textGroup = enter.append("text")
            .style("fill-opacity", 0)
            .style("fill", "#000000")
            .style("stroke", "#ffffff")
            .style("stroke-width", "3px")
            .style("paint-order", "stroke fill")
            .attr("transform", d => `translate(${d.x},${d.y})`);
          
          // Add wrapped text lines or hide if too long
          textGroup.each(function(d) {
            const textElement = d3.select(this);
            const maxWidth = d.r * 1.8; // Use 90% of circle diameter
            const textResult = processTextForCircle(d.data.name, maxWidth, 10, 4);
            
            if (!textResult.tooLong && textResult.lines.length > 0) {
              const lineHeight = 12;
              const startY = -(textResult.lines.length - 1) * lineHeight / 2;
              
              textResult.lines.forEach((line, i) => {
                textElement.append("tspan")
                  .text(line)
                  .attr("x", 0)
                  .attr("y", startY + i * lineHeight);
              });
            } else {
              // Hide text if too long
              textElement.style("display", "none");
            }
          });
          
          return textGroup.call(enter => enter.transition()
            .duration(800)
            .delay(200)
            .ease(d3.easeCubicInOut)
            .style("fill-opacity", d => {
              if (d.parent !== root) return 0;
              const maxWidth = d.r * 1.8;
              const textResult = processTextForCircle(d.data.name, maxWidth, 10, 4);
              return textResult.tooLong ? 0 : 1;
            })
            .style("display", d => {
              if (d.parent !== root) return "none";
              const maxWidth = d.r * 1.8;
              const textResult = processTextForCircle(d.data.name, maxWidth, 10, 4);
              return textResult.tooLong ? "none" : "inline";
            })
          );
        },
        update => {
          // Clear existing tspans and recreate
          update.selectAll("tspan").remove();
          
          update.each(function(d) {
            const textElement = d3.select(this);
            const maxWidth = d.r * 1.8; // Use 90% of circle diameter
            const textResult = processTextForCircle(d.data.name, maxWidth, 10, 4);
            
            if (!textResult.tooLong && textResult.lines.length > 0) {
              const lineHeight = 12;
              const startY = -(textResult.lines.length - 1) * lineHeight / 2;
              
              textResult.lines.forEach((line, i) => {
                textElement.append("tspan")
                  .text(line)
                  .attr("x", 0)
                  .attr("y", startY + i * lineHeight);
              });
            } else {
              // Hide text if too long
              textElement.style("display", "none");
            }
          });
          
          return update.call(update => update.transition()
            .duration(600)
            .ease(d3.easeCubicInOut)
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .style("fill-opacity", d => {
              if (d.parent !== root) return 0;
              const maxWidth = d.r * 1.8;
              const textResult = processTextForCircle(d.data.name, maxWidth, 10, 4);
              return textResult.tooLong ? 0 : 1;
            })
            .style("display", d => {
              if (d.parent !== root) return "none";
              const maxWidth = d.r * 1.8;
              const textResult = processTextForCircle(d.data.name, maxWidth, 10, 4);
              return textResult.tooLong ? "none" : "inline";
            })
          );
        },
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
        .style("fill", "#000000")
        .style("stroke", "#ffffff")
        .style("stroke-width", "3px")
        .style("paint-order", "stroke fill")
        .on("start", function(d) { 
          if (d.parent === root) {
            this.style.display = "inline";
            // Recreate wrapped text for visible labels
            const textElement = d3.select(this);
            textElement.selectAll("tspan").remove();
            const maxWidth = d.r * 1.8;
            const textResult = processTextForCircle(d.data.name, maxWidth, 10, 4);
            
            if (!textResult.tooLong && textResult.lines.length > 0) {
              const lineHeight = 12;
              const startY = -(textResult.lines.length - 1) * lineHeight / 2;
              
              textResult.lines.forEach((line, i) => {
                textElement.append("tspan")
                  .text(line)
                  .attr("x", 0)
                  .attr("y", startY + i * lineHeight);
              });
            } else {
              // Hide text if too long
              textElement.style("display", "none");
            }
          }
        })
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
        .style("fill", "#000000")
        .style("stroke", "#ffffff")
        .style("stroke-width", "3px")
        .style("paint-order", "stroke fill")
        .on("start", function(d) { 
          if (d.parent === focus) {
            this.style.display = "inline";
            // Recreate wrapped text for visible labels
            const textElement = d3.select(this);
            textElement.selectAll("tspan").remove();
            const maxWidth = d.r * 1.8;
            const textResult = processTextForCircle(d.data.name, maxWidth, 10, 4);
            
            if (!textResult.tooLong && textResult.lines.length > 0) {
              const lineHeight = 12;
              const startY = -(textResult.lines.length - 1) * lineHeight / 2;
              
              textResult.lines.forEach((line, i) => {
                textElement.append("tspan")
                  .text(line)
                  .attr("x", 0)
                  .attr("y", startY + i * lineHeight);
              });
            } else {
              // Hide text if too long
              textElement.style("display", "none");
            }
          }
        })
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
      tooltip.remove();
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
