# Pulse - Financial News Dashboard

A modern, interactive financial news detection and analysis dashboard built with React and D3.js for **Wellershoff & Partners** and **IBM**. This application automatically identifies, summarizes, and prepares financial news for human-in-the-loop review, addressing the critical challenge of monitoring global market-moving events.

## 🎯 Problem Statement

W&P analysts and strategists constantly scan global news for events that can move the markets and for news relevant to client portfolios. Upon significant developments, they must make strategic adjustments and communicate to clients. This process is resource-intensive and risks missing critical developments.

## 🎯 Project Goal

Develop a prototype that automatically identifies news relevant to financial markets (e.g., Fed decisions, CEO exits, earnings surprises), summarizes them, and prepares them for human-in-the-loop review at W&P before delivery to clients.

## 🚀 Features

### 📊 Interactive Data Visualization
- **Circle Packing Visualization**: Hierarchical display of news categories and articles
- **Portfolio Relevancy Trends**: Line chart showing relevancy trends over time
- **Portfolio Distribution**: Pie chart showing relevancy distribution across portfolios
- **Dynamic Filtering**: Click on groupings to filter portfolio data

### 📰 News Analysis
- **Top Relevancy Stories**: Automatically sorted by relevance scores
- **Potential Blind Spots**: AI-powered identification of overlooked opportunities
- **Analyst-Specific Insights**: Personalized blind spot analysis per team member
- **Real-time Data**: Live updates from financial news sources

### 👥 Team Collaboration
- **Analyst Dashboard**: Specialized views for different team members
- **Blind Spot Detection**: Identifies areas outside each analyst's expertise
- **Team Member Profiles**: Stefan von Winkon, Luca Eckhardt, Dr. Tatja Gisin

### 🔔 Smart Notifications
- **Alert Subscription**: Email and Slack integration via Slackbot
- **Customizable Notifications**: Choose your preferred notification channels
- **Priority Alerts**: High-urgency news with immediate notifications

### 📄 Financial Reports
- **Weekly WP Financial Review**: Automated PDF generation
- **Social Media Sharing**: Direct sharing to LinkedIn and Twitter
- **Download Options**: PDF download and preview functionality

## 🛠️ Technology Stack

### Frontend
- **React**: React 18 with Hooks
- **Visualization**: D3.js for interactive charts
- **Styling**: CSS3 with custom design system
- **Charts**: Recharts for portfolio analytics
- **Icons**: Custom SVG icons and Slack integration

### Backend & Infrastructure
- **Cloud Platform**: Amazon Web Services (AWS)
- **Serverless**: AWS Lambda for scalable backend processing
- **API**: RESTful API with Function URLs
- **Data**: JSON API integration with real-time processing
- **AI/ML**: IBM-powered financial news detection and analysis

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd STARTHackTour
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔐 Authentication

### Demo Mode
This application runs in **Demo Mode** for demonstration purposes:

- **Login**: Use any email address and password combination
- **No Registration**: Signup is disabled in demo mode
- **Personalized Experience**: Your entered email will be displayed in the dashboard

### Example Login Credentials
```
Email: demo@example.com
Password: anypassword
```

## 📊 Dashboard Overview

### Main Components

#### 1. **Pulse Insights** (Circle Packing Visualization)
- Interactive hierarchical view of news categories
- Click on nodes to explore subcategories and articles
- Color-coded by read status and depth
- Summary panels with detailed information

#### 2. **Portfolio Analytics**
- **News Relevancy Trend**: Weekly relevancy scores over time
- **Portfolio Distribution**: Relevancy breakdown across portfolios
- Dynamic updates based on selected news categories

#### 3. **Top Relevancy Stories**
- Top 5 most relevant news stories
- Clickable articles with detailed views
- Relevancy and urgency scoring

#### 4. **Potential Blind Spots**
- **High Relevancy**: Top relevant articles across all categories
- **High Urgency**: Most urgent news items
- **High Urgency, High Relevancy**: Combined scoring analysis

#### 5. **Critical Blind Spots per Team**
- Analyst-specific blind spot analysis
- Team member carousel (Stefan, Luca, Dr. Tatja)
- Sample articles outside each analyst's expertise

## 🎨 Design System

### Color Palette
- **Primary Blue**: `#748BB8`
- **Secondary Blue**: `#9EAECE`
- **Light Blue**: `#D6DDEA`
- **Beige Accent**: `#B0926D`
- **Text Gray**: `#6D6E70`

### Typography
- **Headings**: Bold, professional styling
- **Body Text**: Clean, readable fonts
- **Interactive Elements**: Clear visual hierarchy


## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:
```env
REACT_APP_API_URL=https://your-api-endpoint.com
REACT_APP_VERSION=1.0.0
```

### API Integration
The application fetches data from our AWS-hosted backend:
```
https://t3zuixlu7gmep4l657lhm5ekpm0ukrrb.lambda-url.eu-north-1.on.aws
```

### Backend Infrastructure
- **Hosting**: Amazon Web Services (AWS)
- **Service**: AWS Lambda with Function URLs
- **Architecture**: Serverless backend for scalable data processing
- **Data Processing**: Real-time financial news analysis and portfolio scoring

## 🚀 Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run test suite
- `npm eject` - Eject from Create React App

## 📊 Data Structure

### News Data Format

**Note**: This format was used to achieve fast results due to time constraints at the hackathon. The team collected all data independently and trained their own model, ensuring complete independence from external news frameworks. For productive use, a complete restructuration of the data format is highly recommended for better maintainability and scalability.
```json
{
  "data": {
    "labeldata": [
      {
        "label_title": "AI Data-Center and Streaming Surge",
        "relevancy_port1": 9,
        "relevancy_port2": 9,
        "relevancy_port3": 1,
        "urgency": 8,
        "label_summary": "News summary...",
        "reasoning_portfolios": {
          "port_1": "Analysis for portfolio 1...",
          "port_2": "Analysis for portfolio 2...",
          "port_3": "Analysis for portfolio 3..."
        },
        "children": [...]
      }
    ]
  }
}
```

## 🛡️ Security & Privacy

- **Demo Mode**: No real authentication required
- **Data Privacy**: All data processing happens client-side
- **Secure API**: HTTPS endpoints for data fetching
- **No Data Storage**: No persistent user data storage

## 🏆 STARTHack Tour 2025

This project was developed as part of **STARTHack Tour 2025** in collaboration between **Wellershoff & Partners** and **IBM**, showcasing innovative solutions in financial news detection and automated analysis. The Pulse dashboard represents our joint commitment to creating cutting-edge tools for modern financial analysis and decision-making.

**Event**: STARTHack Tour 2025  
**Partners**: Wellershoff & Partners & IBM  
**Challenge**: Financial News Detection & Analysis  
**Solution**: Automated Financial News Detection Dashboard  

---

**Built with ❤️ by for Wellershoff & Partners & IBM Development Team at STARTHack Tour 2025 - Boris Kantor, Filip Cybulski, Luka Wedegärtner, Ryan Fuchs**
