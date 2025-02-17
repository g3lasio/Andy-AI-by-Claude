
# AndyAI - Intelligent Tax Assistant

This project is built with [Next.js](https://nextjs.org) and uses modern technologies to provide an intelligent tax assistant.

## Main Features

- 🤖 AI Assistant with Claude-3 for tax queries
- 💬 Interactive chat with professional interface
- 📊 Modern and responsive Dashboard
- 🔒 Secure authentication with Firebase
- 📋 Intelligent tax document management
- 🧠 Memory system for conversational context

## Project Structure

```
src/
├── app/                    # Next.js components and pages
├── core-hub/              # Application core
│   ├── ai/               # AI services
│   │   └── predictive/   # Shared predictive analytics
│   ├── chat/            # Chat system and commands
│   ├── documents/       # Document management
│   └── memory/         # Memory and context system
├── modules/              # Specific modules
│   └── taxAdvisor/     # Tax advisory module
└── shared/              # Shared utilities
```

## Core Hub Shared Functions

The Core Hub contains essential shared services used across multiple modules:

### AI Services
- Predictive Analytics Hub
- Risk Assessment Engine
- Financial Pattern Recognition
- Market Trend Analysis

### Document Management
- Intelligent Document Processing
- Form Classification & Validation
- Secure Document Storage
- Permission Management
- Encryption Services

### Chat System
- Intent Analysis
- Context Management
- Command Processing
- Form Finding & Filling
- Action Execution

### Memory System
- User Context Management
- Financial Profile Tracking
- Historical Data Analysis
- Smart Data Caching

## Technologies Used

- Next.js 14
- TypeScript
- TailwindCSS
- Firebase
- Claude-3 API
- Jest/Vitest for testing

## Getting Started

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `.env.local`

4. Start the development server:
```bash
npm run dev
```

Open [http://0.0.0.0:3000](http://0.0.0.0:3000) in your browser to view the application.

## Testing

```bash
npm run test        # Run tests with Jest
npm run test:watch  # Watch mode
npm run validate    # Run complete validations
```

## Latest Updates

- ✨ New more professional and futuristic user interface
- 🎨 Modern dashboard implementation
- 🔄 Improvement in contextual memory system
- 🚀 Performance optimization
- 🛠️ Improvements in modular architecture

## Upcoming Features

- [ ] Integration with more tax services
- [ ] Improvements in predictive analysis
- [ ] Documentation system expansion
- [ ] New dashboard functionalities

## Contributing

Contributions are welcome. Please make sure to run validations before submitting a PR:

```bash
npm run validate
```
