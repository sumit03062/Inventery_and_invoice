# 🏪 Mall Invoice Generator

Production-grade invoice system for shopping malls built with Django + React.

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Docker Desktop

### Setup Backend
\`\`\`bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
\`\`\`

### Setup Frontend
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

### Start Services
\`\`\`bash
docker-compose up -d
\`\`\`

## Features
- Multi-shop invoice generation
- JWT authentication
- Real-time stock management
- PDF invoice download
- Sales reporting
- Admin dashboard
- Role-based access control

## API Documentation
See `/api/` endpoint documentation

## Deployment
See deployment guide in docs/

## License
MIT