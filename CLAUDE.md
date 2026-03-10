# CLAUDE.md — NeuralBox Campus IA
> Este archivo es la memoria completa del proyecto. Léelo SIEMPRE antes de hacer cualquier cambio.

---

## 🔑 ACCESOS Y CONEXIONES

### Servidor (Hetzner)
- **Host:** ubuntu-2gb-ash-1
- **IP:** 178.156.253.62
- **SSH:** `ssh -i ~/.ssh/id_ed25519 root@178.156.253.62`
- **OS:** Ubuntu 24.04 LTS
- **Plan:** CX22 (2 vCPU, 4GB RAM)

### GitHub
- **Org:** https://github.com/neuralbox-campus
- **Repo:** https://github.com/neuralbox-campus/neuralbox-campus
- **Branch principal:** main

### URLs en producción
- **Campus:** https://campus.neuralboxai.com
- **API:** https://campus.neuralboxai.com/api/
- **Health check:** https://campus.neuralboxai.com/api/health
- **Landing preventa:** https://preventa.neuralboxai.com
- **Página post-compra:** https://preventa.neuralboxai.com/gracias?t=nb2026pago

### Admin (ÚNICO administrador)
- **Email:** admin@neuralboxai.com
- **Password:** NeuralBox2026!
- **Rol:** ADMIN (Cuántico)
- **IMPORTANTE:** Solo existe UN admin. Nadie más tiene ni debe tener acceso admin.

### Base de datos
- **Motor:** PostgreSQL (local en servidor)
- **User:** neuralbox
- **DB:** neuralbox_campus
- **Prisma:** v7.4 con @prisma/adapter-pg

### Google Sheets (leads + pagos)
- **Apps Script URL:** https://script.google.com/macros/s/AKfycbyqOHFKxyP3sJORMx6JCdu2j7XDcCCKUnb81ZWG6Zs_nJ7RMs0HsXVFhdsNd3Mo6y6N/exec
- **Hoja 1:** Leads de landing (interesados)
- **Hoja PAGOS CONFIRMADOS:** Post-compra

### Meta Pixel (Facebook Ads)
- **ID:** 911356671680070

### Redes sociales
- **Instagram:** https://www.instagram.com/neuralbox.ai
- **Telegram:** https://t.me/neuralboxai

---

## 💳 PASARELAS DE PAGO — LINKS COMPLETOS

### Wompi (Colombia — PRINCIPAL)
| Plan | Link | Precio COP |
|------|------|------------|
| Preventa | https://checkout.wompi.co/l/D2Hkd6 | $75.000 |
| Mensual | ⚠️ PENDIENTE — crear en comercios.wompi.co > Links de pago | $89.900 |
| Semestral | ⚠️ PENDIENTE — crear en comercios.wompi.co > Links de pago | $399.900 |
| Anual | ⚠️ PENDIENTE — crear en comercios.wompi.co > Links de pago | $649.900 |

**Cómo crear links de suscripción en Wompi:**
1. Ir a https://comercios.wompi.co → Iniciar sesión
2. Menú izquierdo → "Links de pago" → "Crear link de pago"
3. Para cada plan crear:
   - **Nombre:** NeuralBox Campus - [Plan]
   - **Monto:** [precio en COP]
   - **Uso único:** No
   - **URL de redirección:** https://preventa.neuralboxai.com/gracias?t=nb2026pago
4. Copiar el link generado y actualizar esta tabla

### MercadoPago (LATAM)
| Plan | Link |
|------|------|
| Preventa | https://mpago.li/1XrLim9 |
| Mensual | https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=00103bdecd0b44ac9cef63c36b9c7a89 |
| Semestral | https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=fd070b764f844349875930b6abefcdda |
| Anual | https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=98ebf0852b6d4de1a898e0b5c66f3f68 |

### PayPal (Internacional)
| Plan | Link |
|------|------|
| Preventa | https://www.paypal.com/ncp/payment/S4YSFRKWVHGLW |
| Mensual | ⚠️ PENDIENTE |
| Semestral | ⚠️ PENDIENTE |
| Anual | ⚠️ PENDIENTE |

### Pricing
| Plan | USD | COP | Duración |
|------|-----|-----|----------|
| Preventa | $18 | $75.000 | 2 meses (2do mes gratis) |
| Mensual | $21 | $89.900 | 1 mes |
| Semestral | $95 | $399.900 | 6 meses (ahorra 26%) |
| Anual | $155 | $649.900 | 12 meses (ahorra 40%) |

---

## 🏗 ARQUITECTURA

