# Blind Spot Tracking System

This system tracks which articles and categories have been read by team members to identify reading gaps and blind spots.

## How It Works

### Data Structure
Each article and summary node can have a `readBy` array containing user IDs:

```json
{
  "name": "Tech Stocks",
  "value": 95,
  "description": "Article description",
  "readBy": ["user1", "user2"]
}
```

### Hierarchical Reading Logic
- **Individual Articles**: Marked as read if the current user's ID is in the `readBy` array
- **Groups/Categories**: Considered read if:
  1. Their summary is marked as read, OR
  2. All their children (non-summary) are read
- **Visual Indicators**: Read groups appear in lighter colors

### Visual Features

#### Circle Packing Visualization
- **Read articles**: Light gray background with green border
- **Unread articles**: White background with red border  
- **Read groups**: Brighter/lighter colors than unread groups
- **Read summaries**: Brighter beige color with green border

#### Summary Panel
- Shows reading status (READ/UNREAD)
- Shows group completion status (COMPLETE/INCOMPLETE)
- Displays how many team members have read the article
- Button to mark as read/unread (currently logs to console)

#### Blind Spot Dashboard
- **Reading Coverage**: Overall statistics on articles and groups read
- **Your Unread Articles**: List of articles you haven't read
- **Blind Spots**: Categories with low reading coverage
- **Completely Unread**: Articles no one has read

## Usage

### Current User
The system uses `currentUserId = 'user1'` by default. In a real implementation, this would come from your authentication system.

### Marking Articles as Read
Click on any article or summary circle to open the detail panel, then click "Mark as Read" or "Mark as Unread".

### Blind Spot Detection
The system automatically identifies:
- Articles unread by the current user
- Categories with low reading coverage (configurable threshold)
- Articles unread by everyone

## Implementation Notes

### Files Modified
- `src/components/CirclePacking.js` - Added reading status logic and visual indicators
- `src/components/Dashboard.js` - Added Blind Spot Dashboard integration
- `src/data/newsData.json` - Added sample `readBy` arrays
- `src/components/CirclePacking.css` - Added reading status styles

### New Files
- `src/components/BlindSpotDashboard.js` - Blind spot analysis component
- `src/components/BlindSpotDashboard.css` - Styles for blind spot dashboard
- `src/utils/blindSpotDetection.js` - Utility functions for reading analysis

### Future Enhancements
- Real-time updates when marking articles as read
- Team member management
- Reading time tracking
- AI-powered recommendations
- Export functionality for reading reports
