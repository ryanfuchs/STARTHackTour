import React from 'react';
import { findUnreadForUser, findCompletelyUnread, getReadingStats, findBlindSpots } from '../utils/blindSpotDetection';
import './BlindSpotDashboard.css';

const BlindSpotDashboard = ({ data, currentUserId = 'user1' }) => {
  const unreadForUser = findUnreadForUser(data, currentUserId);
  const completelyUnread = findCompletelyUnread(data);
  const readingStats = getReadingStats(data, currentUserId);
  const blindSpots = findBlindSpots(data, currentUserId, 30); // 30% threshold

  return (
    <div className="blind-spot-dashboard">
      <div className="blind-spot-header">
        <h3>Reading Coverage Analysis</h3>
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-value">{readingStats.readPercentage.toFixed(1)}%</div>
            <div className="stat-label">Articles Read</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{readingStats.groupReadPercentage.toFixed(1)}%</div>
            <div className="stat-label">Groups Complete</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{unreadForUser.length}</div>
            <div className="stat-label">Unread by You</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{completelyUnread.length}</div>
            <div className="stat-label">Unread by All</div>
          </div>
        </div>
      </div>

      <div className="blind-spot-content">
        <div className="blind-spot-section">
          <h4>Your Unread Articles</h4>
          <div className="article-list">
            {unreadForUser.slice(0, 5).map((article, index) => (
              <div key={index} className="article-item unread">
                <div className="article-name">{article.name}</div>
                <div className="article-category">
                  {article.isSummary ? 'Summary' : 'Article'}
                </div>
              </div>
            ))}
            {unreadForUser.length > 5 && (
              <div className="more-items">
                +{unreadForUser.length - 5} more articles
              </div>
            )}
          </div>
        </div>

        <div className="blind-spot-section">
          <h4>Blind Spots (Low Coverage Categories)</h4>
          <div className="blind-spot-list">
            {blindSpots.slice(0, 3).map((spot, index) => (
              <div key={index} className="blind-spot-item">
                <div className="blind-spot-category">{spot.category}</div>
                <div className="blind-spot-stats">
                  <div className="coverage-bar">
                    <div 
                      className="coverage-fill" 
                      style={{ width: `${spot.readPercentage}%` }}
                    ></div>
                  </div>
                  <span className="coverage-text">
                    {spot.readPercentage.toFixed(1)}% ({spot.readArticles}/{spot.totalArticles})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="blind-spot-section">
          <h4>Completely Unread Articles</h4>
          <div className="article-list">
            {completelyUnread.slice(0, 3).map((article, index) => (
              <div key={index} className="article-item completely-unread">
                <div className="article-name">{article.name}</div>
                <div className="article-category">
                  {article.isSummary ? 'Summary' : 'Article'}
                </div>
              </div>
            ))}
            {completelyUnread.length > 3 && (
              <div className="more-items">
                +{completelyUnread.length - 3} more articles
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlindSpotDashboard;
