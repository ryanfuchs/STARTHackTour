import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import './Dashboard.css';

const Dashboard = ({ onLogout }) => {
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

  const performanceData = [
    { name: 'Q1', performance: 12.5 },
    { name: 'Q2', performance: 8.3 },
    { name: 'Q3', performance: 15.2 },
    { name: 'Q4', performance: 11.8 },
  ];

  const aiInsights = [
    {
      title: "Market Trend Analysis",
      description: "AI predicts 15% growth potential in tech stocks over next quarter",
      confidence: 87,
      type: "bullish"
    },
    {
      title: "Risk Assessment",
      description: "Portfolio diversification suggests moderate risk exposure",
      confidence: 92,
      type: "neutral"
    },
    {
      title: "Investment Opportunity",
      description: "Emerging markets showing strong fundamentals",
      confidence: 78,
      type: "opportunity"
    }
  ];

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

          {/* Performance Card */}
          <div className="card performance-card">
            <h3 className="card-title">Quarterly Performance</h3>
            <div className="performance-chart">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={performanceData}>
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
                  <Bar dataKey="performance" fill="#D8C9B6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Insights Card */}
          <div className="card insights-card">
            <h3 className="card-title">AI Insights</h3>
            <div className="insights-list">
              {aiInsights.map((insight, index) => (
                <div key={index} className="insight-item">
                  <div className="insight-header">
                    <h4 className="insight-title">{insight.title}</h4>
                    <span className={`confidence-badge ${insight.type}`}>
                      {insight.confidence}%
                    </span>
                  </div>
                  <p className="insight-description">{insight.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

