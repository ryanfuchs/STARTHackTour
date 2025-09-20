// Blind Spot Detection Utilities

/**
 * Check if a group/category is read by a user
 * A group is read if its summary is read OR all its children are read
 */
export const isGroupRead = (nodeData, userId) => {
  if (!nodeData.children) return false;
  
  // Check if summary is read
  const summary = nodeData.children.find(child => child.isSummary);
  if (summary && hasUserRead(summary, userId)) {
    return true;
  }
  
  // Check if all non-summary children are read
  const nonSummaryChildren = nodeData.children.filter(child => !child.isSummary);
  if (nonSummaryChildren.length === 0) return false;
  
  return nonSummaryChildren.every(child => {
    if (child.children) {
      return isGroupRead(child, userId); // Recursive check for nested groups
    } else {
      return hasUserRead(child, userId); // Check leaf nodes
    }
  });
};

/**
 * Check if a user has read a specific node
 */
export const hasUserRead = (nodeData, userId) => {
  return nodeData.readBy && nodeData.readBy.includes(userId);
};

/**
 * Find all unread articles for a specific user
 */
export const findUnreadForUser = (data, userId) => {
  const unread = [];
  
  const traverse = (node) => {
    // Only check leaf nodes (articles) and summaries
    if ((!node.children && node.description) || node.isSummary) {
      if (!hasUserRead(node, userId)) {
        unread.push(node);
      }
    }
    
    if (node.children) {
      node.children.forEach(traverse);
    }
  };
  
  traverse(data);
  return unread;
};

/**
 * Find articles that no one has read
 */
export const findCompletelyUnread = (data) => {
  const unread = [];
  
  const traverse = (node) => {
    // Only check leaf nodes (articles) and summaries
    if ((!node.children && node.description) || node.isSummary) {
      if (!node.readBy || node.readBy.length === 0) {
        unread.push(node);
      }
    }
    
    if (node.children) {
      node.children.forEach(traverse);
    }
  };
  
  traverse(data);
  return unread;
};

/**
 * Get reading statistics for a user
 */
export const getReadingStats = (data, userId) => {
  let totalArticles = 0;
  let readArticles = 0;
  let unreadArticles = 0;
  let totalGroups = 0;
  let readGroups = 0;
  
  const traverse = (node) => {
    // Count articles and summaries
    if ((!node.children && node.description) || node.isSummary) {
      totalArticles++;
      if (hasUserRead(node, userId)) {
        readArticles++;
      } else {
        unreadArticles++;
      }
    }
    
    // Count groups
    if (node.children && !node.isSummary) {
      totalGroups++;
      if (isGroupRead(node, userId)) {
        readGroups++;
      }
    }
    
    if (node.children) {
      node.children.forEach(traverse);
    }
  };
  
  traverse(data);
  
  return {
    totalArticles,
    readArticles,
    unreadArticles,
    readPercentage: totalArticles > 0 ? (readArticles / totalArticles) * 100 : 0,
    totalGroups,
    readGroups,
    groupReadPercentage: totalGroups > 0 ? (readGroups / totalGroups) * 100 : 0
  };
};

/**
 * Find blind spots - categories with low reading coverage
 */
export const findBlindSpots = (data, userId, threshold = 50) => {
  const blindSpots = [];
  
  const traverse = (node) => {
    if (node.children && !node.isSummary) {
      const stats = getReadingStats(node, userId);
      
      if (stats.readPercentage < threshold) {
        blindSpots.push({
          category: node.name,
          readPercentage: stats.readPercentage,
          readArticles: stats.readArticles,
          totalArticles: stats.totalArticles,
          unreadArticles: stats.unreadArticles
        });
      }
      
      // Recursively check subcategories
      node.children.forEach(traverse);
    }
  };
  
  traverse(data);
  return blindSpots.sort((a, b) => a.readPercentage - b.readPercentage);
};
