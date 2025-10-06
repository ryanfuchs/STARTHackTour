import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as d3 from 'd3';
import './CirclePacking.css';
import feedIconMap from '../assets/feedIcons';

const CirclePacking = forwardRef(({ data, selectedDate, currentUserId = 'user1', onDateChange }, ref) => {
  const svgRef = useRef();
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(true);
  const focusNodeHandlerRef = useRef(null);
  const nodeLookupRef = useRef(new Map());

  useEffect(() => {
    Object.values(feedIconMap).forEach(src => {
      if (src) {
        const img = new Image();
        img.src = src;
      }
    });
  }, []);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Get container dimensions
    const container = svgRef.current.parentElement;
    const containerRect = container.getBoundingClientRect();
    const width = containerRect.width || container.clientWidth || container.offsetWidth || 800;
    const height = containerRect.height || container.clientHeight || container.offsetHeight || 600;
    let minViewComponent = Math.max(Math.min(width, height) * 0.05, 20);

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
      const summary = nodeData.summaryNode;
      if (summary && hasUserRead(summary)) {
        return true;
      }
      
      // Check if all non-summary children are read
      const nonSummaryChildren = (nodeData.children || []);
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

    const fontFamily = 'sans-serif';
    let textMeasureContext = null;
    const layoutCache = new Map();

    const getMeasureContext = () => {
      if (textMeasureContext) return textMeasureContext;
      if (typeof document === 'undefined') return null;
      const canvas = document.createElement('canvas');
      textMeasureContext = canvas.getContext('2d');
      return textMeasureContext;
    };

    const measureTextWidth = (fontSizeValue, textString) => {
      const context = getMeasureContext();
      if (!context) {
        return textString.length * fontSizeValue * 0.5;
      }
      context.font = `${fontSizeValue}px ${fontFamily}`;
      return context.measureText(textString).width;
    };

    const getNodeKey = (d) => d?.data?.__layoutId || d?.data?.id || d?.data?.name || `${d.depth}-${Math.round(d.x)}-${Math.round(d.y)}`;
    const getScaleBucket = (scaleValue) => {
      if (!Number.isFinite(scaleValue) || scaleValue <= 0) return 1;
      return Math.max(1, Math.round(scaleValue * 60));
    };

    const getIconUrl = (sourceUrl) => {
      if (!sourceUrl) return null;
      let normalized = sourceUrl;
      if (!/^https?:\/\//i.test(normalized)) {
        normalized = `https://${normalized}`;
      }
      try {
        const urlObj = new URL(normalized);
        const host = urlObj.hostname;
        if (feedIconMap[host]) {
          return feedIconMap[host];
        }
      } catch (err) {
        return null;
      }
      return null;
    };

    // Helper function to derive wrapped text sized to the visible circle
    const processTextForCircle = (text, radius, depth = 0, scale = 1) => {
      const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
      const diameter = radius * 2 * safeScale;
      const minVisibleDiameter = 14;

      if (!text || diameter < minVisibleDiameter) {
        return { lines: [], tooLong: true, fontSize: 0, lineHeight: 0, scale, depth };
      }

      const words = text.trim().split(/\s+/).filter(Boolean);
      if (!words.length) {
        return { lines: [], tooLong: true, fontSize: 0, lineHeight: 0, scale, depth };
      }

      const maxWidthRatio = 0.8;
      const maxHeightRatio = 0.85;
      const minFontSize = 4;
      const depthFactor = 1 + Math.max(0, depth - 1) * 0.15;
      const baseMaxFontSize = Math.max(minFontSize, diameter / 5.5);
      const maxFontSize = Math.max(minFontSize, baseMaxFontSize * depthFactor);
      const lineSpacingMultiplier = 1.12;
      const maxWidth = diameter * maxWidthRatio;
      const availableHeight = diameter * maxHeightRatio;

      const wrapWords = (fontSizeValue) => {
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
          const word = words[i];
          const testLine = `${currentLine} ${word}`;
          const testWidth = measureTextWidth(fontSizeValue, testLine);

          if (testWidth <= maxWidth) {
            currentLine = testLine;
          } else {
            lines.push(currentLine);
            currentLine = word;
          }
        }

        if (currentLine) {
          lines.push(currentLine);
        }

        return lines;
      };

      const diameterLimit = diameter / 6;
      const cappedMaxFont = Math.min(maxFontSize, diameterLimit);
      let fontSize = Math.max(minFontSize, cappedMaxFont);

      const scaleFactor = Math.min(0.85, Math.pow(words.length, 0.3));

      while (fontSize >= minFontSize) {
        const lineHeight = fontSize * lineSpacingMultiplier;
        const maxLines = Math.max(1, Math.floor(availableHeight / lineHeight));
        const widestWord = Math.max(...words.map(word => measureTextWidth(fontSize, word)));

        if (widestWord > maxWidth) {
          fontSize -= 1;
          continue;
        }

        const lines = wrapWords(fontSize);

        const exceedsWidth = lines.some(line => measureTextWidth(fontSize, line) > maxWidth);

        if (lines.length <= maxLines && !exceedsWidth) {
          const adjustedFontSize = fontSize * scaleFactor;
          const adjustedLineHeight = lineHeight * scaleFactor;
          return { lines, tooLong: false, fontSize: adjustedFontSize, lineHeight: adjustedLineHeight, scale: safeScale, depth };
        }

        fontSize -= 1;
      }

      return {
        lines: [],
        tooLong: true,
        fontSize: minFontSize,
        lineHeight: minFontSize * lineSpacingMultiplier,
        scale: safeScale,
        depth
      };
    };

    let focus;
    let view;
    let suppressIconReveal = false;

    const getCurrentScale = () => {
      if (!view) return 1;
      const currentWidth = svgRef.current ? svgRef.current.getBoundingClientRect().width : width;
      return currentWidth / view[2];
    };

    const shouldShowLabel = (d) => {
      if (!focus) return false;
      if (d === focus) return false;
      if (!d.children) return false; // hide labels on article (leaf) circles
      if (d.parent !== focus) return false;
      const layout = d.data.__textLayout;
      return !!(layout && !layout.tooLong && layout.lines.length > 0);
    };

    const shouldShowIcon = (d) => {
      if (!focus) return false;
      if (d.children || d.data.isSummary) return false;
      if (!d.data.source) return false;
      if (!getIconUrl(d.data.source)) return false;
      return d.parent === focus;
    };

    const getLayoutFromCache = (d, scale) => {
      const bucket = getScaleBucket(scale);
      const key = `${getNodeKey(d)}|${bucket}`;
      let layout = layoutCache.get(key);

      const needsRecompute = !layout || Math.abs((layout.scale || scale) - scale) > 0.01;

      if (needsRecompute) {
        layout = processTextForCircle(d.data.name, d.r, d.depth, scale);
        layout.cacheKey = key;
        layout.bucket = bucket;
        layout.scale = scale;
        layoutCache.set(key, layout);
      }

      layout.scale = scale;
      d.data.__textLayout = layout;
      return layout;
    };

    const applyTextLayout = (textElement, d, scaleOverride) => {
      const scaleToUse = typeof scaleOverride === 'number' ? scaleOverride : getCurrentScale();
      if (!d.children) {
        const leafLayout = getLayoutFromCache(d, scaleToUse);
        const leafKey = `${getNodeKey(d)}|leaf|${getScaleBucket(scaleToUse)}`;
        if (textElement.attr('data-layout-key') !== leafKey) {
          textElement.attr('data-layout-key', leafKey);
          textElement.selectAll('tspan').remove();
        }
        textElement.style('display', 'none');
        textElement.style('font-size', null);
        return leafLayout;
      }

      const layout = getLayoutFromCache(d, scaleToUse);
      const layoutKey = layout.cacheKey || `${getNodeKey(d)}|${getScaleBucket(scaleToUse)}`;

      if (textElement.attr('data-layout-key') === layoutKey) {
        return layout;
      }

      textElement.attr('data-layout-key', layoutKey);
      textElement.selectAll('tspan').remove();

      if (layout.tooLong || layout.lines.length === 0) {
        textElement.style('display', 'none');
        textElement.style('font-size', null);
        return layout;
      }

      textElement.style('font-size', `${layout.fontSize}px`);

      const lineHeight = layout.lineHeight;
      const startY = -(layout.lines.length - 1) * lineHeight / 2;

      layout.lines.forEach((line, index) => {
        textElement.append('tspan')
          .text(line)
          .attr('x', 0)
          .attr('y', startY + index * lineHeight);
      });

      return layout;
    };

    const getLayoutForTooltip = (d) => {
      const currentScale = getCurrentScale();
      return getLayoutFromCache(d, currentScale);
    };

    // Since input.json doesn't have date fields, show all data
    const filterDataByDate = (node, selectedDate) => {
      const filteredNode = { ...node };

      if (node.children) {
        const filteredChildren = [];
        let summaryNode = null;

        node.children.forEach(child => {
          const processedChild = filterDataByDate(child, selectedDate);
          if (child.isSummary) {
            summaryNode = processedChild;
          } else {
            filteredChildren.push(processedChild);
          }
        });

        filteredNode.children = filteredChildren;
        if (summaryNode) {
          filteredNode.summaryNode = summaryNode;
        }
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

      const panelChildren = [];
      if (nodeData.summaryNode) panelChildren.push(nodeData.summaryNode);
      if (nodeData.children && nodeData.children.length > 0) {
        panelChildren.push(...nodeData.children);
      }

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
            <div class="description-content">${nodeData.description || (panelChildren.length ? `This group contains ${panelChildren.length} items` : 'No description available')}</div>
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
          ${panelChildren.length > 0 ? `
            <div class="info-section">
              <h4>Contents</h4>
              <div class="children-list">
                ${panelChildren.map(child => `
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
            <div class="tooltip-container" data-tooltip="No qualification">
              <button 
                class="btn ${isRead ? 'btn-secondary' : 'btn-primary'} disabled"
                onclick="toggleReadingStatus('${nodeData.name}', ${isRead})"
                disabled
              >
                ${isRead ? 'Mark as Unread' : 'Mark as Read'}
              </button>
            </div>
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
    const baseInitialRadius = Math.max(root.r, width / 2, height / 2);
    const initialComponent = Math.max(baseInitialRadius * 2, minViewComponent);
    focus = root;
    view = [root.x, root.y, initialComponent];

    const warmScale = width > 0 ? width / initialComponent : 1;
    const nodeById = new Map();
    root.descendants().forEach(descendant => {
      const pathKey = descendant.ancestors()
        .map(node => node.data?.name || '')
        .reverse()
        .join('>');
      descendant.data.__layoutId = pathKey || descendant.data?.id || `${descendant.depth}-${Math.round(descendant.x)}-${Math.round(descendant.y)}`;
      getLayoutFromCache(descendant, warmScale);

      const descriptorId = descendant.data?.id;
      if (descriptorId) {
        nodeById.set(descriptorId, descendant);
      }
    });
    nodeLookupRef.current = nodeById;

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
    const nodesGroup = svg.append("g").attr("class", "circle-nodes");
    const node = nodesGroup
      .selectAll("circle")
      .data(root.descendants().slice(1), d => d.data.__layoutId || d.data.name) // Use stable key for tracking
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
        const layout = getLayoutForTooltip(d);
        const shouldShowTooltip = !d.children || layout.tooLong;
        if (shouldShowTooltip) {
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
        const layout = getLayoutForTooltip(d);
        const shouldShowTooltip = !d.children || layout.tooLong;
        if (shouldShowTooltip) {
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

    const ICON_BG_RATIO = 0.55;
    const ICON_SIZE_RATIO = 1.1;
    const MIN_ICON_RADIUS = 8;
    const MIN_ICON_SIZE = 16;

    const iconGroup = svg.append("g").attr("class", "article-icons");
    let icons = iconGroup.selectAll("g.article-icon");

    const getVisibleIconNodes = () => {
      if (!focus || !focus.children) return [];
      return focus.children.filter(child => !child.children && !child.data.isSummary && child.data.source && getIconUrl(child.data.source));
    };

    const hideIcons = () => {
      if (icons && !icons.empty()) {
        icons.style("display", "none").style("opacity", 0);
      }
    };

    const updateIconAppearance = () => {
      if (!view || suppressIconReveal) {
        hideIcons();
        return;
      }

      const nodes = getVisibleIconNodes();
      const join = iconGroup.selectAll("g.article-icon")
        .data(nodes, d => d.data.__layoutId || d.data.name);

      join.exit().remove();

      const enter = join.enter()
        .append("g")
        .attr("class", "article-icon")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("display", "none");

      enter.append("circle")
        .attr("class", "article-icon-bg")
        .attr("fill", "#ffffff")
        .attr("stroke", "none");

      enter.append("image")
        .attr("class", "article-icon-image")
        .attr("preserveAspectRatio", "xMidYMid slice");

      icons = enter.merge(join);

      const currentWidthForIcons = svgRef.current ? svgRef.current.getBoundingClientRect().width : width;
      const k = currentWidthForIcons > 0 ? currentWidthForIcons / view[2] : 1;

      icons
        .attr("transform", d => `translate(${(d.x - view[0]) * k},${(d.y - view[1]) * k})`)
        .style("display", "inline")
        .style("opacity", 1);

      icons.select("circle")
        .attr("r", d => Math.max(d.r * k * ICON_BG_RATIO, MIN_ICON_RADIUS));

      icons.select("image")
        .each(function(d) {
          const iconUrl = getIconUrl(d.data.source);
          const sel = d3.select(this);
          if (iconUrl) {
            sel.attr("href", iconUrl).attr("xlink:href", iconUrl);
          }
        })
        .attr("width", d => Math.max(d.r * k * ICON_SIZE_RATIO, MIN_ICON_SIZE))
        .attr("height", d => Math.max(d.r * k * ICON_SIZE_RATIO, MIN_ICON_SIZE))
        .attr("x", d => -Math.max(d.r * k * ICON_SIZE_RATIO, MIN_ICON_SIZE) / 2)
        .attr("y", d => -Math.max(d.r * k * ICON_SIZE_RATIO, MIN_ICON_SIZE) / 2);
    };

    const applyFinalLayout = function(d) {
      const textSel = d3.select(this);
      if (shouldShowLabel(d)) {
        applyTextLayout(textSel, d, getCurrentScale());
        this.style.display = "inline";
        this.style.opacity = "1";
      } else {
        this.style.display = "none";
        this.style.opacity = "0";
      }

      suppressIconReveal = false;
      updateIconAppearance();
    };

    // Append the text labels with smooth transitions
    const labelsGroup = svg.append("g")
      .style("font-family", "sans-serif")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle");
    const label = labelsGroup
      .selectAll("text")
      .data(root.descendants(), d => d.data.__layoutId || d.data.name) // Use stable key for tracking
      .join(
        enter => {
          const textGroup = enter.append("text")
            .style("fill-opacity", 0)
            .style("fill", "#000000")
            .style("stroke", "#ffffff")
            .style("stroke-width", "2px")
            .style("paint-order", "stroke fill")
            .attr("transform", d => `translate(${d.x},${d.y})`);
          
          textGroup.each(function(d) {
            applyTextLayout(d3.select(this), d);
          });
          textGroup.style("display", d => shouldShowLabel(d) ? "inline" : "none");
          
          return textGroup.call(enter => enter.transition()
            .duration(800)
            .delay(200)
            .ease(d3.easeCubicInOut)
            .style("fill-opacity", d => shouldShowLabel(d) ? 1 : 0)
            .on("start", function(d) {
              this.style.display = "none";
              this.style.opacity = "0";
            })
            .on("end", applyFinalLayout)
          );
        },
        update => {
          update.each(function(d) {
            applyTextLayout(d3.select(this), d);
          });
          update.style("display", d => shouldShowLabel(d) ? "inline" : "none");
          
          return update.call(update => update.transition()
            .duration(600)
            .ease(d3.easeCubicInOut)
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .style("fill-opacity", d => shouldShowLabel(d) ? 1 : 0)
            .on("start", function(d) {
              this.style.display = "none";
              this.style.opacity = "0";
            })
            .on("end", applyFinalLayout)
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

    // Set initial view to show the entire root circle (all circles visible)
    zoomTo([root.x, root.y, initialComponent]);
    const initialScale = getCurrentScale();
    label.each(function(d) {
      if (d === root || d.parent === root) {
        applyTextLayout(d3.select(this), d, initialScale);
        this.style.display = shouldShowLabel(d) ? "inline" : "none";
        this.style.opacity = this.style.display === "inline" ? "1" : "0";
      } else {
        this.style.display = "none";
        this.style.opacity = "0";
      }
    });


    function resetToInitialView() {
      suppressIconReveal = true;
      hideIcons();
      const baseInitialRadius = Math.max(root.r, width/2, height/2);
      const desiredComponent = Math.max(baseInitialRadius * 2, minViewComponent);

      const transition = svg.transition()
        .duration(1200)
        .ease(d3.easeCubicInOut)
        .tween("zoom", d => {
          const i = d3.interpolateZoom(view, [root.x, root.y, desiredComponent]);
          return t => zoomTo(i(t));
        });

      focus = root;
      const currentWidthForReset = svgRef.current ? svgRef.current.getBoundingClientRect().width : width;
      const initialScale = currentWidthForReset > 0 ? currentWidthForReset / desiredComponent : 1;

      label.each(function(d) {
        if (d === root || d.parent === root) {
          applyTextLayout(d3.select(this), d, initialScale);
        }
      });
    label.style("display", d => shouldShowLabel(d) ? "inline" : "none");
    updateIconAppearance();

      label
        .transition(transition)
        .style("fill-opacity", d => shouldShowLabel(d) ? 1 : 0)
        .style("fill", "#000000")
        .style("stroke", "#ffffff")
        .style("stroke-width", "3px")
        .style("paint-order", "stroke fill")
        .on("start", function(d) {
          this.style.display = "none";
          this.style.opacity = "0";
        })
        .on("end", applyFinalLayout);
    }

    function zoomTo(v) {
      const centerX = v[0];
      const centerY = v[1];
      const sizeComponent = Math.max(v[2], minViewComponent);
      const currentWidth = svgRef.current ? svgRef.current.getBoundingClientRect().width : width;
      const k = sizeComponent !== 0 ? currentWidth / sizeComponent : 1;
      view = [centerX, centerY, sizeComponent];

      label.attr("transform", d => `translate(${(d.x - centerX) * k},${(d.y - centerY) * k})`);
      node.attr("transform", d => `translate(${(d.x - centerX) * k},${(d.y - centerY) * k})`);
      node.attr("r", d => d.r * k);
      updateIconAppearance();
    }

    function zoom(event, d) {
      focus = d;
      suppressIconReveal = true;
      hideIcons();

      // Calculate optimal zoom level to show all children without cutting them off
      let targetComponent;
      const groupPaddingFactor = 1.2; // tighter padding so focused clusters appear larger
      const groupScaleFloor = 2.4;
      const leafScaleFactor = 2.6;

      if (d.children && d.children.length > 0) {
        // Find the maximum radius needed to contain all children
        const maxChildDistance = Math.max(...d.children.map(child =>
          Math.sqrt((child.x - d.x) ** 2 + (child.y - d.y) ** 2) + child.r
        ));
        // Use a smaller component so the focused bubble occupies more of the viewport
        targetComponent = Math.max(maxChildDistance * groupPaddingFactor, d.r * groupScaleFloor);
      } else {
        // For leaf nodes, zoom tighter around the single article bubble
        const safeLeafRadius = Math.max(d.r, minViewComponent / 4);
        targetComponent = Math.max(safeLeafRadius * leafScaleFactor, minViewComponent);
      }

      targetComponent = Math.max(targetComponent, minViewComponent);

      const currentWidthForZoom = svgRef.current ? svgRef.current.getBoundingClientRect().width : width;
      const targetScale = currentWidthForZoom > 0 ? currentWidthForZoom / targetComponent : 1;

      const transition = svg.transition()
        .duration(event.altKey ? 15000 : 1000)
        .ease(d3.easeCubicInOut)
        .tween("zoom", d => {
          // Always center on the selected circle
          const i = d3.interpolateZoom(view, [focus.x, focus.y, targetComponent]);
          return t => zoomTo(i(t));
        });

      label.each(function(d) {
        if (d === focus || d.parent === focus) {
          applyTextLayout(d3.select(this), d, targetScale);
        }
      });
      label.style("display", d => shouldShowLabel(d) ? "inline" : "none");

      label
        .transition(transition)
        .style("fill-opacity", d => shouldShowLabel(d) ? 1 : 0)
        .style("fill", "#000000")
        .style("stroke", "#ffffff")
        .style("stroke-width", "3px")
        .style("paint-order", "stroke fill")
        .on("start", function(d) {
          this.style.display = "none";
          this.style.opacity = "0";
        })
        .on("end", applyFinalLayout);
    }

    focusNodeHandlerRef.current = (nodeId) => {
      if (!nodeId) {
        hideSummaryPanel();
        resetToInitialView();
        return;
      }

      const targetNode = nodeLookupRef.current.get(nodeId);
      if (!targetNode) {
        return;
      }

      if (targetNode.children && !targetNode.data.isSummary) {
        showSummaryPanel(targetNode.data);
        zoom({ altKey: false }, targetNode);
      } else if (targetNode.data.isSummary || (!targetNode.children && targetNode.data.description)) {
        showSummaryPanel(targetNode.data);
      }
    };

    // Handle window resize (debounced)
    const performResize = () => {
      if (!svgRef.current || !data) return;
      suppressIconReveal = true;
      hideIcons();
      
      const container = svgRef.current.parentElement;
      const containerRect = container.getBoundingClientRect();
      const newWidth = containerRect.width || container.clientWidth || container.offsetWidth || width;
      const newHeight = containerRect.height || container.clientHeight || container.offsetHeight || height;
      minViewComponent = Math.max(Math.min(newWidth, newHeight) * 0.05, 20);

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
      const newBaseInitialRadius = Math.max(newRoot.r, newWidth / 2, newHeight / 2);
      const newInitialComponent = Math.max(newBaseInitialRadius * 2, minViewComponent);
      const newScale = newWidth > 0 ? newWidth / newInitialComponent : getCurrentScale();
      focus = newRoot;
      view = [newRoot.x, newRoot.y, newInitialComponent];

      newRoot.descendants().forEach(descendant => {
        const pathKey = descendant.ancestors()
          .map(node => node.data?.name || '')
          .reverse()
          .join('>');
        descendant.data.__layoutId = pathKey || descendant.data?.id || `${descendant.depth}-${Math.round(descendant.x)}-${Math.round(descendant.y)}`;
        getLayoutFromCache(descendant, newScale);
      });
      
      // Update nodes and labels with new positions
      const newNodes = nodesGroup.selectAll("circle")
        .data(newRoot.descendants().slice(1), d => d.data.__layoutId || d.data.name);
      
      newNodes
        .transition()
        .duration(600)
        .ease(d3.easeCubicInOut)
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .attr("r", d => d.r);
      
      const newLabels = labelsGroup.selectAll('text')
        .data(newRoot.descendants(), d => d.data.__layoutId || d.data.name);

      newLabels.each(function(d) {
        if (d === focus || d.parent === focus) {
          applyTextLayout(d3.select(this), d, newScale);
        }
      });
      newLabels.style("display", d => shouldShowLabel(d) ? "inline" : "none");
      
      newLabels
        .transition()
        .duration(600)
        .ease(d3.easeCubicInOut)
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .style("fill-opacity", d => shouldShowLabel(d) ? 1 : 0)
        .on("start", function(d) {
          this.style.display = "none";
          this.style.opacity = "0";
        })
        .on("end", applyFinalLayout);

      const newIconNodes = newRoot.descendants().filter(descendant => !descendant.children && !descendant.data.isSummary && descendant.data.source);

      icons = iconGroup.selectAll("g.article-icon")
        .data(newIconNodes, d => d.data.__layoutId || d.data.name)
        .join(
          enter => {
            const gIcon = enter.append("g")
              .attr("class", "article-icon")
              .attr("transform", d => `translate(${d.x},${d.y})`)
              .style("pointer-events", "none")
              .style("opacity", 0);

            gIcon.append("circle")
              .attr("class", "article-icon-bg")
              .attr("r", d => Math.max(d.r * ICON_BG_RATIO, MIN_ICON_RADIUS))
              .attr("fill", "#ffffff")
              .attr("stroke", "none");

            gIcon.append("image")
              .attr("class", "article-icon-image")
              .attr("href", d => getIconUrl(d.data.source))
              .attr("width", d => Math.max(d.r * ICON_SIZE_RATIO, MIN_ICON_SIZE))
              .attr("height", d => Math.max(d.r * ICON_SIZE_RATIO, MIN_ICON_SIZE))
              .attr("x", d => -Math.max(d.r * ICON_SIZE_RATIO, MIN_ICON_SIZE) / 2)
              .attr("y", d => -Math.max(d.r * ICON_SIZE_RATIO, MIN_ICON_SIZE) / 2)
              .attr("preserveAspectRatio", "xMidYMid slice");

            return gIcon;
          },
        update => update
          .attr("transform", d => `translate(${d.x},${d.y})`)
          .style("opacity", 0)
          .each(function(d) {
            const iconImage = d3.select(this).select("image");
            const iconUrl = getIconUrl(d.data.source);
            if (iconUrl) {
              iconImage.attr("href", iconUrl).attr("xlink:href", iconUrl);
              } else {
                iconImage.attr("href", null).attr("xlink:href", null);
              }
            }),
          exit => exit.remove()
        );

      updateIconAppearance();

      // Update focus and view to show all circles
      zoomTo([focus.x, focus.y, newInitialComponent]);
      suppressIconReveal = false;
      updateIconAppearance();
    };

    let resizeRaf = null;
    const handleResize = () => {
      if (resizeRaf !== null) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        performResize();
      });
    };

    window.addEventListener('resize', handleResize);

    // No deferred layout, initial render already applied
    // Cleanup function
    return () => {
      focusNodeHandlerRef.current = null;
      nodeLookupRef.current = new Map();

      if (resizeRaf !== null) {
        cancelAnimationFrame(resizeRaf);
      }
      window.removeEventListener('resize', handleResize);
      svg.selectAll("*").remove();
      tooltip.remove();
    };
  }, [data, selectedDate, currentUserId]);

  useImperativeHandle(ref, () => ({
    focusOnNode: (nodeId) => {
      if (typeof nodeId === 'undefined') {
        return;
      }

      const handler = focusNodeHandlerRef.current;
      if (handler) {
        handler(nodeId);
      }
    }
  }), [focusNodeHandlerRef]);

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
});

CirclePacking.displayName = 'CirclePacking';

export default CirclePacking;
