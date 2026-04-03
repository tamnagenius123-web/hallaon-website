# HALLAON Workspace - Audit Implementation Plan (2026-04-02)

Based on the comprehensive audit report, this plan addresses the most impactful improvements that can be implemented within the current codebase constraints.

## Scope & Approach

The audit identifies issues across security (P0), UI/UX (P1), backend architecture (P1-P2), and feature gaps (P2-P3). Since the security overhaul (Supabase Auth, RLS, server-side writes) requires DB schema changes that can't be deployed from code alone, this implementation focuses on **frontend improvements** that deliver immediate user-facing value while maintaining Vercel deployment compatibility.

---

## Implementation Phases

### Phase 1: Mobile-First Responsive Redesign (P0/P1)
**Problem**: Desktop-centric layout with hardcoded widths (sidebar 240px, docs sidebar 255px, gantt minWidth 1000, calendar height 640).
**Changes**:
- Add `BottomNav.tsx` mobile navigation component (5 tabs: Today, Tasks, Meetings, Docs, More)
- Make `AuthView.tsx` responsive (single-column on mobile)
- Add responsive breakpoints to `Sidebar.tsx` (hidden on mobile)
- Fix hardcoded dimensions throughout components
- Add mobile-specific CSS utilities to `index.css`

### Phase 2: "Today" Home Screen (P1)
**Problem**: HomeView shows static guide/org chart instead of actionable content.
**Changes**:
- Redesign `HomeView.tsx` as an operational hub showing:
  - My tasks due today/this week
  - Upcoming meetings/agendas
  - Recent documents
  - Quick action buttons
- Keep org chart and feature guide accessible via expandable sections

### Phase 3: Discord Notification Fixes (P1)
**Problem**: `tasks.is_sent` not updated after Discord send; no notification history.
**Changes**:
- Update `TasksView.tsx` to set `is_sent=true` after successful Discord send
- Add sent indicator badges to task cards
- Format improvements for Discord messages

### Phase 4: Information Hierarchy & Card Design (P1)
**Problem**: Flat information density; no clear action priority on dashboard.
**Changes**:
- Toss-style metric cards with larger primary numbers
- Improved card hover states and CTA placement
- Better status badge color consistency

### Phase 5: Optimistic UI Rollback (P2)
**Problem**: Failed DB operations leave stale optimistic state.
**Changes**:
- Add rollback logic to task/agenda CRUD operations
- Improved toast notifications with undo capability

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/AuthView.tsx` | Responsive single-column mobile layout |
| `src/components/Sidebar.tsx` | Hidden on mobile, hamburger toggle |
| `src/components/BottomNav.tsx` | **NEW** - Mobile bottom tab navigation |
| `src/components/HomeView.tsx` | Redesigned as "Today" operational hub |
| `src/components/Header.tsx` | Mobile-friendly header |
| `src/components/DashboardView.tsx` | Responsive grid, improved cards |
| `src/components/TasksView.tsx` | is_sent fix, responsive layout |
| `src/components/AgendasView.tsx` | Responsive layout |
| `src/App.tsx` | Mobile layout integration |
| `src/index.css` | Mobile utilities, responsive helpers |

---

## Out of Scope (Requires DB/Infrastructure Changes)
- Supabase Auth migration (needs DB schema change)
- RLS policies (needs Supabase dashboard)
- Server-side write migration (architectural change)
- Activity/audit log tables (needs DB schema)
- Feature-first directory restructure (breaking change)
