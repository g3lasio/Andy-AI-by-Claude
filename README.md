
# AndyAI - Asistente Fiscal Inteligente

Este proyecto está construido con [Next.js](https://nextjs.org) y utiliza tecnologías modernas para proporcionar un asistente fiscal inteligente.

## Características Principales

- 🤖 Asistente IA con Claude-3 para consultas fiscales
- 💬 Chat interactivo con interfaz profesional
- 📊 Dashboard moderno y responsive
- 🔒 Autenticación segura con Firebase
- 📋 Gestión inteligente de documentos fiscales
- 🧠 Sistema de memoria para contexto conversacional

## Estructura del Proyecto

```
src/
├── app/                    # Componentes y páginas Next.js
├── core-hub/              # Núcleo de la aplicación
│   ├── ai/               # Servicios de IA
│   ├── chat/            # Sistema de chat
│   ├── documents/       # Gestión de documentos
│   └── memory/         # Sistema de memoria
├── modules/              # Módulos específicos
│   └── taxAdvisor/     # Módulo de asesoría fiscal
└── shared/              # Utilidades compartidas
```

## Tecnologías Utilizadas

- Next.js 14
- TypeScript
- TailwindCSS
- Firebase
- Claude-3 API
- Jest/Vitest para testing

## Comenzar

1. Clona el repositorio
2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno en `.env.local`

4. Inicia el servidor de desarrollo:
```bash
npm run dev
```

Abre [http://0.0.0.0:3000](http://0.0.0.0:3000) en tu navegador para ver la aplicación.

## Testing

```bash
npm run test        # Ejecuta tests con Jest
npm run test:watch  # Modo watch
npm run validate    # Ejecuta validaciones completas
```

## Últimas Actualizaciones

- ✨ Nueva interfaz de usuario más profesional y futurista
- 🎨 Implementación de dashboard moderno
- 🔄 Mejora en el sistema de memoria contextual
- 🚀 Optimización de rendimiento
- 🛠️ Mejoras en la arquitectura modular

## Próximas Características

- [ ] Integración con más servicios fiscales
- [ ] Mejoras en el análisis predictivo
- [ ] Expansión del sistema de documentación
- [ ] Nuevas funcionalidades en el dashboard

## Contribución

Las contribuciones son bienvenidas. Por favor, asegúrate de ejecutar las validaciones antes de enviar un PR:

```bash
npm run validate
```