### Stack
- **Backend:** Node.js + Fastify 5 + Prisma 7.4 + PostgreSQL
- **Frontend:** React 18 + Vite 5 + React Router 6
- **Proxy:** Nginx (SSL) → /api/ → localhost:3001
- **Process manager:** PM2 (nombre: neuralbox-api)

### Estructura en servidor
```
/var/www/neuralbox-campus/
├── backend/
│   ├── src/
│   │   ├── index.js              # Fastify entry, registra todas las rutas
│   │   ├── routes/
│   │   │   ├── auth.js           # /api/auth/*
│   │   │   ├── admin.js          # /api/admin/* (requireAdmin hook)
│   │   │   ├── content.js        # /api/content/* (catálogo público + lecciones premium)
│   │   │   ├── community.js      # /api/community/* (canales, posts, reacciones)
│   │   │   ├── progress.js       # /api/progress/* (completar, XP, leaderboard)
│   │   │   └── webhooks.js       # /api/webhooks/* (Wompi, MP, PayPal, Crypto)
│   │   ├── middleware/
│   │   │   └── auth.js           # authenticate, requireAdmin, requireSubscription, optionalAuth
│   │   └── utils/
│   │       └── prisma.js         # PrismaClient singleton con adapter-pg
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── main.jsx              # Entry con BrowserRouter + AuthProvider
│   │   ├── App.jsx               # Router con rutas protegidas por rol
│   │   ├── context/AuthContext.jsx # Estado global auth, roles, login/logout
│   │   ├── hooks/useApi.js       # useApi (GET), useMutation (POST/PUT/DELETE)
│   │   ├── utils/api.js          # HTTP client con JWT auto-refresh
│   │   ├── components/
│   │   │   ├── Layout.jsx        # Sidebar + TopBar + hamburger mobile
│   │   │   ├── Modal.jsx         # Modal reutilizable
│   │   │   └── PostsChannel.jsx  # Publisher rico (texto/prompt/media/link)
│   │   ├── pages/                # 15 páginas
│   │   └── styles/global.css     # Todo el CSS (brand NeuralBox)
│   ├── vite.config.js            # Proxy /api → localhost:3001
│   └── dist/                     # Build producción (Nginx sirve esto)
├── prisma/
│   ├── schema.prisma             # 15 tablas
│   └── seed.js                   # Datos iniciales + admin user
└── README.md
```

---

## 👑 SISTEMA DE ROLES — CRÍTICO

Este es un sistema tipo **Hotmart + Discord**. Los roles determinan TODO el acceso.

### ADMIN (Cuántico 🔥) — Solo 1 persona
**El admin es el dueño del negocio. Debe poder gestionar TODO desde el panel sin tocar código.**

Acceso completo:
- **Dashboard:** KPIs en tiempo real (usuarios, ingresos, MRR, suscripciones, crecimiento)
- **Leads:** Ver, crear, editar, eliminar leads de preventa
- **Usuarios:** Lista completa, buscar, activar/desactivar cuentas, ver suscripciones
- **Contenido:** CRUD completo de Categorías → Cursos → Módulos → Lecciones (tipo, video URL, contenido, XP, duración)
- **Canales:** CRUD de canales de comunidad, moderar posts, pin/delete
- **Pagos:** Historial completo, ver quién pagó qué, cuándo, por qué gateway
- **Códigos:** Generar códigos de preventa/descuento, asignar, rastrear uso
- **Anuncios:** Publicar posts oficiales en canales (con prompts copiables, media, links)

**REGLA:** Toda funcionalidad admin debe funcionar desde la UI. El admin NO debe necesitar SSH ni terminal para operaciones del día a día.

### STUDENT con suscripción activa (Sinapsis ⚡)
- **Campus:** Acceso a todos los módulos y lecciones
- **Comunidad:** Todos los canales, crear posts, reaccionar
- **Leaderboard:** Competir por XP
- **Perfil:** Avatar, nombre, estadísticas
- **FreeBox:** Acceso
- **NO tiene:** Dashboard, gestión de usuarios, contenido, pagos

### STUDENT sin suscripción (Sin Conexión 🪦)
- **FreeBox:** Solo canal freebox
- **Pricing:** Ve los planes para suscribirse
- **NO tiene:** Campus, lecciones, comunidad premium, leaderboard

### GUEST (Invitado sin cuenta)
- **FreeBox:** Solo lectura
- **Pricing:** Ve los planes
- **NO tiene:** Nada más

---

## 🎮 SISTEMA DE XP Y GAMIFICACIÓN

