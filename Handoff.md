# Handoff — Autenticación y cuentas (cuarta sesión)

Sesión: 2026-06-21 · Rama: `main` · Supabase auth + persistencia cloud

---

## 🎯 Goal

Implementar autenticación real con Supabase + persistencia cloud de proyectos.

### Items implementados (8/8)

1. ✅ **Login con GitHub** — `supabase.auth.signInWithOAuth({ provider: "github" })` cuando `VITE_SUPABASE_URL` está configurado. Fallback a localStorage OAuth sin Supabase.
2. ✅ **Login con GitLab** — Mismo mecanismo, provider `"gitlab"`.
3. ✅ **Login con email + magic link** — `supabase.auth.signInWithOtp({ email })`.
4. ✅ **Perfil de usuario** — Avatar URL, nombre, bio, GitHub/GitLab username, preferencias (tema, idioma, fontSize). Editado en `/settings`.
5. ✅ **Persistencia cloud** — `cloudProjects.ts` CRUD contra tabla `projects` en Supabase. `listCloudProjects`, `saveCloudProject`, `loadCloudProject`, `deleteCloudProject`.
6. ✅ **Sesión persistente** — Supabase `autoRefreshToken: true`, `persistSession: true`. En localStorage fallback, se restaura de `simlog.auth`.
7. ✅ **Cerrar sesión** — `signOut()` en menu de usuario (Header).
8. ✅ **Eliminación de cuenta** — Con exportación de datos (GDPR) en `/settings` (incluye cloud projects).

## ✅ Verificación

```bash
npx tsc --noEmit     # limpio (0 errors)
npx vitest run        # 91/91 tests OK (sin regresiones)
npm run build         # build exitoso, PWA 9 entries (753 KiB)
```

## ✏️ Archivos nuevos/modificados

### Nuevos

| Archivo | Propósito |
|---------|-----------|
| `src/lib/supabase.ts` | Cliente Supabase singleton (null si no configurado) |
| `src/services/cloudProjects.ts` | CRUD cloud de proyectos contra Supabase |

### Modificados

| Archivo | Cambios |
|---------|---------|
| `src/services/auth.ts` | `createAuthService()` usa Supabase cuando `isSupabaseConfigured()`; `handleSupabaseCallback()` para OAuth callback; `handleOAuthCallback()` mantiene fallback localStorage |
| `src/pages/Auth/Callback.tsx` | Primero intenta `handleSupabaseCallback()`, luego fallback localStorage |
| `src/pages/Settings/index.tsx` | Avatar URL, GitHub/GitLab username, export incluye cloud projects, `useEffect` para sincronizar con user.id |
| `src/pages/Settings/Settings.css` | `.settings-avatar-row`, `.settings-link-row`, `.settings-avatar-preview`, `.settings-link` |
| `src/projects.ts` | `ProjectMeta.cloud?: boolean` |

## 📐 Arquitectura

**Dual-mode auth**: El sistema funciona en dos modos:

1. **Supabase** (cuando `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` están seteados):
   - OAuth: `supabase.auth.signInWithOAuth()` → redirect → callback detecta session
   - Magic link: `supabase.auth.signInWithOtp()`
   - Sesión: Supabase maneja JWT + refresh token automáticamente
   - Perfil: sync contra tabla `profiles`
   - Proyectos: tabla `projects` (user_id, name, data JSON)

2. **LocalStorage** (sin Supabase, demo/default):
   - OAuth: redirect a GitHub/GitLab OAuth → callback genera perfil local
   - Sesión: `simlog.auth` en localStorage
   - Proyectos: `simlog.proj.<name>` en localStorage

**Auth service contract** (`AuthService` interface) se mantiene idéntica. `AuthContext.tsx` no cambió.

## ⚠️ Notas

- **Supabase es opcional**: si no hay env vars, todo funciona como antes (localStorage).
- **Tablas requeridas en Supabase**: `projects` (user_id, name, data, desc, tags, ver, updated_at) y `profiles` (id, name, avatar, bio, github_username, gitlab_username).
- **Magic link**: requiere SMTP configurado en Supabase (por defecto usa el built-in).
- **deleteAccount**: llama `supabase.rpc("delete_user")` que requiere una función SQL personalizada en Supabase o se puede hacer manualmente.
- **Sin cambios en tests** (91/91 pasan).
- **Sin cambios en AuthContext/Header/Landing**: consumen la misma `AuthService` interface.
