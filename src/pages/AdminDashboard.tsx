import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, Users, Map, Clock, Calendar, Search, Plus, 
  Trash2, Mail, Phone, MapPin, Award, ArrowRight, ShieldCheck, 
  CheckCircle2, FileSpreadsheet, Settings, AlertTriangle, 
  Sparkles, RefreshCw, Layers, MapPinOff, UserMinus, ToggleLeft, ToggleRight, Waves, Menu, X,
  ClipboardCheck, MessageSquare, Bell, ChevronRight, Check, CheckSquare
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button, Input, Select, Badge, Card, Avatar, EmptyState, SidebarNavItem, Textarea, Modal } from "../components/UI";
import { 
  VolunteerWithProfile, 
  OpportunityWithSite, 
  Site, 
  Profile, 
  ActivityLog,
  StaffWithProfile,
  JoinRequest,
  Task,
  Message
} from "../types";
import { supabase, SUPABASE_URL, SUPABASE_PUBLIC_KEY } from "../supabaseClient";
import { createClient } from "@supabase/supabase-js";

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white border border-slate-100 rounded-xl p-5 flex flex-col gap-4 w-full">
      <div className="h-4 bg-slate-200 rounded w-1/4"></div>
      <div className="h-6 bg-slate-200 rounded w-3/4"></div>
      <div className="h-4 bg-slate-200 rounded w-5/6"></div>
      <div className="flex gap-2 mt-2">
        <div className="h-8 bg-slate-200 rounded w-1/2"></div>
      </div>
    </div>
  );
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 bg-red-50 border border-red-100 rounded-xl text-center my-4">
      <AlertTriangle className="w-10 h-10 text-coral mx-auto mb-3" />
      <h3 className="font-bold text-sm text-red-800">Connection Failed</h3>
      <p className="text-xs text-red-600 mt-1 mb-4">{message}</p>
      <Button variant="danger" onClick={onRetry} className="text-xs py-2 px-4">
        Try Reconnecting
      </Button>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<
    "overview" | "staff" | "volunteers" | "tasks" | "opportunities" | "messages" | "requests" | "settings"
  >("overview");
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  // Data states
  const [staffList, setStaffList] = useState<StaffWithProfile[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerWithProfile[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityWithSite[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<any>({
    totalVolunteers: 0,
    totalStaff: 0,
    activeOpps: 0,
    totalHours: 0,
    sitesCovered: 0,
    volunteersByCoord: {},
    recentLogs: []
  });

  // Modal controls
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [isAddOppOpen, setIsAddOppOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [createdStaffCreds, setCreatedStaffCreds] = useState<any>(null);

  // Detail Drawers
  const [selectedStaff, setSelectedStaff] = useState<StaffWithProfile | null>(null);
  const [selectedVol, setSelectedVol] = useState<VolunteerWithProfile | null>(null);

  // Destructive confirmations
  const [isDeleteSiteConfirmOpen, setIsDeleteSiteConfirmOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<string | null>(null);
  const [isDeactivateBulkConfirmOpen, setIsDeactivateBulkConfirmOpen] = useState(false);
  const [oppToDelete, setOppToDelete] = useState<string | null>(null);

  // Filter states - Master DB
  const [filterSearch, setFilterSearch] = useState("");
  const [filterCoordinator, setFilterCoordinator] = useState("all");
  const [filterSite, setFilterSite] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Reassign coordinator action state
  const [reassignVolIds, setReassignVolIds] = useState<string[]>([]);
  const [targetCoordId, setTargetCoordId] = useState("");
  const [isReassignSubmitting, setIsReassignSubmitting] = useState(false);

  // Add staff form state
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffRegion, setStaffRegion] = useState("Navi Mumbai");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffRole, setStaffRole] = useState<"admin" | "staff" | "volunteer">("staff");
  const [staffSitePref, setStaffSitePref] = useState("");
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);

  // Add site form state
  const [siteName, setSiteName] = useState("");
  const [siteDepth, setSiteDepth] = useState("5m");
  const [siteCategory, setSiteCategory] = useState("Creek");
  const [isSubmittingSite, setIsSubmittingSite] = useState(false);

  // Add Opportunity form state
  const [oppTitle, setOppTitle] = useState("");
  const [oppSiteId, setOppSiteId] = useState("");
  const [oppType, setOppType] = useState("");
  const [oppDesc, setOppDesc] = useState("");
  const [oppCommitment, setOppCommitment] = useState("");
  const [oppDate, setOppDate] = useState("");
  const [oppCapacity, setOppCapacity] = useState("");
  const [isSubmittingOpp, setIsSubmittingOpp] = useState(false);

  // Add Task form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [taskLinkedOpp, setTaskLinkedOpp] = useState("");
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Broadcast messaging state
  const [broadcastTarget, setBroadcastTarget] = useState<"all" | "staff" | "volunteers">("all");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setErrorState(null);
    try {
      // 1. Fetch profiles where role = 'staff'
      const { data: staffData, error: staffErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "staff");

      if (staffErr) throw new Error(staffErr.message);

      // 2. Fetch volunteers join profiles
      const { data: volsData, error: volsErr } = await supabase
        .from("volunteers")
        .select("*, profile:profiles!volunteers_profile_id_fkey(*), site:sites(name)")
        .order("created_at", { ascending: false });

      if (volsErr) throw new Error(volsErr.message);

      // Fetch coordinators names map
      const { data: coordProfiles, error: coordProfilesErr } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", volsData ? volsData.map(v => v?.coordinator_id).filter(Boolean) : []);

      if (coordProfilesErr) throw new Error(coordProfilesErr.message);

      const coordMap = (coordProfiles || []).reduce((acc: any, p: any) => {
        if (p && p.id) {
          acc[p.id] = p.full_name || "Pending Name";
        }
        return acc;
      }, {});

      const mappedVols: VolunteerWithProfile[] = (volsData || [])
        .filter(v => v && v.profile)
        .map(v => ({
          ...v,
          profile: v.profile,
          site_name: v.site?.name,
          site_preference: v.site?.name || "General Support",
          coordinator_name: coordMap[v.coordinator_id] || "Unassigned"
        }));

      // 3. Fetch opportunities join sites
      const { data: oppsData, error: oppsErr } = await supabase
        .from("opportunities")
        .select("*, site:sites(name)")
        .order("date");

      if (oppsErr) throw new Error(oppsErr.message);

      // Fetch signups
      const { data: allSignups, error: signupsErr } = await supabase
        .from("opportunity_signups")
        .select("opportunity_id");

      if (signupsErr) throw new Error(signupsErr.message);

      const signupCounts = (allSignups || []).reduce((acc: any, s: any) => {
        if (s && s.opportunity_id) {
          acc[s.opportunity_id] = (acc[s.opportunity_id] || 0) + 1;
        }
        return acc;
      }, {});

      const mappedOpps: OpportunityWithSite[] = (oppsData || []).map(o => ({
        ...o,
        signup_count: o?.id ? signupCounts[o.id] || 0 : 0,
        site: o.site
      }));

      // 4. Fetch sites
      const { data: sitesData, error: sitesErr } = await supabase
        .from("sites")
        .select("*")
        .order("name");

      if (sitesErr) throw new Error(sitesErr.message);

      // 5. Fetch logs
      const { data: logsData, error: logsErr } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      const mappedLogs: ActivityLog[] = logsData || [];

      // 6. Fetch Join Requests
      const { data: reqsData, error: reqsErr } = await supabase
        .from("join_requests")
        .select("*")
        .order("created_at", { ascending: false });

      let enrichedRequests: JoinRequest[] = [];
      if (!reqsErr && reqsData) {
        // fetch profiles for requests
        const senderIds = reqsData.map(r => r.from_id).filter(Boolean);
        const receiverIds = reqsData.map(r => r.to_id).filter(Boolean);
        const allProfileIds = Array.from(new Set([...senderIds, ...receiverIds]));
        
        const { data: reqProfiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", allProfileIds);

        const profileMap = (reqProfiles || []).reduce((acc: any, p: any) => {
          if (p && p.id) acc[p.id] = p;
          return acc;
        }, {});

        enrichedRequests = reqsData.map(r => ({
          ...r,
          from_profile: profileMap[r.from_id],
          to_profile: profileMap[r.to_id]
        }));
      }

      // 7. Fetch tasks
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true });

      setTasks(tasksData || []);

      const mappedStaff: StaffWithProfile[] = (staffData || [])
        .filter(s => s && s.id)
        .map(s => {
          const count = mappedVols.filter(v => v && v.coordinator_id === s.id).length;
          return {
            profile: s,
            details: {
              profile_id: s.id,
              assigned_region: s.email && s.email.includes("amit") ? "Lakshadweep" : "Navi Mumbai",
              created_by_admin_id: user?.id || ""
            },
            volunteer_count: count
          };
        });

      // Calculate totals
      const totalVols = mappedVols.length;
      const totalSt = mappedStaff.length;
      const activeOpps = mappedOpps.filter(o => o && o.status === "open").length;
      const totalHrs = mappedVols.reduce((sum, v) => sum + (v.hours_logged || 0), 0);
      const sitesCount = (sitesData || []).length;

      const volunteersByCoord: Record<string, number> = {};
      mappedStaff.forEach(s => {
        if (s && s.profile) {
          const coordName = s.profile.full_name || "Pending Name";
          volunteersByCoord[coordName] = s.volunteer_count;
        }
      });

      setVolunteers(mappedVols);
      setOpportunities(mappedOpps);
      setSites(sitesData || []);
      setActivityLogs(mappedLogs);
      setStaffList(mappedStaff);
      setJoinRequests(enrichedRequests);

      if (mappedStaff.length > 0 && mappedStaff[0]?.profile) {
        setTargetCoordId(mappedStaff[0].profile.id);
      }

      setStats({
        totalVolunteers: totalVols,
        totalStaff: totalSt,
        activeOpps,
        totalHours: totalHrs,
        sitesCovered: sitesCount,
        volunteersByCoord,
        recentLogs: mappedLogs.slice(0, 10)
      });

    } catch (err: any) {
      setErrorState(err.message || "Failed to load master admin metrics");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Add User Account (Task 6 Pattern)
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName || !staffEmail || !staffPhone || !staffPassword || !staffRole) {
      showToast("Please enter all required registration details", "error");
      return;
    }

    setIsSubmittingStaff(true);
    try {
      const tempClient = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });

      // 1. Sign up user via tempClient
      const { data: authData, error: authErr } = await tempClient.auth.signUp({
        email: staffEmail,
        password: staffPassword,
      });

      if (authErr) throw new Error(authErr.message);
      if (!authData.user) throw new Error("Could not create authentication profile");

      // 2. Create profile row using tempClient
      const { error: profileErr } = await tempClient.from("profiles").insert({
        id: authData.user.id,
        role: staffRole,
        full_name: staffName,
        email: staffEmail,
        phone: staffPhone,
        must_reset_password: false
      });

      if (profileErr) throw new Error(profileErr.message);

      // 3. Create volunteer row if registering a volunteer
      if (staffRole === "volunteer") {
        const volCode = `OSI-VOL-${String(Math.floor(1000 + Math.random() * 9000))}`;
        const { error: volErr } = await tempClient.from("volunteers").insert({
          profile_id: authData.user.id,
          coordinator_id: null,
          site_preference_id: staffSitePref || null,
          interests: [],
          availability: "Weekend warrior",
          how_heard: "Admin registered",
          status: "pending",
          hours_logged: 0,
          volunteer_code: volCode,
          emergency_contact: ""
        });

        if (volErr) throw new Error(volErr.message);
      }

      // 4. Log Action
      await supabase.from("activity_log").insert({
        profile_id: user!.id,
        action_type: "ACCOUNT_CREATED",
        description: `Admin created ${staffRole} account for ${staffName} (${staffEmail})`
      });

      // Set credentials to show to admin
      setCreatedStaffCreds({
        name: staffName,
        email: staffEmail,
        password: staffPassword,
        role: staffRole
      });

      // Reset form states
      setIsAddStaffOpen(false);
      setStaffName("");
      setStaffEmail("");
      setStaffPhone("");
      setStaffPassword("");
      setStaffRole("staff");
      setStaffSitePref("");

      showToast(`Account successfully registered for ${staffName}!`, "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to register user account", "error");
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  // Add site taxonomy
  const handleAddSiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) {
      showToast("Site name is required", "error");
      return;
    }

    setIsSubmittingSite(true);
    try {
      const { error } = await supabase.from("sites").insert({
        name: siteName.trim(),
        depth_label: siteDepth,
        category: siteCategory
      });

      if (error) throw new Error(error.message);

      await supabase.from("activity_log").insert({
        profile_id: user!.id,
        action_type: "SITE_CREATED",
        description: `Added site taxonomy: ${siteName}`
      });

      setIsAddSiteOpen(false);
      setSiteName("");
      showToast("Site taxonomy added to directory", "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to save site", "error");
    } finally {
      setIsSubmittingSite(false);
    }
  };

  // Delete Site confirm
  const handleDeleteSiteConfirm = async () => {
    if (!siteToDelete) return;
    try {
      const { error } = await supabase
        .from("sites")
        .delete()
        .eq("id", siteToDelete);

      if (error) throw new Error(error.message);

      await supabase.from("activity_log").insert({
        profile_id: user!.id,
        action_type: "SITE_DELETED",
        description: `Removed site taxonomy ID: ${siteToDelete}`
      });

      showToast("Site removed from taxonomy directory", "warning");
      setIsDeleteSiteConfirmOpen(false);
      setSiteToDelete(null);
      loadAllData();
    } catch (err: any) {
      showToast("Failed to delete site", "error");
    }
  };

  // Bulk Reassign coordinator
  const handleBulkReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reassignVolIds.length === 0 || !targetCoordId) return;

    setIsReassignSubmitting(true);
    try {
      const { error } = await supabase
        .from("volunteers")
        .update({ coordinator_id: targetCoordId })
        .in("profile_id", reassignVolIds);

      if (error) throw new Error(error.message);

      const designatedName = staffList.find(s => s?.profile?.id === targetCoordId)?.profile?.full_name || "New Coordinator";
      await supabase.from("activity_log").insert({
        profile_id: user!.id,
        action_type: "BULK_REASSIGN",
        description: `Bulk-reassigned ${reassignVolIds.length} volunteers to coordinator: ${designatedName}`
      });

      // Create notifications for volunteers
      for (const volId of reassignVolIds) {
        await supabase.from("notifications").insert({
          user_id: volId,
          type: "task_updated",
          title: "New Coordinator Assigned",
          body: `Admin assigned ${designatedName} as your new coordinator.`,
          read: false
        });
      }

      setIsReassignOpen(false);
      setReassignVolIds([]);
      showToast(`Successfully reassigned ${reassignVolIds.length} volunteers.`, "success");
      loadAllData();
    } catch (err: any) {
      showToast("Reassignment failed", "error");
    } finally {
      setIsReassignSubmitting(false);
    }
  };

  // Bulk Deactivate profiles
  const handleBulkDeactivateConfirm = async () => {
    if (reassignVolIds.length === 0) return;

    try {
      const { error } = await supabase
        .from("volunteers")
        .update({ status: "inactive" })
        .in("profile_id", reassignVolIds);

      if (error) throw new Error(error.message);

      await supabase.from("activity_log").insert({
        profile_id: user!.id,
        action_type: "BULK_DEACTIVATE",
        description: `Bulk-deactivated ${reassignVolIds.length} volunteer profiles`
      });

      setReassignVolIds([]);
      setIsDeactivateBulkConfirmOpen(false);
      showToast("Deactivated selected profiles", "warning");
      loadAllData();
    } catch (err: any) {
      showToast("Bulk deactivation failed", "error");
    }
  };

  const toggleVolSelection = (profileId: string) => {
    setReassignVolIds((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId]
    );
  };

  const handleExportCSV = () => {
    if (volunteers.length === 0) return;
    
    const headers = ["Name", "Code", "Email", "Phone", "Coordinator", "Site Preference", "Availability", "Hours", "Status"];
    const rows = volunteers.map(v => {
      const name = v?.profile?.full_name || "Unknown User";
      const email = v?.profile?.email || "";
      const phone = v?.profile?.phone || "";
      return [
        name,
        v?.volunteer_code || "",
        email,
        phone,
        v?.coordinator_name || "",
        v?.site_preference || "",
        v?.availability || "",
        (v?.hours_logged || 0).toString(),
        v?.status || ""
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `OSI_Volunteer_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Master Volunteer CSV registry exported successfully", "success");
  };

  // Add Opportunity
  const handleAddOppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oppTitle || !oppSiteId || !oppType || !oppDesc || !oppCommitment || !oppDate || !oppCapacity) {
      showToast("All fields are required", "error");
      return;
    }

    setIsSubmittingOpp(true);
    try {
      const { error } = await supabase.from("opportunities").insert({
        title: oppTitle,
        site_id: oppSiteId,
        type: oppType,
        description: oppDesc,
        commitment_label: oppCommitment,
        date: oppDate,
        capacity: parseInt(oppCapacity),
        created_by_staff_id: user!.id,
        status: "open"
      });

      if (error) throw new Error(error.message);

      await supabase.from("activity_log").insert({
        profile_id: user!.id,
        action_type: "OPPORTUNITY_CREATED",
        description: `Admin created campaign: ${oppTitle}`
      });

      setIsAddOppOpen(false);
      setOppTitle("");
      setOppSiteId("");
      setOppType("");
      setOppDesc("");
      setOppCommitment("");
      setOppDate("");
      setOppCapacity("");
      showToast("Campaign/Opportunity published successfully!", "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to create campaign", "error");
    } finally {
      setIsSubmittingOpp(false);
    }
  };

  // Add Task
  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskAssigneeId || !taskDueDate) {
      showToast("Title, Assignee and Due Date are required", "error");
      return;
    }

    setIsSubmittingTask(true);
    try {
      const { error } = await supabase.from("tasks").insert({
        title: taskTitle,
        description: taskDesc,
        assigned_to_volunteer_id: taskAssigneeId,
        assigned_by_staff_id: user!.id,
        due_date: taskDueDate,
        priority: taskPriority,
        status: "todo",
        linked_opportunity_id: taskLinkedOpp || null
      });

      if (error) throw new Error(error.message);

      // Create notification for volunteer
      await supabase.from("notifications").insert({
        user_id: taskAssigneeId,
        type: "task_assigned",
        title: "New Task Assigned",
        body: `You have been assigned: ${taskTitle}. Due by ${taskDueDate}.`,
        read: false
      });

      await supabase.from("activity_log").insert({
        profile_id: user!.id,
        action_type: "TASK_CREATED",
        description: `Admin created and assigned task: ${taskTitle}`
      });

      setIsAddTaskOpen(false);
      setTaskTitle("");
      setTaskDesc("");
      setTaskAssigneeId("");
      setTaskDueDate("");
      setTaskPriority("medium");
      setTaskLinkedOpp("");
      showToast("Task assigned successfully!", "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to create task", "error");
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // Broadcast Message
  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastBody.trim()) {
      showToast("Message body cannot be empty", "error");
      return;
    }

    setIsBroadcasting(true);
    try {
      let targets: string[] = [];
      if (broadcastTarget === "all") {
        const { data } = await supabase.from("profiles").select("id");
        targets = (data || []).map(p => p.id).filter(Boolean);
      } else if (broadcastTarget === "staff") {
        targets = staffList.map(s => s.profile?.id).filter(Boolean);
      } else if (broadcastTarget === "volunteers") {
        targets = volunteers.map(v => v.profile?.id).filter(Boolean);
      }

      for (const targetId of targets) {
        await supabase.from("notifications").insert({
          user_id: targetId,
          type: "new_message",
          title: "System Broadcast Alert",
          body: broadcastBody,
          read: false
        });
      }

      await supabase.from("activity_log").insert({
        profile_id: user!.id,
        action_type: "BROADCAST_SENT",
        description: `Admin broadcasted alert to ${broadcastTarget}`
      });

      setBroadcastBody("");
      showToast(`Broadcast sent successfully to ${targets.length} users!`, "success");
    } catch (err: any) {
      showToast("Failed to broadcast message", "error");
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Resolve Join Request
  const handleResolveRequest = async (req: JoinRequest, status: 'accepted' | 'declined') => {
    try {
      const { error } = await supabase
        .from("join_requests")
        .update({
          status,
          resolved_at: new Date().toISOString()
        })
        .eq("id", req.id);

      if (error) throw new Error(error.message);

      if (status === "accepted" && req.type === "volunteer_to_staff") {
        // Upgrade volunteer profile to staff role
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({ role: "staff" })
          .eq("id", req.from_id);

        if (profileErr) throw new Error(profileErr.message);

        // Delete their record from volunteers table to sync them as staff
        await supabase.from("volunteers").delete().eq("profile_id", req.from_id);
      }

      // Send alert notification to applicant
      await supabase.from("notifications").insert({
        user_id: req.from_id,
        type: status === "accepted" ? "request_accepted" : "request_declined",
        title: status === "accepted" ? "Coordinator Upgrade Accepted" : "Upgrade Request Declined",
        body: status === "accepted" 
          ? "Congratulations! You have been upgraded to Staff Coordinator. Please sign out and sign back in."
          : "Your coordinator upgrade request was declined. Contact an admin.",
        read: false
      });

      // Log action
      await supabase.from("activity_log").insert({
        profile_id: user!.id,
        action_type: `REQUEST_${status.toUpperCase()}`,
        description: `Admin ${status} coordinator upgrade request from ${req.from_profile?.full_name || "Unknown user"}`
      });

      showToast(`Request successfully ${status}!`, status === "accepted" ? "success" : "warning");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to resolve request", "error");
    }
  };

  // Delete Campaign
  const handleDeleteOpp = async (id: string) => {
    try {
      const { error } = await supabase.from("opportunities").delete().eq("id", id);
      if (error) throw new Error(error.message);
      showToast("Campaign removed", "warning");
      loadAllData();
    } catch (err: any) {
      showToast("Failed to delete campaign", "error");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Credentials copied!", "success");
  };

  // Filter Volunteers
  const filteredVolunteers = volunteers
    .filter((v) => v && v.profile)
    .filter((v) => {
      const fullName = v.profile?.full_name || "Unknown User";
      const email = v.profile?.email || "";
      const volunteerCode = v.volunteer_code || "";
      
      const matchesSearch = 
        fullName.toLowerCase().includes(filterSearch.toLowerCase()) ||
        volunteerCode.toLowerCase().includes(filterSearch.toLowerCase()) ||
        email.toLowerCase().includes(filterSearch.toLowerCase());
      
      const matchesCoord = filterCoordinator === "all" || v.coordinator_id === filterCoordinator;
      const matchesSite = filterSite === "all" || v.site_preference === filterSite;
      const matchesStatus = filterStatus === "all" || v.status === filterStatus;

      return matchesSearch && matchesCoord && matchesSite && matchesStatus;
    });

  const chartData = stats.volunteersByCoord ? Object.entries(stats.volunteersByCoord) : [];
  const pendingRequestsCount = joinRequests.filter(r => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Banner Control */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-6 h-14 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 hover:bg-slate-50 rounded-lg text-deep"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Waves className="w-6 h-6 text-cyan animate-pulse shrink-0" />
          <div>
            <span className="font-serif font-black text-deep text-sm tracking-tight block leading-none">OCEAN SCHOOL INDIA</span>
            <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest block leading-none mt-0.5">Admin Control Center</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-right hidden sm:flex">
            <div>
              <span className="text-xs font-bold text-deep block leading-none">{user?.full_name || "Admin"}</span>
              <span className="text-[9px] font-mono text-cyan font-bold uppercase tracking-wider block mt-1">Master Admin</span>
            </div>
          </div>
          <Button variant="ghost" onClick={logout} className="text-xs font-semibold py-2 px-4 h-9">
            Sign Out
          </Button>
        </div>
      </header>

      {/* Admin layout structure */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* MOBILE SIDEBAR OVERLAY */}
        <AnimatePresence>
          {isSidebarOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div 
                className="fixed inset-0 bg-deep/40 backdrop-blur-xs"
                onClick={() => setIsSidebarOpen(false)}
              />
              <motion.aside 
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", duration: 0.4 }}
                className="fixed left-0 top-0 bottom-0 w-64 bg-white p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <Waves className="w-6 h-6 text-cyan" />
                      <span className="font-serif font-bold text-deep text-sm">OSI Admin</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-50 rounded-full">
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">System Controls</span>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { tab: "overview", label: "Dashboard Overview", icon: <Building2 className="w-4 h-4" /> },
                      { tab: "staff", label: "Staff Management", icon: <Layers className="w-4 h-4" /> },
                      { tab: "volunteers", label: "Volunteers DB", icon: <Users className="w-4 h-4" /> },
                      { tab: "tasks", label: "Task Assignment", icon: <ClipboardCheck className="w-4 h-4" /> },
                      { tab: "opportunities", label: "Campaigns & Sites", icon: <Map className="w-4 h-4" /> },
                      { tab: "messages", label: "Message Broadcast", icon: <MessageSquare className="w-4 h-4" /> },
                      { tab: "requests", label: "Join Requests", icon: <Bell className="w-4 h-4" />, badge: pendingRequestsCount },
                      { tab: "settings", label: "System Config", icon: <Settings className="w-4 h-4" /> }
                    ].map(t => (
                      <button
                        key={t.tab}
                        onClick={() => { setActiveTab(t.tab as any); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          activeTab === t.tab ? "bg-navy text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {t.icon}
                          <span>{t.label}</span>
                        </div>
                        {t.badge ? (
                          <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{t.badge}</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 text-xs text-slate-400 leading-relaxed font-semibold">
                  Secure Admin Node
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* PERSISTENT DESKTOP LEFT SIDEBAR */}
        <aside 
          className={`hidden md:flex flex-col bg-white border-r border-slate-100 p-3 shrink-0 transition-all duration-300 h-[calc(100vh-3.5rem)] sticky top-14 ${
            isSidebarExpanded ? "w-64" : "w-16"
          }`}
          onMouseEnter={() => setIsSidebarExpanded(true)}
          onMouseLeave={() => setIsSidebarExpanded(false)}
        >
          <span className={`text-[8px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-4 block truncate ${!isSidebarExpanded && "invisible"}`}>
            Controls
          </span>
          <div className="flex flex-col gap-1.5 flex-1">
            {[
              { tab: "overview", label: "Overview", icon: <Building2 className="w-4 h-4" /> },
              { tab: "staff", label: "Staff Management", icon: <Layers className="w-4 h-4" /> },
              { tab: "volunteers", label: "Volunteers DB", icon: <Users className="w-4 h-4" /> },
              { tab: "tasks", label: "Task Assignment", icon: <ClipboardCheck className="w-4 h-4" /> },
              { tab: "opportunities", label: "Campaigns & Sites", icon: <Map className="w-4 h-4" /> },
              { tab: "messages", label: "Message Broadcast", icon: <MessageSquare className="w-4 h-4" /> },
              { tab: "requests", label: "Join Requests", icon: <Bell className="w-4 h-4" />, badge: pendingRequestsCount },
              { tab: "settings", label: "System Config", icon: <Settings className="w-4 h-4" /> }
            ].map(t => (
              <button
                key={t.tab}
                onClick={() => setActiveTab(t.tab as any)}
                className={`w-full flex items-center rounded-xl p-2.5 text-sm font-medium transition-all group relative ${
                  activeTab === t.tab 
                    ? "bg-[#1B4965] text-white shadow-sm" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-[#1B4965]"
                }`}
                title={!isSidebarExpanded ? t.label : undefined}
              >
                <span className={`shrink-0 flex items-center justify-center ${activeTab === t.tab ? "text-white" : "text-slate-400 group-hover:text-[#1B4965]"}`}>
                  {t.icon}
                </span>
                {isSidebarExpanded && (
                  <span className="ml-3 font-medium transition-opacity duration-300 truncate">{t.label}</span>
                )}
                {t.badge ? (
                  <span className={`absolute bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isSidebarExpanded ? "right-2" : "top-1 right-1 h-2 w-2 p-0 text-[0px]"
                  }`}>
                    {t.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-4 flex justify-center">
            {isSidebarExpanded ? (
              <span className="text-[10px] font-mono text-slate-400">v2.1 Master Node</span>
            ) : (
              <span className="text-[10px] font-mono text-slate-400">v2.1</span>
            )}
          </div>
        </aside>

        {/* Content body panel */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          
          {errorState ? (
            <InlineError message={errorState} onRetry={loadAllData} />
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                
                {/* --- TAB: OVERVIEW --- */}
                {activeTab === "overview" && (
                  <div className="flex flex-col gap-8">
                    {/* Stat strip card */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                      <Card title="Volunteers Pool" subtitle="Global registered" className="text-center shadow-xs">
                        <span className="font-serif font-black text-3xl text-[#1B4965]">{stats.totalVolunteers}</span>
                      </Card>
                      <Card title="Staff Coordinators" subtitle="Regional leads" className="text-center shadow-xs">
                        <span className="font-serif font-black text-3xl text-[#1B4965]">{stats.totalStaff}</span>
                      </Card>
                      <Card title="Active Campaigns" subtitle="Drives open" className="text-center shadow-xs">
                        <span className="font-serif font-black text-3xl text-[#1B4965]">{stats.activeOpps}</span>
                      </Card>
                      <Card title="Restoration Hours" subtitle="Approved logs" className="text-center shadow-xs">
                        <span className="font-serif font-black text-3xl text-[#1B4965]">{stats.totalHours}h</span>
                      </Card>
                      <Card title="Sites Covered" subtitle="Active sectors" className="text-center shadow-xs">
                        <span className="font-serif font-black text-3xl text-[#1B4965]">{stats.sitesCovered}</span>
                      </Card>
                    </div>

                    {/* Chart & Action grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Visual SVG bar chart: Volunteers by coordinator */}
                      <Card title="Volunteers by Coordinator" subtitle="Load distribution across unit leads" className="lg:col-span-2 shadow-xs">
                        {chartData.length === 0 ? (
                          <EmptyState title="No metrics compiled" description="Add coordinators to begin tracking." />
                        ) : (
                          <div className="py-6">
                            <div className="flex flex-col gap-5">
                              {chartData.map(([name, count]: any) => {
                                const maxCount = Math.max(...chartData.map(([_, c]: any) => c), 1);
                                const percentage = Math.round((count / maxCount) * 100);
                                return (
                                  <div key={name} className="flex items-center gap-4 text-xs">
                                    <span className="w-28 font-bold text-deep truncate">{name}</span>
                                    <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden flex items-center">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                        className="h-full bg-[#0096C7] flex items-center px-2 justify-end"
                                      >
                                        {percentage > 10 && <span className="text-[10px] font-bold text-white leading-none">{count}</span>}
                                      </motion.div>
                                      {percentage <= 10 && <span className="text-[10px] font-bold text-slate-700 ml-2 leading-none">{count}</span>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </Card>

                      {/* Activity Feed */}
                      <Card title="Master Activity Feed" subtitle="Real-time operations log (Read Only)" className="lg:col-span-1 shadow-xs">
                        <div className="flex flex-col gap-4 max-h-[350px] overflow-y-auto pr-1">
                          {activityLogs.length === 0 ? (
                            <EmptyState title="Logbook clear" description="System is operational." />
                          ) : (
                            activityLogs.slice(0, 10).map((log) => (
                              <div key={log.id} className="p-3 border border-slate-100 bg-slate-50 rounded-xl text-[11px] leading-relaxed relative">
                                <span className="font-bold text-deep block uppercase tracking-wider text-[9px] mb-0.5">{log.action_type}</span>
                                <p className="text-slate-600 font-sans">{log.description}</p>
                                <span className="text-[9px] text-slate-400 font-mono block mt-1">
                                  {new Date(log.created_at).toLocaleString()}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </Card>
                    </div>
                  </div>
                )}

                {/* --- TAB: STAFF MANAGEMENT --- */}
                {activeTab === "staff" && (
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h2 className="font-serif font-bold text-xl text-[#023E8A]">Staff Coordinators Registry</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Manage regional program leads and view unit statistics.</p>
                      </div>
                      <Button onClick={() => setIsAddStaffOpen(true)} className="min-h-[44px]">
                        <Plus className="w-4 h-4" /> Add Coordinator
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {staffList.map((st) => {
                        const name = st.profile?.full_name || "Pending Name";
                        const email = st.profile?.email || "";
                        const phone = st.profile?.phone || "";
                        return (
                          <div 
                            key={st.profile?.id} 
                            onClick={() => setSelectedStaff(st)}
                            className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-200 cursor-pointer flex flex-col justify-between"
                          >
                            <div className="flex gap-3">
                              <Avatar name={name} size="md" />
                              <div className="min-w-0">
                                <h3 className="font-bold text-sm text-[#023E8A] truncate">{name}</h3>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{st.details?.assigned_region || "General Support"}</p>
                              </div>
                            </div>

                            <div className="mt-4 border-t border-slate-50 pt-3 text-xs text-slate-500 flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                <span className="truncate">{email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span>{phone || "No phone added"}</span>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center text-xs">
                              <span className="text-slate-400">Assigned Unit Load:</span>
                              <Badge status="open" label={`${st.volunteer_count} volunteers`} className="bg-sky-50 text-[#0096C7] border-sky-100" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* --- TAB: VOLUNTEERS DB --- */}
                {activeTab === "volunteers" && (
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h2 className="font-serif font-bold text-xl text-[#023E8A]">Master Volunteers Database</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Review profiles, assign units, or trigger bulk state changes.</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleExportCSV} className="min-h-[44px]">
                          <FileSpreadsheet className="w-4 h-4" /> Export CSV
                        </Button>
                      </div>
                    </div>

                    {/* Filter Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                      <Input 
                        placeholder="Search name, code, email..." 
                        value={filterSearch} 
                        onChange={(e) => setFilterSearch(e.target.value)} 
                        className="py-2.5"
                      />
                      <Select 
                        value={filterCoordinator} 
                        onChange={(e) => setFilterCoordinator(e.target.value)}
                        options={[
                          { value: "all", label: "All Coordinators" },
                          ...staffList.map(st => ({ value: st.profile?.id || "", label: st.profile?.full_name || "Unknown Coordinator" }))
                        ]}
                      />
                      <Select 
                        value={filterSite} 
                        onChange={(e) => setFilterSite(e.target.value)}
                        options={[
                          { value: "all", label: "All Preferred Sites" },
                          ...sites.map(s => ({ value: s.name, label: s.name }))
                        ]}
                      />
                      <Select 
                        value={filterStatus} 
                        onChange={(e) => setFilterStatus(e.target.value)}
                        options={[
                          { value: "all", label: "All Statuses" },
                          { value: "active", label: "Active" },
                          { value: "pending", label: "Pending Approval" },
                          { value: "inactive", label: "Inactive" }
                        ]}
                      />
                    </div>

                    {/* Bulk Actions Banner */}
                    {reassignVolIds.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fadeIn">
                        <div className="text-xs text-amber-800 font-medium">
                          Checked <span className="font-bold">{reassignVolIds.length}</span> volunteers from database registry.
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => setIsReassignOpen(true)} className="py-2 px-3 text-xs min-h-[38px]">
                            Reassign Unit
                          </Button>
                          <Button variant="danger" onClick={() => setIsDeactivateBulkConfirmOpen(true)} className="py-2 px-3 text-xs min-h-[38px]">
                            Bulk Deactivate
                          </Button>
                          <Button variant="ghost" onClick={() => setReassignVolIds([])} className="py-2 px-3 text-xs text-slate-500">
                            Clear
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Table of Volunteers */}
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                              <th className="p-4 w-12 text-center">
                                <input 
                                  type="checkbox" 
                                  checked={reassignVolIds.length === filteredVolunteers.length && filteredVolunteers.length > 0} 
                                  onChange={() => {
                                    if (reassignVolIds.length === filteredVolunteers.length) {
                                      setReassignVolIds([]);
                                    } else {
                                      setReassignVolIds(filteredVolunteers.map(v => v.profile?.id).filter(Boolean));
                                    }
                                  }}
                                  className="rounded"
                                />
                              </th>
                              <th className="p-4">Volunteer</th>
                              <th className="p-4">Coordinator</th>
                              <th className="p-4">Preferred Site</th>
                              <th className="p-4">Availability</th>
                              <th className="p-4 text-center">Hours</th>
                              <th className="p-4">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredVolunteers.map((v) => {
                              const name = v.profile?.full_name || "Pending Name";
                              const email = v.profile?.email || "";
                              return (
                                <tr 
                                  key={v.profile?.id} 
                                  className="hover:bg-slate-50/50 transition cursor-pointer"
                                  onClick={() => setSelectedVol(v)}
                                >
                                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                    <input 
                                      type="checkbox" 
                                      checked={reassignVolIds.includes(v.profile?.id)} 
                                      onChange={() => toggleVolSelection(v.profile?.id)}
                                      className="rounded"
                                    />
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      <Avatar name={name} size="sm" />
                                      <div className="min-w-0">
                                        <p className="font-bold text-slate-800 truncate">{name}</p>
                                        <p className="text-[10px] text-slate-400 truncate">{email}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4 text-slate-600">{v.coordinator_name || "Unassigned"}</td>
                                  <td className="p-4 text-slate-600">{v.site_preference || "General Support"}</td>
                                  <td className="p-4 text-slate-500">{v.availability}</td>
                                  <td className="p-4 text-center font-bold text-slate-700">{v.hours_logged || 0}h</td>
                                  <td className="p-4">
                                    <Badge status={v.status as any} />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {filteredVolunteers.length === 0 && (
                        <div className="p-12 text-center text-slate-400 italic">
                          No volunteer records matched the current filter conditions.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* --- TAB: TASKS --- */}
                {activeTab === "tasks" && (
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="font-serif font-bold text-xl text-[#023E8A]">Task Assignments</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Assign specialized tasks to volunteer units.</p>
                      </div>
                      <Button onClick={() => setIsAddTaskOpen(true)} className="min-h-[44px]">
                        <Plus className="w-4 h-4" /> Create Task
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {["todo", "in_progress", "done"].map((col) => {
                        const colTasks = tasks.filter(t => t.status === col);
                        return (
                          <div key={col} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-4">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                {{ todo: "To Do", in_progress: "In Progress", done: "Completed" }[col]}
                              </span>
                              <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {colTasks.length}
                              </span>
                            </div>

                            <div className="flex flex-col gap-3 overflow-y-auto max-h-[500px]">
                              {colTasks.map(task => {
                                const assignee = volunteers.find(v => v.profile?.id === task.assigned_to_volunteer_id);
                                return (
                                  <div key={task.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs flex flex-col gap-3">
                                    <div className="flex justify-between items-start gap-2">
                                      <h4 className="font-serif font-bold text-sm text-[#1B4965]">{task.title}</h4>
                                      <Badge status={task.priority} />
                                    </div>
                                    <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-2">{task.description}</p>
                                    <div className="flex justify-between items-center text-[10px] border-t border-slate-50 pt-2.5">
                                      <span className="text-slate-400">Due: {task.due_date}</span>
                                      {assignee && (
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                          <Avatar name={assignee.profile?.full_name || "User"} size="sm" className="h-5 w-5 text-[8px]" />
                                          <span className="truncate max-w-[80px] font-medium">{assignee.profile?.full_name}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              {colTasks.length === 0 && (
                                <div className="p-8 text-center text-slate-400 italic text-[11px]">No tasks in this stage</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* --- TAB: OPPORTUNITIES & SITES --- */}
                {activeTab === "opportunities" && (
                  <div className="flex flex-col gap-8">
                    
                    {/* Opportunities Section */}
                    <div className="flex flex-col gap-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h2 className="font-serif font-bold text-xl text-[#023E8A]">Active Campaigns</h2>
                          <p className="text-xs text-slate-400 mt-0.5">Manage coastal restoration drives, plastic baselines, and dive workshops.</p>
                        </div>
                        <Button onClick={() => setIsAddOppOpen(true)} className="min-h-[44px]">
                          <Plus className="w-4 h-4" /> Create Campaign
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {opportunities.map((opp) => (
                          <div key={opp.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-[10px] uppercase font-bold text-cyan tracking-wider">{opp.type}</span>
                                <Badge status={opp.status} />
                              </div>
                              <h3 className="font-serif font-bold text-base text-[#1B4965] mt-1.5 leading-snug">{opp.title}</h3>
                              <p className="text-slate-500 text-xs mt-2 leading-relaxed line-clamp-3">{opp.description}</p>
                            </div>

                            <div className="mt-5 border-t border-slate-50 pt-4 flex flex-col gap-2">
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                <span className="truncate">{opp.site?.name || "Multiple Sectors"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{opp.date}</span>
                              </div>
                              <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50 text-xs">
                                <span className="text-slate-400">Attendance Load:</span>
                                <span className="font-bold text-[#0096C7]">{opp.signup_count} / {opp.capacity} registered</span>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-50 flex justify-end gap-2">
                              <Button 
                                variant="danger" 
                                onClick={() => handleDeleteOpp(opp.id)}
                                className="py-2 px-3 text-xs min-h-[38px]"
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sites Taxonomy Section */}
                    <div className="flex flex-col gap-6 border-t border-slate-200/50 pt-8">
                      <div className="flex justify-between items-center">
                        <div>
                          <h2 className="font-serif font-bold text-xl text-[#023E8A]">Sector Site Taxonomy Directory</h2>
                          <p className="text-xs text-slate-400 mt-0.5">Configure geographic zones, calibrating depth level concepts (0m-40m).</p>
                        </div>
                        <Button onClick={() => setIsAddSiteOpen(true)} className="min-h-[44px]">
                          <Plus className="w-4 h-4" /> Add Coastal Site
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {sites.map((st) => (
                          <div key={st.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs flex justify-between items-center">
                            <div>
                              <p className="font-bold text-sm text-[#1B4965] truncate">{st.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{st.category} &bull; {st.depth_label}</p>
                            </div>
                            <button 
                              onClick={() => { setSiteToDelete(st.id); setIsDeleteSiteConfirmOpen(true); }}
                              className="text-slate-400 hover:text-coral p-1.5 hover:bg-slate-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- TAB: MESSAGES / BROADCAST --- */}
                {activeTab === "messages" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Broadcast card */}
                    <Card title="System Broadcast Alert" subtitle="Dispatch urgent notifications directly to specific user sets." className="lg:col-span-1 shadow-xs">
                      <form onSubmit={handleBroadcastSubmit} className="flex flex-col gap-4">
                        <Select
                          label="Target Audience"
                          value={broadcastTarget}
                          onChange={(e) => setBroadcastTarget(e.target.value as any)}
                          options={[
                            { value: "all", label: "All Users" },
                            { value: "staff", label: "Coordinators Set Only" },
                            { value: "volunteers", label: "Volunteers Pool Only" }
                          ]}
                        />

                        <Textarea
                          label="Message Body *"
                          placeholder="Type system alert description..."
                          value={broadcastBody}
                          onChange={(e) => setBroadcastBody(e.target.value)}
                          rows={4}
                          required
                        />

                        <Button type="submit" disabled={isBroadcasting} className="w-full min-h-[44px]">
                          {isBroadcasting ? "Sending Broadcast..." : "Dispatch Alert Broadcast"}
                        </Button>
                      </form>
                    </Card>

                    {/* Inbox View */}
                    <Card title="Administrative Monitoring Threads" subtitle="Review active coordinator-to-volunteer messaging channels." className="lg:col-span-2 shadow-xs">
                      <div className="p-8 text-center text-slate-400 italic text-xs">
                        Admin secure node: 1-to-1 active thread monitoring is available on your local coordinator terminal. Use broadcast panel for urgent alerts.
                      </div>
                    </Card>
                  </div>
                )}

                {/* --- TAB: REQUESTS --- */}
                {activeTab === "requests" && (
                  <div className="flex flex-col gap-6">
                    <div>
                      <h2 className="font-serif font-bold text-xl text-[#023E8A]">Join & Upgrade Role Requests</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Audit requested coordinator promotions and volunteer upgrades.</p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                      <div className="divide-y divide-slate-100">
                        {joinRequests.map((req) => (
                          <div key={req.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex gap-3">
                              <Avatar name={req.from_profile?.full_name || "Applicant"} size="md" />
                              <div>
                                <h3 className="font-bold text-sm text-[#1B4965]">{req.from_profile?.full_name || "Pending Name"}</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">{req.from_profile?.email || ""}</p>
                                <p className="text-[11px] text-slate-500 mt-2 font-mono bg-slate-50 rounded-lg p-2.5 max-w-lg border border-slate-100">
                                  {req.message || "No application message attached."}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 flex flex-col sm:items-end gap-3">
                              <Badge status={req.status as any} />
                              <span className="text-[10px] text-slate-400 font-mono">
                                Registered: {new Date(req.created_at).toLocaleDateString()}
                              </span>
                              {req.status === "pending" && (
                                <div className="flex gap-2 mt-1">
                                  <button 
                                    onClick={() => handleResolveRequest(req, 'accepted')}
                                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-xl cursor-pointer transition"
                                  >
                                    Approve Role
                                  </button>
                                  <button 
                                    onClick={() => handleResolveRequest(req, 'declined')}
                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl cursor-pointer transition"
                                  >
                                    Decline
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {joinRequests.length === 0 && (
                          <div className="p-12 text-center text-slate-400 italic">
                            No active upgrade or join request records currently exist in database.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- TAB: SETTINGS --- */}
                {activeTab === "settings" && (
                  <div className="max-w-2xl">
                    <Card title="System Node Configuration" subtitle="Configure platform settings and check directory sync states." className="shadow-xs">
                      <div className="flex flex-col gap-6 text-xs text-slate-600">
                        <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <p className="font-bold text-deep text-sm">Real-time DB Connection Status</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">WebSocket channel status for local live listeners.</p>
                          </div>
                          <Badge status="active" label="SYNCED" className="bg-emerald-50 text-emerald-700" />
                        </div>

                        <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <p className="font-bold text-deep text-sm">Calibration Level Threshold</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Volunteer portal vertical vertical descent gradient concept.</p>
                          </div>
                          <span className="font-mono font-bold text-[#1B4965] bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded text-[11px]">40m Limit</span>
                        </div>

                        <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <p className="font-bold text-deep text-sm">Auto-Generated Codes Prefix</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Format prefix for new registered volunteer accounts.</p>
                          </div>
                          <span className="font-mono font-bold text-slate-700">OSI-VOL-####</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* --- DETAIL DRAWER: STAFF MEMBER --- */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-deep/40 backdrop-blur-xs" onClick={() => setSelectedStaff(null)} />
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto z-10"
          >
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Coordinator profile</span>
                <button onClick={() => setSelectedStaff(null)} className="p-1.5 hover:bg-slate-50 rounded-full text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-4 items-center">
                <Avatar name={selectedStaff.profile?.full_name || "Coordinator"} size="lg" />
                <div>
                  <h3 className="font-serif font-black text-xl text-[#1B4965]">{selectedStaff.profile?.full_name || "Pending Name"}</h3>
                  <p className="text-xs text-cyan font-bold tracking-wider uppercase mt-1">{selectedStaff.details?.assigned_region}</p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-5 text-xs text-slate-600 border-t border-slate-50 pt-5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Secure Profile ID:</span>
                  <span className="font-mono">{selectedStaff.profile?.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Email Address:</span>
                  <span className="font-bold">{selectedStaff.profile?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone Contact:</span>
                  <span>{selectedStaff.profile?.phone || "No phone added"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Units Load:</span>
                  <span className="font-bold text-[#0096C7]">{selectedStaff.volunteer_count} active volunteers</span>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-50 pt-4 flex gap-2">
              <Button variant="ghost" onClick={() => setSelectedStaff(null)} className="w-full min-h-[44px]">
                Close Drawer
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- DETAIL DRAWER: VOLUNTEER PROFILE --- */}
      {selectedVol && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-deep/40 backdrop-blur-xs" onClick={() => setSelectedVol(null)} />
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto z-10"
          >
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Volunteer Registry Profile</span>
                <button onClick={() => setSelectedVol(null)} className="p-1.5 hover:bg-slate-50 rounded-full text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-4 items-center">
                <Avatar name={selectedVol.profile?.full_name || "Volunteer"} size="lg" />
                <div>
                  <h3 className="font-serif font-black text-xl text-[#1B4965]">{selectedVol.profile?.full_name || "Pending Name"}</h3>
                  <p className="text-xs text-[#0096C7] font-bold tracking-wider mt-1">{selectedVol.volunteer_code}</p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-5 text-xs text-slate-600 border-t border-slate-50 pt-5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Email Address:</span>
                  <span className="font-bold">{selectedVol.profile?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone Contact:</span>
                  <span>{selectedVol.profile?.phone || "No phone added"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Coordinator:</span>
                  <span className="font-bold text-[#023E8A]">{selectedVol.coordinator_name || "Unassigned"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Site Preference:</span>
                  <span>{selectedVol.site_preference || "General Support"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Availability Sector:</span>
                  <span>{selectedVol.availability}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Logged Contribution Hours:</span>
                  <span className="font-bold text-emerald-600">{selectedVol.hours_logged || 0}h logged</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Emergency Contact:</span>
                  <span>{selectedVol.emergency_contact || "None"}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-50 pt-4 flex gap-2">
              <Button variant="ghost" onClick={() => setSelectedVol(null)} className="w-full min-h-[44px]">
                Close Profile
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- MODAL: CREATE ACCOUNT (STAFF / COORDINATOR) --- */}
      <Modal isOpen={isAddStaffOpen} onClose={() => setIsAddStaffOpen(false)} title="Register Coordinator / Volunteer Account">
        <form onSubmit={handleAddStaffSubmit} className="flex flex-col gap-4">
          <Input
            label="Full Name *"
            placeholder="E.g. Amit Patil..."
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            className="py-3"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address *"
              placeholder="E.g. amit.patil@ocean.edu..."
              type="email"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              className="py-3"
              required
            />

            <Input
              label="Phone Contact *"
              placeholder="E.g. +91 98765 43210..."
              value={staffPhone}
              onChange={(e) => setStaffPhone(e.target.value)}
              className="py-3"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Set Registration Password *"
              placeholder="Password..."
              type="password"
              value={staffPassword}
              onChange={(e) => setStaffPassword(e.target.value)}
              className="py-3"
              required
            />

            <Select
              label="Account Role *"
              value={staffRole}
              onChange={(e) => setStaffRole(e.target.value as any)}
              options={[
                { value: "admin", label: "Admin" },
                { value: "staff", label: "Staff Coordinator" },
                { value: "volunteer", label: "Volunteer" }
              ]}
            />
          </div>

          {staffRole === "staff" && (
            <Select
              label="Assigned Operations Region *"
              value={staffRegion}
              onChange={(e) => setStaffRegion(e.target.value)}
              options={[
                { value: "Navi Mumbai", label: "Navi Mumbai Estuary Office" },
                { value: "Lakshadweep", label: "Lakshadweep Islands Base" }
              ]}
            />
          )}

          {staffRole === "volunteer" && (
            <Select
              label="Preferred Coastal Sector Site"
              value={staffSitePref}
              onChange={(e) => setStaffSitePref(e.target.value)}
              options={[
                { value: "", label: "No Preference (General Support)" },
                ...sites.map(s => ({ value: s.id, label: s.name }))
              ]}
            />
          )}

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsAddStaffOpen(false)} className="py-3 px-4 min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingStaff} className="py-3 px-4 min-h-[44px]">
              {isSubmittingStaff ? "Registering..." : "Register Account"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: SHOW CREATED CREDENTIALS --- */}
      {createdStaffCreds && (
        <Modal isOpen={!!createdStaffCreds} onClose={() => setCreatedStaffCreds(null)} title="Account Created Successfully">
          <div className="flex flex-col gap-4 text-xs">
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-800 border border-emerald-200">
              Account created! Please record the temporary login credentials below.
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col gap-3 font-mono">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-400">Role:</span>
                <span className="font-bold text-[#023E8A] uppercase">{createdStaffCreds.role}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-400">Email:</span>
                <span className="font-bold select-all">{createdStaffCreds.email}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-400">Password:</span>
                <span className="font-bold text-coral select-all">{createdStaffCreds.password}</span>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="secondary" onClick={() => copyToClipboard(createdStaffCreds.password)} className="py-3 px-4 min-h-[44px]">Copy Password</Button>
              <Button onClick={() => setCreatedStaffCreds(null)} className="py-3 px-4 min-h-[44px]">Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* --- MODAL: ADD SITE TAXONOMY --- */}
      <Modal isOpen={isAddSiteOpen} onClose={() => setIsAddSiteOpen(false)} title="Add Site Sector Taxonomy">
        <form onSubmit={handleAddSiteSubmit} className="flex flex-col gap-4">
          <Input
            label="Sector Name *"
            placeholder="E.g. Nerul Mangrove Buffer..."
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="py-3"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Calibration Depth Level"
              value={siteDepth}
              onChange={(e) => setSiteDepth(e.target.value)}
              options={[
                { value: "5m", label: "5m Depth Gauge" },
                { value: "15m", label: "15m Depth Gauge" },
                { value: "25m", label: "25m Depth Gauge" },
                { value: "40m", label: "40m Depth Gauge" }
              ]}
            />

            <Select
              label="Ecosystem Category"
              value={siteCategory}
              onChange={(e) => setSiteCategory(e.target.value)}
              options={[
                { value: "Creek", label: "Creek" },
                { value: "Mangroves", label: "Mangroves" },
                { value: "Lake", label: "Lake" },
                { value: "Hills", label: "Hills" },
                { value: "Dive Center", label: "Dive Center" }
              ]}
            />
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsAddSiteOpen(false)} className="py-3 px-4 min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingSite} className="py-3 px-4 min-h-[44px]">
              {isSubmittingSite ? "Adding Site..." : "Publish Sector"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: CREATE CAMPAIGN/OPPORTUNITY --- */}
      <Modal isOpen={isAddOppOpen} onClose={() => setIsAddOppOpen(false)} title="Create New Restoration Campaign">
        <form onSubmit={handleAddOppSubmit} className="flex flex-col gap-4 text-xs">
          <Input
            label="Campaign/Opportunity Title *"
            placeholder="E.g. Vashi Creek Plastic Baseline Survey..."
            value={oppTitle}
            onChange={(e) => setOppTitle(e.target.value)}
            className="py-3"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Select Location Site *"
              value={oppSiteId}
              onChange={(e) => setOppSiteId(e.target.value)}
              options={[
                { value: "", label: "Select sector site..." },
                ...sites.map(s => ({ value: s.id, label: s.name }))
              ]}
            />

            <Input
              label="Campaign Type (Activity) *"
              placeholder="E.g. Clean-up, Seedling, Dive Survey..."
              value={oppType}
              onChange={(e) => setOppType(e.target.value)}
              className="py-3"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Commitment Label *"
              placeholder="E.g. 3 hours, 1 day..."
              value={oppCommitment}
              onChange={(e) => setOppCommitment(e.target.value)}
              className="py-3"
              required
            />

            <Input
              label="Scheduled Date *"
              type="date"
              value={oppDate}
              onChange={(e) => setOppDate(e.target.value)}
              className="py-3"
              required
            />

            <Input
              label="Attendance Capacity *"
              type="number"
              placeholder="E.g. 50..."
              value={oppCapacity}
              onChange={(e) => setOppCapacity(e.target.value)}
              className="py-3"
              required
            />
          </div>

          <Textarea
            label="Detailed Description *"
            placeholder="Type comprehensive campaign description details..."
            value={oppDesc}
            onChange={(e) => setOppDesc(e.target.value)}
            rows={4}
            required
          />

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsAddOppOpen(false)} className="py-3 px-4 min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingOpp} className="py-3 px-4 min-h-[44px]">
              {isSubmittingOpp ? "Publishing..." : "Publish Campaign"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: CREATE AND ASSIGN TASK --- */}
      <Modal isOpen={isAddTaskOpen} onClose={() => setIsAddTaskOpen(false)} title="Assign New Specialized Task">
        <form onSubmit={handleAddTaskSubmit} className="flex flex-col gap-4 text-xs">
          <Input
            label="Task Title *"
            placeholder="E.g. Calibrate creek water depth gauge..."
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            className="py-3"
            required
          />

          <Select
            label="Assign to Volunteer Profile *"
            value={taskAssigneeId}
            onChange={(e) => setTaskAssigneeId(e.target.value)}
            options={[
              { value: "", label: "Select assigned volunteer..." },
              ...volunteers.map(v => ({ value: v.profile?.id || "", label: `${v.profile?.full_name} (${v.volunteer_code})` }))
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Due Date *"
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
              className="py-3"
              required
            />

            <Select
              label="Priority Level *"
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value as any)}
              options={[
                { value: "low", label: "Low Priority" },
                { value: "medium", label: "Medium Priority" },
                { value: "high", label: "Urgent Priority" }
              ]}
            />

            <Select
              label="Linked Campaign Drive"
              value={taskLinkedOpp}
              onChange={(e) => setTaskLinkedOpp(e.target.value)}
              options={[
                { value: "", label: "No linked campaign" },
                ...opportunities.map(o => ({ value: o.id, label: o.title }))
              ]}
            />
          </div>

          <Textarea
            label="Task Description"
            placeholder="Provide task execution guidelines..."
            value={taskDesc}
            onChange={(e) => setTaskDesc(e.target.value)}
            rows={3}
          />

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsAddTaskOpen(false)} className="py-3 px-4 min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingTask} className="py-3 px-4 min-h-[44px]">
              {isSubmittingTask ? "Assigning..." : "Assign Task"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: REASSIGN VOLUNTEERS --- */}
      <Modal isOpen={isReassignOpen} onClose={() => setIsReassignOpen(false)} title="Reassign Coordinator Unit">
        <form onSubmit={handleBulkReassignSubmit} className="flex flex-col gap-4">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex gap-2 text-amber-800 text-xs">
            <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <span>This will reassign {reassignVolIds.length} checked volunteers to the designated coordinator immediately.</span>
          </div>

          <Select
            label="Designate Coordinator Staff *"
            value={targetCoordId}
            onChange={(e) => setTargetCoordId(e.target.value)}
            options={staffList
              .filter(st => st && st.profile)
              .map(st => ({
                value: st.profile?.id || "",
                label: st.profile?.full_name || "Unknown User"
              }))}
          />

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsReassignOpen(false)} className="py-3 px-4 min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isReassignSubmitting} className="py-3 px-4 min-h-[44px]">
              {isReassignSubmitting ? "Reassigning..." : "Complete Reassignment"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- CONFIRM BULK DEACTIVATE MODAL --- */}
      <Modal isOpen={isDeactivateBulkConfirmOpen} onClose={() => setIsDeactivateBulkConfirmOpen(false)} title="Confirm Bulk Deactivation">
        <div className="flex flex-col gap-4 text-xs text-slate-600">
          <p className="font-semibold text-deep text-sm">Are you absolutely sure you want to deactivate {reassignVolIds.length} selected profiles?</p>
          <p>These volunteers will immediately lose credentials, mobile Depth Gauge clearance, and dashboard access. This action cannot be undone automatically.</p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsDeactivateBulkConfirmOpen(false)} className="py-3 px-4 min-h-[44px]">Cancel</Button>
            <Button variant="danger" onClick={handleBulkDeactivateConfirm} className="py-3 px-4 min-h-[44px]">Deactivate All Selected</Button>
          </div>
        </div>
      </Modal>

      {/* --- CONFIRM DELETE SITE TAXONOMY --- */}
      <Modal isOpen={isDeleteSiteConfirmOpen} onClose={() => setIsDeleteSiteConfirmOpen(false)} title="Confirm Site Deletion">
        <div className="flex flex-col gap-4 text-xs text-slate-600">
          <p className="font-semibold text-deep text-sm">Are you sure you want to remove this site sector taxonomy?</p>
          <p>This will erase the site registration from the active registry directory. Volunteers who selected this site as preferred may need to manually update their location settings.</p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsDeleteSiteConfirmOpen(false)} className="py-3 px-4 min-h-[44px]">Cancel</Button>
            <Button variant="danger" onClick={handleDeleteSiteConfirm} className="py-3 px-4 min-h-[44px]">Delete Taxonomy</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