### Fuentes de XP
| Acción | XP | Límite |
|--------|-----|--------|
| Completar lección | lesson.xp o 50 | Sin límite |
| Completar módulo | 200 | Sin límite |
| Completar curso | 500 | Sin límite |
| Quiz perfecto (100%) | +100 bonus | Sin límite |
| Crear post | 10 | 5/día |
| Recibir reacción | 5 | 20/día |
| Streak diario | 25 | 1/día |
| Streak 7 días | 100 | 1/semana |
| Streak 30 días | 500 | 1/mes |

### Niveles
- Nivel = floor(XP / 1000) + 1
- Cada 1000 XP sube un nivel

### Badges (8 predefinidas)
Primer Paso, Explorador IA, En Llamas, Imparable, Voz de la Comunidad, Leyenda, Early Adopter, Suscriptor OG

### Leaderboard
- Períodos: Semanal, Mensual, All-Time
- Basado en XP de XpLog (no XP total del user para weekly/monthly)

---

## 🚨 PROBLEMA ACTUAL CRÍTICO — FRONTEND ↔ BACKEND DESALINEADOS

El frontend hace fetch a rutas que el backend NO tiene. Esto causa 404 en toda la app.

### Desalineaciones exactas

| Frontend pide | Backend tiene | Estado | Solución |
|---|---|---|---|
| `GET /api/admin/leads` | ❌ NO EXISTE | 404 | Crear ruta en admin.js (Lead model no existe en schema → crear o usar tabla separada) |
| `GET /api/admin/codes` | ❌ NO EXISTE | 404 | Crear ruta en admin.js (Code model no existe en schema → crear) |
| `GET /api/content/courses` | ❌ No como GET /courses | 404 | Backend tiene `GET /api/admin/courses` y `GET /api/content/courses/:slug` pero NO `GET /api/content/courses` (sin slug) |
| `GET /api/community/categories` | ❌ NO EXISTE | 404 | Backend tiene `/api/community/channels` no categorías. Frontend debe usar /channels |
| `GET /api/community/channels/:slug/posts` | ✅ EXISTE | OK | — |
| `GET /api/admin/stats` | ✅ EXISTE | OK | — |
| `GET /api/admin/users` | ✅ EXISTE | OK | Responde `{users, total, page}` no array directo |
| `GET /api/admin/payments` | ✅ EXISTE | OK | Responde `{payments, total, page}` no array directo |
| `GET /api/progress/leaderboard` | ✅ EXISTE | OK | — |
| `POST /api/progress/complete` | ✅ EXISTE | OK | — |
| `GET /api/content/lessons/:id` | ✅ EXISTE | OK | Requiere suscripción activa |
| `POST /api/auth/login` | ✅ EXISTE | OK | Rate limited: 5/15min |
| `GET /api/auth/me` | ✅ EXISTE | OK | — |

### Frontend pages y qué endpoint necesitan
| Página | Endpoints que usa | Estado |
|--------|-------------------|--------|
| DashboardPage | `/admin/stats`, `/admin/payments?limit=3`, `/admin/users?limit=3` | ⚠️ Parcial (stats OK, pero frontend espera formato diferente) |
| LeadsPage | `/admin/leads` | ❌ Ruta no existe |
| UsersPage | `/admin/users` | ⚠️ Backend devuelve `{data:{users,total}}` frontend espera array |
| ContentPage | `/content/courses` | ❌ Ruta no existe como listado |
| ChannelsPage | `/community/categories` | ❌ Debería ser `/community/channels` o `/admin/channels` |
| PaymentsPage | `/admin/payments` | ⚠️ Formato de respuesta |
| CodesPage | `/admin/codes` | ❌ Ruta no existe |
| AnnouncementsPage | `/community/channels/anuncios/posts` | ✅ Debería funcionar |
| FreeboxPage | `/community/channels/freebox/posts` | ✅ Debería funcionar |
| CampusPage | `/content/courses` | ❌ Necesita listado de cursos con módulos |
| ModulePage | `/content/modules/:id/lessons` | ❌ Esta ruta está en admin, no en content |
| LessonPage | `/content/lessons/:id` | ✅ Pero requiere suscripción |
| LeaderboardPage | `/progress/leaderboard` | ✅ |
| ProfilePage | `PUT /auth/me` | ❌ Ruta PUT /me no existe, solo GET |
| PricingPage | Ninguno (estático) | ✅ |

---

## 🔒 SEGURIDAD — NO VIOLAR NUNCA

