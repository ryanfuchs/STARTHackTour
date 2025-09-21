import React, { useState, useEffect } from 'react';
import './BlindSpotsView.css';

const BlindSpotsView = ({ data, currentUserId = 'user1' }) => {
  const [selectedAnalyst, setSelectedAnalyst] = useState(0);
  const [blindSpots, setBlindSpots] = useState([]);

  // Sample analysts data (you can replace this with real data later)
  const analysts = [
    {
      name: "Stefan von Winkon",
      research_focus: "U.S. <strong>industrial automation</strong> and <strong>robotics</strong> suppliers. Focus on <strong>onshoring-driven capex cycles</strong>, component bottlenecks, and <strong>pricing power</strong> in integrated platforms.",
      avatar: "SvW"
    },
    {
      name: "Luca Eckhardt", 
      research_focus: "European <strong>digital payments</strong> and <strong>fintech</strong>. Analyzes wallet penetration, <strong>take-rate compression</strong>, and unit economics across QR, <strong>BNPL</strong>, and cross-border remittances.",
      avatar: "LE"
    },
    {
      name: "Dr. Tatja Gisin",
      research_focus: "European <strong>renewables</strong> and <strong>storage developers</strong>. Assesses merchant solar/wind exposure, <strong>PPA/CfD structures</strong>, and revenue cannibalization from rising renewables penetration.",
      avatar: "TG"
    }
  ];

  // Real blind spots data - articles that are far from analyst specializations
  const sampleBlindSpots = {
    0: [ // Stefan von Winkon - Industrial Automation (blind spots: politics, consumer retail)
      {
        id: 1,
        title: "Kyrgyzstan Social Democrats Struggle",
        description: "Kyrgyzstan's Social Democratic party is facing a sharp decline from its position a decade ago, signaling potential political realignment and domestic unrest. While primarily a domestic political story, changes in governance and stability in Kyrgyzstan can affect regional geopolitics, investor confidence, and the business environment for firms with Central Asian exposure.",
        urgency: 2,
        relevancy: 1,
        published: "2025-01-14T00:06:00Z",
        category: "Politics",
        impact: "Low",
        source: "The Diplomat",
        readBy: []
      },
      {
        id: 2,
        title: "Sephora 4X Skincare Points Promo",
        description: "Sephora is offering 4X loyalty points on skincare purchases via its coupon/promo, intended to boost short-term skincare sales and engagement with its rewards program. This can drive incremental consumer spending and brand visibility for skincare sellers on Sephora, but is a localized retail promotion with minimal market-wide impact.",
        urgency: 2,
        relevancy: 3,
        published: "2025-01-18T07:11:00Z",
        category: "Consumer Retail",
        impact: "Low",
        source: "Wired",
        readBy: []
      },
      {
        id: 3,
        title: "Lovense Osci 3 Review",
        description: "A review of the Lovense Osci 3 highlights a two-motor vibrator that can warm to near body temperature for a more natural feel — an incremental product improvement in the consumer sex-tech category. It's notable for advances in haptics, user comfort, and niche IoT-connected intimate devices.",
        urgency: 1,
        relevancy: 1,
        published: "2025-01-16T14:00:00Z",
        category: "Consumer Electronics",
        impact: "Low",
        source: "Wired",
        readBy: []
      }
    ],
    1: [ // Luca Eckhardt - Fintech/Payments (blind spots: politics, consumer products)
      {
        id: 4,
        title: "Kyrgyzstan Social Democrats Struggle",
        description: "Kyrgyzstan's Social Democratic party is facing a sharp decline from its position a decade ago, signaling potential political realignment and domestic unrest. Changes in governance and stability in Kyrgyzstan can affect regional geopolitics, investor confidence, and the business environment for firms with Central Asian exposure.",
        urgency: 2,
        relevancy: 1,
        published: "2025-01-14T00:06:00Z",
        category: "Politics",
        impact: "Low",
        source: "The Diplomat",
        readBy: []
      },
      {
        id: 5,
        title: "Imran Khan Conviction Looms",
        description: "Pakistan's former prime minister Imran Khan faces an imminent conviction in the Al-Qadir Trust case while his party (PTI) is reportedly negotiating with the government to avoid imprisonment. The situation risks triggering street protests, broader political instability, and pressure on Pakistan's institutions.",
        urgency: 5,
        relevancy: 1,
        published: "2025-01-14T17:58:00Z",
        category: "Politics",
        impact: "Medium",
        source: "The Diplomat",
        readBy: []
      },
      {
        id: 6,
        title: "Lovense Osci 3 Review",
        description: "A review of the Lovense Osci 3 highlights a two-motor vibrator that can warm to near body temperature for a more natural feel — an incremental product improvement in the consumer sex-tech category. It's notable for advances in haptics, user comfort, and niche IoT-connected intimate devices.",
        urgency: 1,
        relevancy: 1,
        published: "2025-01-16T14:00:00Z",
        category: "Consumer Electronics",
        impact: "Low",
        source: "Wired",
        readBy: []
      }
    ],
    2: [ // Dr. Tatja Gisin - Renewables/Storage (blind spots: politics, consumer retail, tech)
      {
        id: 7,
        title: "Kyrgyzstan Social Democrats Struggle",
        description: "Kyrgyzstan's Social Democratic party is facing a sharp decline from its position a decade ago, signaling potential political realignment and domestic unrest. While primarily a domestic political story, changes in governance and stability in Kyrgyzstan can affect regional geopolitics, investor confidence, and the business environment for firms with Central Asian exposure.",
        urgency: 2,
        relevancy: 1,
        published: "2025-01-14T00:06:00Z",
        category: "Politics",
        impact: "Low",
        source: "The Diplomat",
        readBy: []
      },
      {
        id: 8,
        title: "Microsoft ends Office on Windows 10",
        description: "Microsoft will stop supporting Office apps (Word, Excel, Outlook, etc.) on Windows 10 as it pushes users toward Windows 11, with support ending in October. This is a formal product lifecycle move that forces organizations and consumers to choose between upgrading their OS or losing native Office app support.",
        urgency: 5,
        relevancy: 1,
        published: "2025-01-15T19:29:07Z",
        category: "Technology",
        impact: "Medium",
        source: "Wired",
        readBy: []
      },
      {
        id: 9,
        title: "Sephora 4X Skincare Points Promo",
        description: "Sephora is offering 4X loyalty points on skincare purchases via its coupon/promo, intended to boost short-term skincare sales and engagement with its rewards program. This can drive incremental consumer spending and brand visibility for skincare sellers on Sephora, but is a localized retail promotion with minimal market-wide impact.",
        urgency: 2,
        relevancy: 3,
        published: "2025-01-18T07:11:00Z",
        category: "Consumer Retail",
        impact: "Low",
        source: "Wired",
        readBy: []
      }
    ]
  };

  useEffect(() => {
    // Set blind spots for the currently selected analyst
    setBlindSpots(sampleBlindSpots[selectedAnalyst] || []);
  }, [selectedAnalyst]);

  const handleAnalystChange = (index) => {
    setSelectedAnalyst(index);
  };

  const getUrgencyColor = (urgency) => {
    if (urgency >= 8) return '#FF6B6B'; // Red for high urgency
    if (urgency >= 6) return '#FFA726'; // Orange for medium urgency
    return '#66BB6A'; // Green for low urgency
  };

  const getRelevancyColor = (relevancy) => {
    if (relevancy >= 8) return '#42A5F5'; // Blue for high relevancy
    if (relevancy >= 6) return '#AB47BC'; // Purple for medium relevancy
    return '#26A69A'; // Teal for low relevancy
  };

  return (
    <div className="blind-spots-view">
      <div className="blind-spots-header">
        <h2>Critical Blind Spots by Analyst</h2>
        <p>Unread articles that could impact portfolio decisions</p>
      </div>
      
      <div className="blind-spots-content">
        {/* Left Third - Analyst Carousel */}
        <div className="analyst-carousel">
          <h3>Team Analysts</h3>
          <div className="carousel-container">
            {analysts.map((analyst, index) => (
              <div 
                key={index}
                className={`analyst-card ${selectedAnalyst === index ? 'active' : ''}`}
                onClick={() => handleAnalystChange(index)}
              >
                <div className="analyst-avatar">
                  {analyst.avatar}
                </div>
                <div className="analyst-info">
                  <h4>{analyst.name}</h4>
                  <p 
                    className="analyst-focus" 
                    dangerouslySetInnerHTML={{ __html: analyst.research_focus }}
                  />
                </div>
                <div className="analyst-indicator">
                  {selectedAnalyst === index && <div className="active-indicator" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle + Right Third - Blind Spots */}
        <div className="blind-spots-panel">
          <div className="blind-spots-header-panel">
            <h3>Critical Blind Spots for {analysts[selectedAnalyst].name}</h3>
            <div className="blind-spots-count">
              {blindSpots.length} unread articles
            </div>
          </div>
          
          <div className="blind-spots-list">
            {blindSpots.map((spot) => (
              <div key={spot.id} className="blind-spot-item">
                <div className="blind-spot-header">
                  <div className="blind-spot-title-section">
                    <h4 className="blind-spot-title">{spot.title}</h4>
                    <div className="blind-spot-category">{spot.category}</div>
                  </div>
                  <div className="blind-spot-scores">
                    <div className="score-badge urgency" style={{ backgroundColor: getUrgencyColor(spot.urgency) }}>
                      U: {spot.urgency}
                    </div>
                    <div className="score-badge relevancy" style={{ backgroundColor: getRelevancyColor(spot.relevancy) }}>
                      R: {spot.relevancy}
                    </div>
                  </div>
                </div>
                
                <div className="blind-spot-description">
                  {spot.description}
                </div>
                
                <div className="blind-spot-meta">
                  <div className="blind-spot-source">
                    <span className="source-label">Source:</span>
                    <span className="source-name">{spot.source}</span>
                  </div>
                  <div className="blind-spot-date">
                    {new Date(spot.published).toLocaleDateString()}
                  </div>
                  <div className="blind-spot-impact">
                    <span className="impact-label">Impact:</span>
                    <span className={`impact-value ${spot.impact.toLowerCase()}`}>
                      {spot.impact}
                    </span>
                  </div>
                </div>
                
                <div className="blind-spot-actions">
                  <div className="tooltip-container" data-tooltip="No qualification">
                    <button className="btn-mark-read disabled" disabled>
                      Mark as Read
                    </button>
                  </div>
                  <button className="btn-view-source">
                    View Source
                  </button>
                </div>
              </div>
            ))}
            
            {blindSpots.length === 0 && (
              <div className="no-blind-spots">
                <div className="no-blind-spots-icon">✓</div>
                <h4>No Critical Blind Spots</h4>
                <p>All relevant articles for this analyst have been read.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlindSpotsView;
