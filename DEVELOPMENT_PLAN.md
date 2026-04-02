# HALLAON Workspace v4.0 - Development Plan

## Overview
Based on the Architecture Report and Features Guide, this document outlines the concrete improvements to be implemented.

---

## Phase 1: Architecture Optimization (Critical)

### 1.1 Delta Update for Realtime Subscriptions
- **Problem**: Every realtime event triggers `fetchData(false)` which re-fetches ALL tables
- **Solution**: Process `payload.new` / `payload.old` directly in state, only updating the affected record
- **Files**: `src/App.tsx`

### 1.2 Vercel API Consolidation
- **Problem**: `server.ts` (Express) and `api/` (Vercel Serverless) duplicate backend logic
- **Solution**: Add `api/discord.ts` serverless function for Discord webhooks, keep `server.ts` for local dev only
- **Files**: `api/discord.ts` (new), `api/drive.ts` (security hardening)

---

## Phase 2: New Features

### 2.1 Workload Analysis & Assignee Recommendation
- **UserWorkload interface** in `types.ts`
- **`getWorkloadStats()` utility** in `src/lib/utils.ts`
- **Dashboard card**: "Most Available Member" widget
- **TasksView**: Recommendation badges in assignee field

### 2.2 Comment System (Notion-style)
- **CommentSection component**: Reusable for Tasks, Agendas, Docs
- **Real-time subscriptions**: Live comment updates via Supabase channels
- **Optimistic UI**: Instant comment display before server confirmation
- **Note**: Requires `comments` table in Supabase (SQL provided in guide)

### 2.3 Command Palette (Ctrl+K)
- **Global search**: Search across Tasks, Agendas, Meetings
- **Quick navigation**: Jump to any page instantly
- **Keyboard-first**: Full keyboard navigation support

---

## Phase 3: UI/UX Polish

### 3.1 Skeleton UI Loading States
- Replace spinner with skeleton placeholders
- Cards, tables, and charts get skeleton variants

### 3.2 Enhanced Toast & Rollback
- Centralized toast notification system
- Optimistic mutation rollback on failure

---

## Implementation Order
1. Delta Update (Architecture fix)
2. Vercel API Consolidation
3. Workload Analysis System
4. Comment System
5. Command Palette
6. Skeleton UI
7. Toast improvements

---

## Tech Stack Additions
- No new major dependencies (using existing Supabase, React, Tailwind)
- Command Palette built with native React (no cmdk dependency needed)
