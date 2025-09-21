import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import CirclePacking from './CirclePacking';
import BlindSpotsView from './BlindSpotsView';
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

  // State for article detail view
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showArticleDetail, setShowArticleDetail] = useState(false);

  // State for weekly review modal
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);

  // State for alerts subscription
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [slackAlerts, setSlackAlerts] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);

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

  // Generate portfolio relevancy trend data from news data
  const generatePortfolioTrendData = (data) => {
    if (!data || !data[0] || !data[0].data || !data[0].data.labeldata) {
      return [
        { name: 'Week 1', relevancy: 6.2 },
        { name: 'Week 2', relevancy: 6.8 },
        { name: 'Week 3', relevancy: 7.1 },
        { name: 'Week 4', relevancy: 6.9 },
        { name: 'Week 5', relevancy: 7.4 },
        { name: 'Week 6', relevancy: 7.6 },
      ];
    }

    const labelData = data[0].data.labeldata;
    const currentAvgRelevancy = labelData.reduce((sum, item) => {
      const avgRelevancy = (item.relevancy_port1 + item.relevancy_port2 + item.relevancy_port3) / 3;
      return sum + avgRelevancy;
    }, 0) / labelData.length;

    // Generate trend data based on current relevancy with some variation
    return [
      { name: 'Week 1', relevancy: Math.max(1, currentAvgRelevancy - 1.5) },
      { name: 'Week 2', relevancy: Math.max(1, currentAvgRelevancy - 1.0) },
      { name: 'Week 3', relevancy: Math.max(1, currentAvgRelevancy - 0.5) },
      { name: 'Week 4', relevancy: currentAvgRelevancy },
      { name: 'Week 5', relevancy: Math.min(10, currentAvgRelevancy + 0.5) },
      { name: 'Week 6', relevancy: Math.min(10, currentAvgRelevancy + 1.0) },
    ];
  };

  // Generate portfolio allocation data from news relevancy
  const generatePortfolioAllocationData = (data) => {
    if (!data || !data[0] || !data[0].data || !data[0].data.labeldata) {
      return [
        { name: 'Portfolio 1', value: 35, color: '#748BB8' },
        { name: 'Portfolio 2', value: 40, color: '#B0926D' },
        { name: 'Portfolio 3', value: 25, color: '#D6DDEA' },
      ];
    }

    const labelData = data[0].data.labeldata;
    let port1Total = 0, port2Total = 0, port3Total = 0;

    labelData.forEach(item => {
      port1Total += item.relevancy_port1 || 0;
      port2Total += item.relevancy_port2 || 0;
      port3Total += item.relevancy_port3 || 0;
    });

    const total = port1Total + port2Total + port3Total;
    
    return [
      { 
        name: 'Portfolio 1', 
        value: Math.round((port1Total / total) * 100), 
        color: '#748BB8',
        avgRelevancy: Math.round((port1Total / labelData.length) * 10) / 10
      },
      { 
        name: 'Portfolio 2', 
        value: Math.round((port2Total / total) * 100), 
        color: '#B0926D',
        avgRelevancy: Math.round((port2Total / labelData.length) * 10) / 10
      },
      { 
        name: 'Portfolio 3', 
        value: Math.round((port3Total / total) * 100), 
        color: '#D6DDEA',
        avgRelevancy: Math.round((port3Total / labelData.length) * 10) / 10
      },
    ];
  };

  // Generate chart data based on current news data
  const portfolioData = generatePortfolioTrendData(outputData);
  const assetAllocation = generatePortfolioAllocationData(outputData);


  // Transform the new data structure for circle packing
  const transformDataForCirclePacking = (data) => {
    // Handle the new nested structure: data[0].data.labeldata
    const labelData = data && data[0] && data[0].data && data[0].data.labeldata;
    if (!Array.isArray(labelData)) return { name: "News Portfolio", children: [] };
    
    // Create standalone summary node for the root level
    const rootSummary = {
      name: "Summary: News Portfolio",
      value: 95, // High priority for root summary
      description: "Overview of all news categories and their impact on portfolio performance",
      readBy: [],
      id: "root-summary",
      label: "root-summary",
      source: null,
      isSummary: true
    };
    
    const portfolioChildren = labelData.map((item, index) => {
        // Calculate average relevancy across portfolios
        const avgRelevancy = item.relevancy_port1 && item.relevancy_port2 && item.relevancy_port3 
          ? Math.round((item.relevancy_port1 + item.relevancy_port2 + item.relevancy_port3) / 3)
          : 50;
        
        // Create children array with individual articles (no summary node for portfolio groups)
        const children = [];
        
        // Add individual articles - handle nested children structure (up to 4 levels deep)
        const processChildren = (childrenArray, parentIndex = 0, level = 0) => {
          if (!childrenArray) return [];
          
          return childrenArray.map((child, childIndex) => {
            // If this child has its own children (nested structure), process them recursively
            if (child.children && child.children.length > 0) {
              // This is a sub-group, process its children recursively
              const subGroupChildren = [];
              
              // Add summary for sub-group (always create for parent nodes)
              subGroupChildren.push({
                name: `Summary: ${child.label_title || `Sub-group ${childIndex + 1}`}`,
                value: 90,
                description: child.label_summary || `Summary of ${child.label_title || `Sub-group ${childIndex + 1}`}`,
                readBy: child.read || [],
                id: `summary-${parentIndex}-${childIndex}-${level}`,
                label: `summary-${parentIndex}-${childIndex}-${level}`,
                source: null,
                isSummary: true
              });
              
              // Process nested children (articles) and add them to sub-group
              // Recursively process all levels
              const nestedChildren = processChildren(child.children, childIndex, level + 1);
              subGroupChildren.push(...nestedChildren);
              
              // Return the sub-group with its children
              return {
                name: child.label_title || `Sub-group ${childIndex + 1}`,
                value: child.urgency || 50,
                description: child.label_summary || "No summary available",
                readBy: child.read || [],
                id: child.id || `subgroup-${parentIndex}-${childIndex}-${level}`,
                label: child.label || `label-${parentIndex}-${childIndex}-${level}`,
                children: subGroupChildren,
                isSummary: false
              };
            } else {
              // This is a leaf article
              const article = {
                name: child.label_title || `Article ${childIndex + 1}`,
                value: Math.floor(Math.random() * 100), // Random value for now
                description: child.label_summary || "No summary available",
                readBy: child.read || [],
                id: child.id || `article-${parentIndex}-${childIndex}-${level}`,
                label: child.label || `label-${parentIndex}-${childIndex}-${level}`,
                source: child.source || null,
                isSummary: false
              };
              
              // Debug: Log source data for leaf articles
              if (child.source) {
                console.log('Found source for article:', article.name, 'Source:', child.source);
              }
              
              return article;
            }
          });
        };
        
        const processedChildren = processChildren(item.children, index, 0);
        children.push(...processedChildren);
        
        return {
          name: item.label_title || `News Group ${index + 1}`,
          value: item.urgency || 50,
          description: item.label_summary || "No summary available",
          readBy: item.read || [],
          urgency: item.urgency,
          relevancy: avgRelevancy,
          reasoning: item.reasoning_portfolios,
          count: item.count || 0,
          children: children,
          id: item.id || `group-${index}`,
          label: item.label || `label-${index}`
        };
      });
    
    return {
      name: "News Portfolio",
      children: [rootSummary, ...portfolioChildren]
    };
  };

  const circlePackingData = outputData ? transformDataForCirclePacking(outputData) : { name: "News Portfolio", children: [] };

  // Handle article detail view
  const openArticleDetail = (article) => {
    setSelectedArticle(article);
    setShowArticleDetail(true);
  };

  const closeArticleDetail = () => {
    setSelectedArticle(null);
    setShowArticleDetail(false);
  };

  const markArticleAsRead = (article) => {
    // In a real application, this would update the backend
    // For now, we'll just close the detail view
    console.log('Marking article as read:', article.title);
    closeArticleDetail();
  };

  // Social sharing functions
  const shareOnLinkedIn = () => {
    const url = encodeURIComponent(window.location.origin + '/wpFinancialReview.pdf');
    const text = encodeURIComponent('Check out our Weekly WP Financial Review - comprehensive insights on market trends and portfolio analysis.');
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    window.open(linkedinUrl, '_blank', 'width=600,height=400');
  };

  const shareOnTwitter = () => {
    const url = encodeURIComponent(window.location.origin + '/wpFinancialReview.pdf');
    const text = encodeURIComponent('📊 Weekly WP Financial Review is out! Key insights on market trends and portfolio analysis. #FinancialReview #MarketAnalysis');
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

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
              <div className="alerts-subscription">
                <label className="alerts-toggle">
                  <input
                    type="checkbox"
                    checked={alertsEnabled}
                    onChange={(e) => {
                      setAlertsEnabled(e.target.checked);
                      if (e.target.checked) {
                        setShowAlertsModal(true);
                      }
                    }}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-label">Subscribe to Alerts</span>
                </label>
              </div>
              <span className="user-info">Welcome back, John</span>
              <button onClick={onLogout} className="btn btn-secondary">
                Logout
              </button>
            </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-grid">
          {/* Portfolio Relevancy Trend Card */}
          <div className="card portfolio-card">
            <h3 className="card-title">News Relevancy Trend</h3>
            <div className="portfolio-value">
              <span className="value-amount">{portfolioData[portfolioData.length - 1]?.relevancy?.toFixed(1) || '7.6'}/10</span>
              <span className="value-change positive">+{((portfolioData[portfolioData.length - 1]?.relevancy - portfolioData[0]?.relevancy) || 1.4).toFixed(1)}</span>
            </div>
            <div className="portfolio-chart">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={portfolioData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E6" />
                  <XAxis dataKey="name" stroke="#6D6E70" />
                  <YAxis stroke="#6D6E70" domain={[0, 10]} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#F1F1F2',
                      border: '1px solid #E5E5E6',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [`${value}/10`, 'Avg Relevancy']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="relevancy" 
                    stroke="#8EA4B7" 
                    strokeWidth={3}
                    dot={{ fill: '#8EA4B7', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Portfolio Relevancy Distribution Card */}
          <div className="card allocation-card">
            <h3 className="card-title">Portfolio Relevancy Distribution</h3>
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
                    formatter={(value, name, props) => [
                      `${value}% (Avg: ${props.payload.avgRelevancy}/10)`, 
                      name
                    ]}
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
                          summary: node.label_summary,
                          id: node.id,
                          source: node.source,
                          readBy: node.read || [],
                          isSummary: false
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
                      <div 
                        key={index} 
                        className="story-item clickable"
                        onClick={() => openArticleDetail({
                          title: story.title,
                          summary: story.summary,
                          relevancy: story.relevancy,
                          urgency: story.urgency,
                          source: story.source,
                          id: story.id,
                          readBy: story.readBy,
                          isRead: story.readBy.includes(currentUserId)
                        })}
                      >
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
                
                {/* Weekly WP Financial Review Section */}
                <div className="weekly-review-section">
                  <button 
                    className="btn btn-weekly-review"
                    onClick={() => setShowWeeklyReview(true)}
                  >
                    Create Weekly WP Financial Review
                  </button>
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
                       highRelevancy: [],
                       highUrgency: [],
                       highUrgencyHighRelevancy: []
                     };
                     
                     const allArticles = [];
                     
                     const processNode = (node, level = 0) => {
                       if (node.label_title && node.relevancy_port1 !== undefined) {
                         const avgRelevancy = (node.relevancy_port1 + node.relevancy_port2 + node.relevancy_port3) / 3;
                         const isRead = node.read && node.read.length > 0;
                         
                         // Collect all articles for sorting
                         allArticles.push({
                           title: node.label_title,
                           relevancy: avgRelevancy,
                           urgency: node.urgency,
                           level: level,
                           summary: node.label_summary,
                           isRead
                         });
                         
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
                       }
                       
                       if (node.children) {
                         node.children.forEach(child => processNode(child, level + 1));
                       }
                     };
                     
                     labelData.forEach(node => processNode(node));
                     
                     // Sort all articles by relevancy and take top 3
                     analysis.highRelevancy = allArticles
                       .sort((a, b) => b.relevancy - a.relevancy)
                       .slice(0, 3);
                     
                     // Sort all articles by urgency and take top 3
                     analysis.highUrgency = allArticles
                       .sort((a, b) => b.urgency - a.urgency)
                       .slice(0, 3);
                     
                     // Sort all articles by combined urgency + relevancy and take top 3
                     analysis.highUrgencyHighRelevancy = allArticles
                       .sort((a, b) => (b.urgency + b.relevancy) - (a.urgency + a.relevancy))
                       .slice(0, 3);
                    
                    return (
                      <div className="blind-spot-grid">
                        {/* High Urgency, High Relevancy */}
                        <div className="blind-spot-section">
                          <h4 className="section-title">
                            <span className="icon">🔥</span>
                            High Urgency, High Relevancy
                            <span className="count">({analysis.highUrgencyHighRelevancy.length})</span>
                          </h4>
                          <div className="blind-spot-items">
                            {analysis.highUrgencyHighRelevancy.slice(0, 3).map((item, index) => (
                              <div key={index} className="blind-spot-item high-urgency clickable" onClick={() => openArticleDetail(item)}>
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
                              <div key={index} className="blind-spot-item high-urgency clickable" onClick={() => openArticleDetail(item)}>
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
                        
                         {/* High Relevancy */}
                         <div className="blind-spot-section">
                           <h4 className="section-title">
                             <span className="icon">⭐</span>
                             High Relevancy
                             <span className="count">({analysis.highRelevancy.length})</span>
                           </h4>
                           <div className="blind-spot-items">
                             {analysis.highRelevancy.slice(0, 3).map((item, index) => (
                               <div key={index} className="blind-spot-item high-relevancy clickable" onClick={() => openArticleDetail(item)}>
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

          {/* Blind Spots View - Full Width */}
          {outputData && (
            <BlindSpotsView 
              data={outputData} 
              currentUserId={currentUserId}
            />
          )}

        </div>
      </main>

      {/* Article Detail Modal */}
      {showArticleDetail && selectedArticle && (
        <div className="article-detail-modal">
          <div className="modal-backdrop" onClick={closeArticleDetail}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{selectedArticle.title}</h2>
              <button className="close-button" onClick={closeArticleDetail}>×</button>
            </div>
            <div className="modal-body">
              <div className="article-meta">
                <div className="article-scores">
                  <span className="score relevancy">Relevancy: {selectedArticle.relevancy.toFixed(1)}</span>
                  <span className="score urgency">Urgency: {selectedArticle.urgency}</span>
                </div>
                <div className="article-status">
                  {selectedArticle.isRead ? (
                    <span className="status read">✓ Read</span>
                  ) : (
                    <span className="status unread">Unread</span>
                  )}
                </div>
              </div>
              <div className="article-content">
                <h3>Summary</h3>
                <p>{selectedArticle.summary}</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeArticleDetail}>
                Close
              </button>
              {selectedArticle.source && (
                <button 
                  className="btn btn-source"
                  onClick={() => window.open(selectedArticle.source, '_blank')}
                >
                  Source
                </button>
              )}
              {!selectedArticle.isRead && (
                <div className="tooltip-container" data-tooltip="No qualification">
                  <button 
                    className="btn btn-primary disabled" 
                    onClick={() => markArticleAsRead(selectedArticle)}
                    disabled
                  >
                    Mark as Read
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Weekly WP Financial Review Modal */}
      {showWeeklyReview && (
        <div className="article-detail-modal">
          <div className="modal-backdrop" onClick={() => setShowWeeklyReview(false)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Weekly WP Financial Review</h2>
              <button className="close-button" onClick={() => setShowWeeklyReview(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="weekly-review-content">
                <p>Your Weekly WP Financial Review is ready for sharing!</p>
                <div className="pdf-preview">
                  <embed 
                    src="/wpFinancialReview.pdf" 
                    type="application/pdf" 
                    width="100%" 
                    height="400px"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowWeeklyReview(false)}>
                Close
              </button>
              <a 
                href="/wpFinancialReview.pdf" 
                download="Weekly-WP-Financial-Review.pdf"
                className="btn btn-primary"
              >
                Download PDF
              </a>
              <button 
                className="btn btn-linkedin"
                onClick={() => shareOnLinkedIn()}
              >
                Share on LinkedIn
              </button>
              <button 
                className="btn btn-twitter"
                onClick={() => shareOnTwitter()}
              >
                Share on Twitter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Subscription Modal */}
      {showAlertsModal && (
        <div className="article-detail-modal">
          <div className="modal-backdrop" onClick={() => setShowAlertsModal(false)}></div>
          <div className="modal-content alerts-modal">
            <div className="modal-header">
              <h2>Configure Alert Subscriptions</h2>
              <button className="close-button" onClick={() => setShowAlertsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="alerts-config">
                <p>Choose how you'd like to receive alerts for important news and market updates:</p>
                
                <div className="alert-option">
                  <label className="alert-option-label">
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                    />
                    <div className="alert-option-content">
                      <div className="alert-icon email-icon">📧</div>
                      <div className="alert-details">
                        <h4>Email Alerts</h4>
                        <p>Receive daily summaries and urgent news alerts via email</p>
                        <span className="alert-status">
                          {emailAlerts ? '✅ Enabled' : '❌ Disabled'}
                        </span>
                      </div>
                    </div>
                  </label>
                </div>

                <div className="alert-option">
                  <label className="alert-option-label">
                    <input
                      type="checkbox"
                      checked={slackAlerts}
                      onChange={(e) => setSlackAlerts(e.target.checked)}
                    />
                    <div className="alert-option-content">
                      <div className="alert-icon slack-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52-2.523A2.528 2.528 0 0 1 5.042 10.12h2.52v2.522a2.528 2.528 0 0 1-2.52 2.523zm0-6.744A2.528 2.528 0 0 1 2.522 5.898a2.528 2.528 0 0 1 2.52-2.523A2.528 2.528 0 0 1 7.562 5.898v2.523H5.042zm6.744 0A2.528 2.528 0 0 1 9.266 5.898a2.528 2.528 0 0 1 2.52-2.523A2.528 2.528 0 0 1 14.306 5.898v2.523h-2.52zm0 6.744a2.528 2.528 0 0 1 2.52 2.523A2.528 2.528 0 0 1 11.786 20.102a2.528 2.528 0 0 1-2.52-2.523v-2.522h2.52zm6.744-6.744A2.528 2.528 0 0 1 22.302 5.898a2.528 2.528 0 0 1-2.52-2.523A2.528 2.528 0 0 1 17.262 5.898v2.523h2.52zm0 6.744a2.528 2.528 0 0 1 2.52 2.523A2.528 2.528 0 0 1 19.782 20.102a2.528 2.528 0 0 1-2.52-2.523v-2.522h2.52z"/>
                        </svg>
                      </div>
                      <div className="alert-details">
                        <h4>Slack Integration (Slackbot)</h4>
                        <p>Get real-time notifications in your team Slack channel via Slackbot</p>
                        <span className="alert-status">
                          {slackAlerts ? '✅ Connected' : '❌ Not Connected'}
                        </span>
                      </div>
                    </div>
                  </label>
                </div>

                <div className="alert-preview">
                  <h4>Alert Preview:</h4>
                  <div className="preview-message">
                    <strong>🚨 High Priority Alert</strong><br/>
                    AI Data-Center Expansion Surge - Urgency: 8, Relevancy: 9.1<br/>
                    <em>Major coordinated moves — large hyperscaler capex...</em>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAlertsModal(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  // Fake subscription logic
                  if (emailAlerts || slackAlerts) {
                    console.log('Subscribing to alerts:', { emailAlerts, slackAlerts });
                    alert('Successfully subscribed to alerts! You will now receive notifications via your selected channels.');
                  } else {
                    alert('Please select at least one notification method.');
                    return;
                  }
                  setShowAlertsModal(false);
                }}
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

