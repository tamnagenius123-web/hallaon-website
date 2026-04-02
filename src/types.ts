export interface User {
  id: string;
  email: string;
  name: string;
  password?: string;
  role: 'edit' | 'view';
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  assignee: string;
  team: string;
  status: string;
  start_date: string;
  end_date: string;
  wbs_code: string;
  predecessor?: string;
  opt_time: number;
  prob_time: number;
  pess_time: number;
  exp_time: number;
  is_sent: boolean;
  // PERT/CPM calculated fields (not in DB, but used in UI)
  es?: number;
  ef?: number;
  ls?: number;
  lf?: number;
  slack?: number;
  is_critical?: boolean;
}

export interface Agenda {
  id: string;
  title: string;
  proposer: string;
  team: string;
  status: string;
  proposed_date: string;
  is_sent: boolean;
}

export interface Meeting {
  id: string;
  category: string;
  date: string;
  title: string;
  author_id: string;
  content: any; // JSON or Markdown
  related_task_id?: string;
  related_agenda_id?: string;
}

export interface Decision {
  id: string;
  agenda_id: string;
  criteria: any; // JSON
  alternatives: any; // JSON
  best_choice?: string;
  created_at: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink: string;
  size?: string;
  modifiedTime?: string;
}

export interface PresenceUser {
  user_id: string;
  email: string;
  online_at: string;
}

// Workload Analysis
export interface UserWorkload {
  userId: string;
  userName: string;
  taskCount: number;
  completedCount: number;
  blockedCount: number;
  score: number; // Lower = more available
}

// Comment System
export interface Comment {
  id: string;
  content: string;
  user_id: string;
  user_name: string;
  target_type: 'task' | 'agenda' | 'doc';
  target_id: string;
  created_at: string;
  updated_at?: string;
}
