# Overview

This is a Google Speech-to-Text testing and data collection system designed for children's English pronunciation training. The application enables voice recording, speech recognition accuracy measurement, and training data collection through a web interface. It provides comprehensive statistics, user management, sentence/word management, and CSV data export capabilities for analyzing speech recognition performance across different users and time periods.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Static Web Application**: Pure HTML/CSS/JavaScript frontend served as static files
- **UI Framework**: Tailwind CSS for styling with custom animations and Font Awesome icons
- **State Management**: Global JavaScript state variables for managing users, sentences, recording status, and results
- **Charts and Visualization**: Chart.js library for rendering statistics graphs and data visualization
- **Media Recording**: Browser Web API for microphone access and audio recording functionality

## Backend Architecture
- **Runtime**: Cloudflare Workers with Hono.js framework for serverless edge computing
- **API Design**: RESTful API endpoints with JSON responses for all data operations
- **File Structure**: TypeScript-based backend with JSX rendering capabilities
- **CORS Configuration**: Enabled for frontend-backend communication across different origins

## Data Storage
- **Database**: Cloudflare D1 (SQLite-based) for persistent data storage
- **Schema Design**: Separate tables for users, sentences/words, and recognition results
- **Migration System**: Wrangler CLI-based database migrations with local and production environments
- **Data Export**: CSV generation for recognition results and statistical analysis

## Authentication and Authorization
- **User Management**: Simple user registration system without authentication
- **Session Handling**: Frontend-managed user selection without server-side sessions
- **Access Control**: No complex authorization - open access for all registered users

# External Dependencies

## Speech Recognition Services
- **Google Speech-to-Text API**: Primary speech recognition service with configurable language models
- **Web Speech API**: Browser-native speech recognition as fallback option
- **Audio Processing**: Browser MediaRecorder API for capturing and processing audio input

## Development and Deployment
- **Cloudflare Pages**: Static site hosting and serverless function deployment
- **Cloudflare D1**: Managed SQLite database service for data persistence
- **Wrangler CLI**: Cloudflare development and deployment tooling

## Frontend Libraries
- **Tailwind CSS**: Utility-first CSS framework via CDN
- **Chart.js**: Data visualization library for statistics charts
- **Font Awesome**: Icon library for UI elements
- **Axios**: HTTP client library for API communication

## Build and Development Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Type-safe JavaScript compilation
- **Hono.js**: Lightweight web framework for Cloudflare Workers
- **@hono/vite-build**: Cloudflare Pages integration for Hono applications