1. **NUNCA exponer passwords, JWT secrets, o API keys en frontend o logs**
2. **NUNCA ejecutar DROP, TRUNCATE, o DELETE masivo sin confirmación explícita**
3. **NUNCA desactivar rate limiting, CORS, o helmet**
4. **NUNCA dar acceso admin a otro rol**
5. **NUNCA aceptar input sin validación Zod**
6. **NUNCA almacenar passwords en texto plano** (siempre bcrypt 12 rounds)
7. **NUNCA servir contenido premium sin verificar suscripción**
8. **Siempre sanitizar HTML en posts** (escapeHtml)
9. **Siempre verificar webhook signatures** (Wompi HMAC)
10. **JWT refresh tokens rotativos** — cada uso genera nuevo par

### Seguridad ya implementada
- Helmet (CSP, HSTS, X-Frame, nosniff)
- Rate limiting global (100/15min) + login (5/15min) + posts (2/1min)
- CORS restringido a campus.neuralboxai.com
- bcrypt 12 rounds
- Zod validation en todas las rutas
- XSS escaping en community posts
- SSL/TLS (Let's Encrypt, auto-renovación)

---

## 🎨 BRAND

- **Fonts:** Syncopate (display/títulos), Share Tech Mono (monospace), Rajdhani (body)
- **Color principal:** #a6c6d9 (brand blue)
- **Logo:** NEURAL (blanco #ffffff) BOX (brand #a6c6d9)
- **Estética:** Dark glassmorphism, sci-fi minimal
- **Accent green:** #44d4a0 (éxito, XP, suscripción activa)
- **Accent orange:** #f0a030 (warnings, pendiente)
- **Accent red:** #ff5c6c (errores, danger)

---

## 🛠 COMANDOS DEL SERVIDOR

```bash
# Conectar
ssh -i ~/.ssh/id_ed25519 root@178.156.253.62

# Backend
pm2 restart neuralbox-api          # Reiniciar API
pm2 logs neuralbox-api --lines 30  # Ver logs
pm2 status                         # Ver estado

# Actualizar código
cd /var/www/neuralbox-campus
git pull
cd backend && npm install
cd ../frontend && npm install && npm run build
pm2 restart neuralbox-api

# Prisma
cd /var/www/neuralbox-campus
npx prisma generate                # Regenerar client
npx prisma db push                 # Aplicar cambios de schema
npx prisma studio                  # UI visual de la DB (puerto 5555)

# Nginx
nginx -t                           # Verificar config
systemctl reload nginx             # Aplicar cambios

# Verificar que todo funciona
curl http://localhost:3001/api/health
```

---

## 📋 PRIORIDADES PARA CLAUDE CODE (en orden)

### 1. URGENTE — Arreglar desalineación frontend↔backend
- Actualizar CADA página del frontend para que use las rutas EXACTAS del backend
- O crear las rutas faltantes en el backend (leads, codes, content/courses listado)
- Verificar formato de respuesta: backend devuelve `{success, data:{...}}`, frontend debe extraer `data`

### 2. Admin Panel completo y funcional
- El admin debe poder gestionar TODO desde la UI sin tocar código
- Dashboard con KPIs reales
- CRUD de contenido completo (categorías → cursos → módulos → lecciones)
- Gestión de usuarios (listar, buscar, activar/desactivar, ver suscripciones)
- Historial de pagos
- Gestión de canales de comunidad
- Si leads y codes no existen en el schema de Prisma, CREARLOS

### 3. Flujo de pago end-to-end
- Usuario paga → webhook confirma → suscripción se activa → acceso a campus
- Verificar que webhooks de Wompi, MP, PayPal funcionen
- El admin debe ver los pagos en su dashboard

### 4. Campus (Sinapsis)
- Listar cursos/módulos con progreso
- Ver lecciones (video placeholder + contenido)
- Completar lecciones → ganar XP
- Leaderboard funcional
- Perfil editable

### 5. Comunidad
- Canales visibles según rol/suscripción
- Crear posts, reaccionar, eliminar
- FreeBox abierto para todos
- Canales premium solo para Sinapsis

### 6. Responsive y mobile
- Todo debe funcionar en móvil
- Hamburger menu en sidebar
- Tablas con scroll horizontal
- Inputs y botones touch-friendly

### 7. NUNCA hacer
- No romper la seguridad existente
- No exponer secrets en el frontend
- No hacer cambios destructivos en la DB sin confirmar
- No desactivar rate limiting
- No dar acceso admin a otros roles
- No dejar error pages que muestren stack traces en producción
