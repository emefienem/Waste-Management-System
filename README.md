## ♻️ Smart Waste Management System — Smart Waste Reporting & Verification System

SWMS is an AI-powered waste reporting platform that allows users to upload images of waste, automatically verify the type and quantity using Google Gemini AI, and submit structured environmental reports with location tracking.

It combines computer vision, AI classification, and geolocation services to improve waste monitoring and environmental reporting.

### Features
- Image-based waste reporting
- AI-powered waste classification (Google Gemini)
- Automatic waste type & quantity estimation
- Location search with Google Places API
- Report submission & tracking system
- Recent reports dashboard
- Secure backend AI processing (no API key exposure)
- Real-time verification feedback
 
### AI Capabilities
The system uses Google Gemini (Flash model) to:
- Detect whether an image contains waste
- Classify waste type (plastic, organic, electronic, etc.)
- Estimate quantity (kg/L or range)
- Return structured JSON responses for processing

Example AI response:
`
{
  "wasteType": "plastic",
  "quantity": "10-15 kg",
  "confidence": 0.92
} `

### Tech Stack
# Frontend
- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Google Maps Places API
  
# Backend
- Next.js API Routes
- Google Gemini AI SDK
  
# Database
PostgreSQL (Drizzle ORM)

### Project Structure
`
app/
 └── report/
     └── page.tsx        # Main UI (upload, verify, submit)

app/api/
 └── verify/
     └── route.ts        # AI backend (Gemini processing)

lib/
 └── helper.ts           # JSON parsing utilities

utils/db/
 └── actions.ts          # Database operations
 `
### How It Works
- User uploads a waste image
- Image is sent to backend API (/api/verify)
- Backend sends image to Gemini AI
- AI returns structured JSON:
* waste type
* quantity
* confidence score
- Frontend displays verification result
- User submits report with location data
- Report is saved and displayed in dashboard
  
### Environment Variables
Create a .env.local file:
- NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=your_web3auth_client_id_key
- DATABASE_URL=your_database_url_key
- GEMINI_API_KEY=your_google_gemini_key
- GOOGLE_MAPS_API_KEY=your_google_maps_key

### Example Flow
- Upload image of waste
- Click Verify Waste
- AI returns:
`Type: plastic | Qty: 5-10 kg | Confidence: 92%`
- Add location
- Submit report
- View in recent reports table
  
### Key Design Decisions
- AI processing moved to backend for security
- Strict JSON schema enforcement for Gemini responses
- File upload handled via Base64 encoding
- Location handled via Google Places Autocomplete
- Stateless frontend with API-driven architecture
  
### Known Limitations
- AI accuracy depends on image quality
- Large image uploads may slow verification
- Requires stable internet for Gemini API calls
  
### Future Improvements
- Admin analytics dashboard
- Heatmap of waste reports
- Improved AI classification model (multi-label waste detection)
- Export reports as CSV/PDF
- Role-based system (users, recyclers, admins)
- Mobile app version
