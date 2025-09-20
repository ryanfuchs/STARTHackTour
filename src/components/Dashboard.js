import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import CirclePacking from './CirclePacking';
import './Dashboard.css';

const Dashboard = ({ onLogout }) => {
  // Date state for Pulse Insights
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  });

  // Current user ID (you can get this from authentication)
  const [currentUserId] = useState('user1');

  // State for fetched data
  const [outputData, setOutputData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://t3zuixlu7gmep4l657lhm5ekpm0ukrrb.lambda-url.eu-north-1.on.aws');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setOutputData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Sample data for charts
  const portfolioData = [
    { name: 'Jan', value: 4000 },
    { name: 'Feb', value: 3000 },
    { name: 'Mar', value: 5000 },
    { name: 'Apr', value: 4500 },
    { name: 'May', value: 6000 },
    { name: 'Jun', value: 5500 },
  ];

  const assetAllocation = [
    { name: 'Stocks', value: 45, color: '#748BB8' },
    { name: 'Bonds', value: 25, color: '#9EAECE' },
    { name: 'Real Estate', value: 20, color: '#D6DDEA' },
    { name: 'Commodities', value: 10, color: '#B0926D' },
  ];


  // Transform the new data structure for circle packing
  const transformDataForCirclePacking = (data) => {
    // Handle the new nested structure: data[0].data.labeldata
    const labelData = data && data[0] && data[0].data && data[0].data.labeldata;
    if (!Array.isArray(labelData)) return { name: "News Portfolio", children: [] };
    
    return {
      name: "News Portfolio",
      children: labelData.map((item, index) => {
        // Calculate average relevancy across portfolios
        const avgRelevancy = item.relevancy_port1 && item.relevancy_port2 && item.relevancy_port3 
          ? Math.round((item.relevancy_port1 + item.relevancy_port2 + item.relevancy_port3) / 3)
          : 50;
        
        // Create children array with summary node and individual articles
        const children = [];
        
        // Add summary node as first child
        if (item.label_summary) {
          children.push({
            name: `Summary: ${item.label_title || `News Group ${index + 1}`}`,
            value: 90, // High priority for summary nodes
            description: item.label_summary,
            timestamp: item.timestamp || new Date().toISOString(),
            lastUpdated: item.lastUpdated || new Date().toISOString(),
            readBy: item.read || [],
            id: `summary-${index}`,
            label: `summary-${index}`,
            source: null,
            isSummary: true // Mark as summary node
          });
        }
        
        // Add individual articles - handle nested children structure
        const processChildren = (childrenArray, parentIndex = 0) => {
          if (!childrenArray) return [];
          
          return childrenArray.map((child, childIndex) => {
            // If this child has its own children (nested structure), process them recursively
            if (child.children && child.children.length > 0) {
              // This is a sub-group, process its children recursively
              const subGroupChildren = [];
              
              // Add summary for sub-group if it exists
              if (child.label_summary) {
                subGroupChildren.push({
                  name: `Summary: ${child.label_title || `Sub-group ${childIndex + 1}`}`,
                  value: 90,
                  description: child.label_summary,
                  timestamp: child.timestamp || new Date().toISOString(),
                  lastUpdated: child.lastUpdated || new Date().toISOString(),
                  readBy: child.read || [],
                  id: `summary-${parentIndex}-${childIndex}`,
                  label: `summary-${parentIndex}-${childIndex}`,
                  source: null,
                  isSummary: true
                });
              }
              
              // Process nested children (articles) and add them to sub-group
              const nestedChildren = processChildren(child.children, childIndex);
              subGroupChildren.push(...nestedChildren);
              
              // Return the sub-group with its children
              return {
                name: child.label_title || `Sub-group ${childIndex + 1}`,
                value: child.urgency || 50,
                description: child.label_summary || "No summary available",
                timestamp: child.timestamp || new Date().toISOString(),
                lastUpdated: child.lastUpdated || new Date().toISOString(),
                readBy: child.read || [],
                id: child.id || `subgroup-${parentIndex}-${childIndex}`,
                label: child.label || `label-${parentIndex}-${childIndex}`,
                source: null,
                children: subGroupChildren,
                isSummary: false
              };
            } else {
              // This is a leaf article
              return {
                name: child.label_title || `Article ${childIndex + 1}`,
                value: Math.floor(Math.random() * 100), // Random value for now
                description: child.label_summary || "No summary available",
                timestamp: child.published || new Date().toISOString(),
                lastUpdated: child.published || new Date().toISOString(),
                readBy: child.read || [],
                id: child.id || `article-${parentIndex}-${childIndex}`,
                label: child.label || `label-${parentIndex}-${childIndex}`,
                source: child.source || "Unknown source",
                isSummary: false
              };
            }
          });
        };
        
        const processedChildren = processChildren(item.children, index);
        children.push(...processedChildren);
        
        return {
          name: item.label_title || `News Group ${index + 1}`,
          value: item.urgency || 50,
          description: item.label_summary || "No summary available",
          timestamp: item.timestamp || new Date().toISOString(),
          lastUpdated: item.lastUpdated || new Date().toISOString(),
          readBy: item.read || [],
          urgency: item.urgency,
          relevancy: avgRelevancy,
          reasoning: item.reasoning_portfolios,
          count: item.count || 0,
          children: children,
          // Add source for the main group if available
          source: item.source || null
        };
      })
    };
  };

  const circlePackingData = outputData ? transformDataForCirclePacking(outputData) : { name: "News Portfolio", children: [] };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="dashboard-brand">
            <img src="/images/Logo-WP.svg" alt="Wellershoff & Partners" className="dashboard-logo" />
            <div className="brand-text">
              <h1 className="dashboard-title">Pulse</h1>
              <span className="brand-subtitle">by Wellershoff & Partners</span>
            </div>
          </div>
          <div className="header-actions">
            <span className="user-info">Welcome back, John</span>
            <button onClick={onLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-grid">
          {/* Portfolio Value Card */}
          <div className="card portfolio-card">
            <h3 className="card-title">Portfolio Value</h3>
            <div className="portfolio-value">
              <span className="value-amount">$125,430</span>
              <span className="value-change positive">+2.4%</span>
            </div>
            <div className="portfolio-chart">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={portfolioData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E6" />
                  <XAxis dataKey="name" stroke="#6D6E70" />
                  <YAxis stroke="#6D6E70" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#F1F1F2',
                      border: '1px solid #E5E5E6',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8EA4B7" 
                    strokeWidth={3}
                    dot={{ fill: '#8EA4B7', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Asset Allocation Card */}
          <div className="card allocation-card">
            <h3 className="card-title">Asset Allocation</h3>
            <div className="allocation-chart">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={assetAllocation}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {assetAllocation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#F1F1F2',
                      border: '1px solid #E5E5E6',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="allocation-legend">
              {assetAllocation.map((item, index) => (
                <div key={index} className="legend-item">
                  <div 
                    className="legend-color" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="legend-label">{item.name}</span>
                  <span className="legend-value">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pulse Insights Card */}
          <div className="card pulse-insights-card">
            <div className="pulse-insights-header">
              <h3 className="card-title">Pulse Insights</h3>
            </div>
            <div className="pulse-insights-content">
              <div className="pulse-insights-main full-width">
                {loading ? (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading news data...</p>
          </div>
                ) : error ? (
                  <div className="error-container">
                    <p>Error loading data: {error}</p>
                    <button onClick={() => window.location.reload()} className="btn btn-primary">
                      Retry
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="circle-packing-wrapper">
                      <CirclePacking 
                        data={circlePackingData} 
                        selectedDate={selectedDate} 
                        currentUserId={currentUserId}
                        onDateChange={setSelectedDate}
                      />
                    </div>
                    <div id="pulse-summary-panel" className="pulse-summary-panel">
                      <div className="summary-placeholder">
                        <p>Click on a summary or article to view details</p>
                      </div>
                    </div>
                  </>
                )}
                </div>
            </div>
          </div>

          {/* Portfolio Relevancy Analysis */}
          {outputData && (
            <>
              <div className="card relevancy-overview-card">
                <h3 className="card-title">Portfolio Relevancy Overview</h3>
                <div className="relevancy-stats">
                  {(() => {
                    const labelData = outputData[0]?.data?.labeldata;
                    if (!labelData) return null;
                    
                    const allRelevancyScores = [];
                    const processNode = (node) => {
                      if (node.relevancy_port1 !== undefined) {
                        allRelevancyScores.push({
                          port1: node.relevancy_port1,
                          port2: node.relevancy_port2,
                          port3: node.relevancy_port3,
                          title: node.label_title,
                          urgency: node.urgency
                        });
                      }
                      if (node.children) {
                        node.children.forEach(processNode);
                      }
                    };
                    labelData.forEach(processNode);
                    
                    const avgPort1 = allRelevancyScores.reduce((sum, item) => sum + item.port1, 0) / allRelevancyScores.length;
                    const avgPort2 = allRelevancyScores.reduce((sum, item) => sum + item.port2, 0) / allRelevancyScores.length;
                    const avgPort3 = allRelevancyScores.reduce((sum, item) => sum + item.port3, 0) / allRelevancyScores.length;
                    const avgUrgency = allRelevancyScores.reduce((sum, item) => sum + item.urgency, 0) / allRelevancyScores.length;
                    
                    return (
                      <div className="relevancy-grid">
                        <div className="relevancy-item">
                          <div className="relevancy-label">Portfolio 1 (Tech Infrastructure)</div>
                          <div className="relevancy-score">{avgPort1.toFixed(1)}/10</div>
                          <div className="relevancy-bar">
                            <div className="relevancy-fill" style={{width: `${avgPort1 * 10}%`}}></div>
                          </div>
                        </div>
                        <div className="relevancy-item">
                          <div className="relevancy-label">Portfolio 2 (Cloud & Platforms)</div>
                          <div className="relevancy-score">{avgPort2.toFixed(1)}/10</div>
                          <div className="relevancy-bar">
                            <div className="relevancy-fill" style={{width: `${avgPort2 * 10}%`}}></div>
                          </div>
                        </div>
                        <div className="relevancy-item">
                          <div className="relevancy-label">Portfolio 3 (Consumer Staples)</div>
                          <div className="relevancy-score">{avgPort3.toFixed(1)}/10</div>
                          <div className="relevancy-bar">
                            <div className="relevancy-fill" style={{width: `${avgPort3 * 10}%`}}></div>
                          </div>
                        </div>
                        <div className="relevancy-item">
                          <div className="relevancy-label">Average Urgency</div>
                          <div className="relevancy-score">{avgUrgency.toFixed(1)}/10</div>
                          <div className="relevancy-bar">
                            <div className="relevancy-fill urgency" style={{width: `${avgUrgency * 10}%`}}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="card top-stories-card">
                <h3 className="card-title">Top Relevancy Stories</h3>
                <div className="stories-list">
                  {(() => {
                    const labelData = outputData[0]?.data?.labeldata;
                    if (!labelData) return null;
                    
                    const allStories = [];
                    const processNode = (node, level = 0) => {
                      if (node.label_title && node.relevancy_port1 !== undefined) {
                        const avgRelevancy = (node.relevancy_port1 + node.relevancy_port2 + node.relevancy_port3) / 3;
                        allStories.push({
                          title: node.label_title,
                          relevancy: avgRelevancy,
                          urgency: node.urgency,
                          level: level,
                          summary: node.label_summary
                        });
                      }
                      if (node.children) {
                        node.children.forEach(child => processNode(child, level + 1));
                      }
                    };
                    labelData.forEach(node => processNode(node));
                    
                    const topStories = allStories
                      .sort((a, b) => b.relevancy - a.relevancy)
                      .slice(0, 5);
                    
                    return topStories.map((story, index) => (
                      <div key={index} className="story-item">
                        <div className="story-header">
                          <h4 className="story-title">{story.title}</h4>
                          <div className="story-scores">
                            <span className="score relevancy">R: {story.relevancy.toFixed(1)}</span>
                            <span className="score urgency">U: {story.urgency}</span>
                          </div>
                        </div>
                        <p className="story-summary">{story.summary?.substring(0, 150)}...</p>
                      </div>
                    ));
                  })()}
                </div>
              </div>

          <div className="card blind-spot-card">
                <h3 className="card-title">Potential Blind Spots</h3>
                <div className="blind-spot-analysis">
                  {(() => {
                    const labelData = outputData[0]?.data?.labeldata;
                    if (!labelData) return null;
                    
                    // Analyze for potential blind spots
                    const analysis = {
                      lowRelevancy: [],
                      highUrgency: [],
                      highUrgencyLowRelevancy: []
                    };
                    
                    const processNode = (node, level = 0) => {
                      if (node.label_title && node.relevancy_port1 !== undefined) {
                        const avgRelevancy = (node.relevancy_port1 + node.relevancy_port2 + node.relevancy_port3) / 3;
                        const isRead = node.read && node.read.length > 0;
                        
                        // Low relevancy stories (potential blind spots)
                        if (avgRelevancy < 4) {
                          analysis.lowRelevancy.push({
                            title: node.label_title,
                            relevancy: avgRelevancy,
                            urgency: node.urgency,
                            level: level,
                            summary: node.label_summary,
                            isRead
                          });
                        }
                        
                        // High urgency stories
                        if (node.urgency >= 7) {
                          analysis.highUrgency.push({
                            title: node.label_title,
                            relevancy: avgRelevancy,
                            urgency: node.urgency,
                            level: level,
                            summary: node.label_summary,
                            isRead
                          });
                        }
                        
                        // High urgency but low relevancy (might be overlooked)
                        if (node.urgency >= 7 && avgRelevancy < 5) {
                          analysis.highUrgencyLowRelevancy.push({
                            title: node.label_title,
                            relevancy: avgRelevancy,
                            urgency: node.urgency,
                            level: level,
                            summary: node.label_summary,
                            isRead
                          });
                        }
                      }
                      
                      if (node.children) {
                        node.children.forEach(child => processNode(child, level + 1));
                      }
                    };
                    
                    labelData.forEach(node => processNode(node));
                    
                    return (
                      <div className="blind-spot-grid">
                        {/* High Urgency, Low Relevancy */}
                        <div className="blind-spot-section">
                          <h4 className="section-title">
                            <span className="icon">⚠️</span>
                            High Urgency, Low Relevancy
                            <span className="count">({analysis.highUrgencyLowRelevancy.length})</span>
                          </h4>
                          <div className="blind-spot-items">
                            {analysis.highUrgencyLowRelevancy.slice(0, 3).map((item, index) => (
                              <div key={index} className="blind-spot-item high-urgency">
                                <div className="item-header">
                                  <span className="item-title">{item.title}</span>
                                  <div className="item-scores">
                                    <span className="score relevancy">R: {item.relevancy.toFixed(1)}</span>
                                    <span className="score urgency">U: {item.urgency}</span>
                                  </div>
                                </div>
                                <p className="item-summary">{item.summary?.substring(0, 100)}...</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* High Urgency */}
                        <div className="blind-spot-section">
                          <h4 className="section-title">
                            <span className="icon">🚨</span>
                            High Urgency
                            <span className="count">({analysis.highUrgency.length})</span>
                          </h4>
                          <div className="blind-spot-items">
                            {analysis.highUrgency.slice(0, 3).map((item, index) => (
                              <div key={index} className="blind-spot-item high-urgency">
                                <div className="item-header">
                                  <span className="item-title">{item.title}</span>
                                  <div className="item-scores">
                                    <span className="score relevancy">R: {item.relevancy.toFixed(1)}</span>
                                    <span className="score urgency">U: {item.urgency}</span>
                                  </div>
                                </div>
                                <p className="item-summary">{item.summary?.substring(0, 100)}...</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Low Relevancy */}
                        <div className="blind-spot-section">
                          <h4 className="section-title">
                            <span className="icon">🔍</span>
                            Low Relevancy
                            <span className="count">({analysis.lowRelevancy.length})</span>
                          </h4>
                          <div className="blind-spot-items">
                            {analysis.lowRelevancy.slice(0, 3).map((item, index) => (
                              <div key={index} className="blind-spot-item low-relevancy">
                                <div className="item-header">
                                  <span className="item-title">{item.title}</span>
                                  <div className="item-scores">
                                    <span className="score relevancy">R: {item.relevancy.toFixed(1)}</span>
                                    <span className="score urgency">U: {item.urgency}</span>
                                  </div>
                                </div>
                                <p className="item-summary">{item.summary?.substring(0, 100)}...</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
          </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
};

export default Dashboard;

