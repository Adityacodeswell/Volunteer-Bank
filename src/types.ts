export type UserRole = 'admin' | 'staff' | 'volunteer';

export interface Profile {
  id: string; // matches auth user id
  role: UserRole;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
}

export interface StaffDetails {
  profile_id: string;
  assigned_region: string; // e.g. "Navi Mumbai" or "Lakshadweep"
  created_by_admin_id: string;
}

export type VolunteerStatus = 'active' | 'inactive' | 'pending';
export type VolunteerAvailability = 
  | 'A day or two a year' 
  | 'Several times a month' 
  | 'Three weeks or longer' 
  | 'Weekend warrior';

export interface Volunteer {
  profile_id: string;
  coordinator_id: string; // staff profile_id
  site_preference: string; // e.g. "Vashi Creek"
  interests: string[];
  availability: VolunteerAvailability;
  how_heard: string;
  status: VolunteerStatus;
  hours_logged: number;
  volunteer_code: string; // OSI-VOL-####
  created_at: string;
  emergency_contact?: string;
}

export interface Site {
  id: string;
  name: string;
  depth_label: string; // e.g. "5m", "15m", "25m", "40m"
  category: string; // e.g. "Mangroves", "Creek", "Lake", "Hills", "Dive Center"
}

export type OpportunityStatus = 'open' | 'completed' | 'cancelled';

export interface Opportunity {
  id: string;
  title: string;
  site_id: string; // Site.id
  type: string; // e.g. "Creek Cleanup", "Mangrove Planting"
  description: string;
  commitment_label: string; // e.g. "3 hours", "1 day"
  date: string;
  capacity: number;
  created_by_staff_id: string;
  status: OpportunityStatus;
}

export interface OpportunitySignup {
  opportunity_id: string;
  volunteer_id: string; // Volunteer profile_id
  signed_up_at: string;
  attended: boolean;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to_volunteer_id: string; // volunteer profile_id
  assigned_by_staff_id: string; // staff profile_id
  due_date: string;
  priority: TaskPriority;
  status: TaskStatus;
  linked_opportunity_id: string | null;
}

export interface Message {
  id: string;
  thread_id: string; // staff_volunteer_1to1
  sender_id: string;
  recipient_id: string;
  body: string;
  sent_at: string;
  read: boolean;
}

export interface ActivityLog {
  id: string;
  profile_id: string;
  action_type: string; // e.g. "VOLUNTEER_CREATED", "TASK_COMPLETED"
  description: string;
  created_at: string;
}

// Custom wrapper interfaces for views
export interface VolunteerWithProfile extends Volunteer {
  profile: Profile;
  coordinator_name?: string;
  site_name?: string;
}

export interface StaffWithProfile {
  profile: Profile;
  details: StaffDetails;
  volunteer_count: number;
}

export interface OpportunityWithSite extends Opportunity {
  site?: Site;
  signup_count: number;
  is_signed_up?: boolean;
}

export interface TaskWithDetails extends Task {
  volunteer_name?: string;
  staff_name?: string;
  opportunity_title?: string | null;
}
