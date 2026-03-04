# NeuralBox Campus IA — Frontend

## Stack
- **React 18** + **Vite 5** + **React Router 6**
- CSS puro (brand: Syncopate + Rajdhani + Share Tech Mono)
- JWT auth con refresh token rotation
- Responsive (mobile hamburger menu)

## Estructura
```
src/
├── main.jsx              # Entry point
├── App.jsx               # Router + role-based routes
├── context/
│   └── AuthContext.jsx    # Auth state global
├── hooks/
│   └── useApi.js         # Fetch hooks con loading/error
├── utils/
│   └── api.js            # HTTP client con JWT auto-refresh
├── components/
│   ├── Layout.jsx         # Sidebar + TopBar
│   ├── Modal.jsx          # Modal reutilizable
│   └── PostsChannel.jsx   # Publisher rico (texto/prompt/media/link)
├── pages/
│   ├── LoginPage.jsx      # Auth (login/register/guest)
│   ├── DashboardPage.jsx  # Admin KPIs
│   ├── LeadsPage.jsx      # CRUD leads
│   ├── UsersPage.jsx      # Tabla usuarios
│   ├── ContentPage.jsx    # Editor módulos/lecciones
│   ├── ChannelsPage.jsx   # Categorías/canales
│   ├── PaymentsPage.jsx   # Transacciones
│   ├── CodesPage.jsx      # Generador códigos
│   ├── AnnouncementsPage.jsx
│   ├── FreeboxPage.jsx
│   ├── CampusPage.jsx     # Grid módulos
│   ├── ModulePage.jsx     # Lecciones del módulo
│   ├── LessonPage.jsx     # Player + completar
│   ├── LeaderboardPage.jsx
│   ├── ProfilePage.jsx    # Avatar + username
│   └── PricingPage.jsx    # Planes con colores
├── styles/
│   └── global.css         # Todo el CSS
└── deploy/
    ├── nginx.conf         # Config Nginx producción
    └── setup.sh           # Script deploy VPS
```

## Desarrollo local
```bash
cp .env.example .env
npm install
npm run dev        # → http://localhost:5173
```
El proxy de Vite redirige `/api` → `localhost:3001` (backend).

## Build producción
```bash
npm run build      # → dist/
```

## Deploy
```bash
chmod +x deploy/setup.sh
./deploy/setup.sh
```

## Roles y acceso
| Ruta | Cuántico | Sinapsis | Sin Conexión |
|------|----------|----------|--------------|
| /dashboard, /leads, /users, /content, /channels, /payments, /codes | ✅ | ❌ | ❌ |
| /announcements | ✅ publica | ✅ lee | ❌ |
| /freebox | ✅ | ✅ | ✅ |
| /campus, /leaderboard, /profile | ✅ | ✅ | ❌ |
| /pricing | ✅ | ✅ | ✅ (canal "ingresar") |

## API Endpoints consumidos
- `POST /api/auth/login` `register` `refresh` `logout`
- `GET /api/auth/me`
- `GET /api/admin/stats` `users` `payments` `leads` `codes`
- `GET /api/content/courses` `modules/:id/lessons` `lessons/:id`
- `POST /api/content/modules` `lessons`
- `GET /api/community/categories` `channels/:slug/posts`
- `POST /api/community/posts` `reactions`
- `GET /api/progress/leaderboard`
- `POST /api/progress/complete`
