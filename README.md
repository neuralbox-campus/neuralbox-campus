# NeuralBox Campus IA

Plataforma de aprendizaje en Inteligencia Artificial para el mercado hispano.

## Stack

- **Frontend:** React 18 + Vite + TailwindCSS
- **Backend:** Node.js + Fastify + Prisma
- **Database:** PostgreSQL
- **Pagos:** Wompi (CO), MercadoPago (LATAM), PayPal (INT), CryptAPI (Crypto)
- **Video:** Bunny Stream CDN
- **Email:** Resend
- **Hosting:** Railway

## Setup Local

### Requisitos
- Node.js 20+
- Docker & Docker Compose
- Git

### 1. Clonar y configurar

```bash
git clone https://github.com/tu-usuario/neuralbox-campus.git
cd neuralbox-campus

# Copiar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con tus credenciales
```

### 2. Iniciar base de datos

```bash
docker-compose up -d
```

### 3. Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
node ../prisma/seed.js
npm run dev
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Acceder

- Frontend: http://localhost:5173
- API: http://localhost:3001
- Admin: admin@neuralboxai.com / NeuralBox2026!

## Estructura

```
neuralbox-campus/
├── frontend/          # React + Vite + Tailwind
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── utils/
├── backend/           # Fastify + Prisma
│   └── src/
│       ├── routes/    # auth, content, progress, community, admin, webhooks
│       ├── middleware/ # auth, rate-limit
│       ├── services/  # email, payments, xp
│       └── utils/     # prisma, helpers
├── prisma/
│   ├── schema.prisma  # Data model
│   └── seed.js        # Initial data
├── docker-compose.yml # PostgreSQL + Redis
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Crear cuenta
- `POST /api/auth/login` — Iniciar sesion
- `POST /api/auth/refresh` — Renovar token
- `POST /api/auth/logout` — Cerrar sesion
- `GET  /api/auth/me` — Perfil actual
- `POST /api/auth/forgot-password` — Recuperar contrasena
- `POST /api/auth/reset-password` — Resetear contrasena

### Content (Public catalog)
- `GET /api/content/categories` — Categorias con cursos
- `GET /api/content/courses/:slug` — Detalle de curso
- `GET /api/content/lessons/:id` — Contenido de leccion (Premium)

### Progress (Premium)
- `POST /api/progress/complete` — Marcar leccion completada
- `GET  /api/progress/my-progress` — Progreso del usuario
- `GET  /api/progress/leaderboard` — Ranking XP

### Community
- `GET    /api/community/channels` — Lista de canales
- `GET    /api/community/channels/:slug/posts` — Posts de un canal
- `POST   /api/community/posts` — Crear post
- `DELETE /api/community/posts/:id` — Eliminar post
- `POST   /api/community/reactions` — Toggle reaccion
- `GET    /api/community/posts/:id/replies` — Respuestas

### Admin
- `GET  /api/admin/stats` — Dashboard stats
- `CRUD /api/admin/categories`
- `CRUD /api/admin/courses`
- `CRUD /api/admin/modules`
- `CRUD /api/admin/lessons`
- `CRUD /api/admin/channels`
- `GET  /api/admin/users` — Lista usuarios
- `GET  /api/admin/payments` — Lista pagos

### Webhooks
- `POST /api/webhooks/wompi` — Wompi payment confirmation
- `POST /api/webhooks/mercadopago` — MercadoPago notification
- `POST /api/webhooks/paypal` — PayPal event
- `GET  /api/webhooks/crypto` — CryptAPI callback

## Seguridad

- JWT con expiracion (access: 15min, refresh: 7d)
- bcrypt 12 rounds para contrasenas
- Rate limiting (100 req/15min general, 5/15min login)
- Zod validation en todos los endpoints
- CORS estricto
- Helmet.js headers
- Webhook signature verification
- Input sanitization (XSS prevention)

